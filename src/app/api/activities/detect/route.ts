import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface MetricsRow {
  date: string;
  tiktok_spend_gbp: number | null;
  parent_spend_gbp: number | null;
  teen_spend_gbp: number | null;
  us_trials: number | null;
  gb_trials: number | null;
  parent_trials: number | null;
  teen_trials: number | null;
  monthly_trials: number | null;
  annual_full_trials: number | null;
  annual_discount_trials: number | null;
}

interface DetectedActivity {
  client_id: string;
  date: string;
  category: string;
  title: string;
  description: string | null;
  auto_detected: boolean;
  source: string;
  created_by: string | null;
}

// POST /api/activities/detect — wipe old auto-detected activities and re-derive from current data
export async function POST() {
  const supabase = createServerClient();

  // Wipe all previously auto-detected activities — makes every run idempotent
  const { error: wipeError } = await supabase
    .from("activities")
    .delete()
    .eq("client_id", "luna")
    .eq("auto_detected", true);

  if (wipeError) {
    return NextResponse.json({ error: wipeError.message }, { status: 500 });
  }

  // Fetch all metrics ordered by date ascending
  const { data: metrics, error: metricsError } = await supabase
    .from("metrics")
    .select(
      "date, tiktok_spend_gbp, parent_spend_gbp, teen_spend_gbp, us_trials, gb_trials, parent_trials, teen_trials, monthly_trials, annual_full_trials, annual_discount_trials"
    )
    .eq("client_id", "luna")
    .order("date", { ascending: true });

  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 });
  }

  if (!metrics || metrics.length < 8) {
    return NextResponse.json({ detected: 0, inserted: 0, message: "Not enough data to detect actions (need 8+ days)" });
  }

  const rows = metrics as MetricsRow[];
  const detected: DetectedActivity[] = [];

  // ── helpers ──────────────────────────────────────────────────────────────

  const v = (row: MetricsRow, field: keyof MetricsRow): number =>
    (row[field] as number | null) ?? 0;

  function firstAppearance(
    i: number,
    field: keyof MetricsRow,
    threshold = 0
  ): boolean {
    if (i < 7) return false;
    const today = v(rows[i], field);
    if (today <= threshold) return false;
    for (let j = i - 7; j < i; j++) {
      if (v(rows[j], field) > threshold) return false;
    }
    return true;
  }

  function sustainedPause(
    i: number,
    field: keyof MetricsRow,
    threshold = 0
  ): boolean {
    // days[i-2], [i-1], [i] all zero — and [i-3] was active
    if (i < 3) return false;
    if (v(rows[i], field) > threshold) return false;
    if (v(rows[i - 1], field) > threshold) return false;
    if (v(rows[i - 2], field) > threshold) return false;
    return v(rows[i - 3], field) > threshold;
  }

  function sustainedRestart(
    i: number,
    field: keyof MetricsRow,
    threshold = 0
  ): boolean {
    if (i < 3) return false;
    if (v(rows[i], field) <= threshold) return false;
    return (
      v(rows[i - 1], field) <= threshold &&
      v(rows[i - 2], field) <= threshold &&
      v(rows[i - 3], field) <= threshold
    );
  }

  // ── budget level change (non-overlapping 7-day windows) ──────────────────
  // Run at week boundaries: index 7, 14, 21, 28 …
  function checkBudgetChange(i: number, field: keyof MetricsRow, label: string): void {
    if (i < 7 || (i % 7) !== 0) return;
    const prev7: number[] = rows.slice(i - 7, i).map((r) => v(r, field));
    const curr7: number[] = rows.slice(i, i + 7).map((r) => v(r, field));
    if (curr7.length < 7) return;
    const prevAvg = prev7.reduce((a, b) => a + b, 0) / 7;
    const currAvg = curr7.reduce((a, b) => a + b, 0) / 7;
    if (prevAvg < 5 || currAvg < 5) return; // both windows need >£5/day avg
    const ratio = currAvg / prevAvg;
    if (ratio > 1.40) {
      detected.push(
        makeActivity(
          rows[i].date,
          "campaign",
          `Increased ${label} budget (~${ratio.toFixed(1)}x increase)`,
          `7-day avg: £${prevAvg.toFixed(0)}/day → £${currAvg.toFixed(0)}/day`
        )
      );
    } else if (ratio < 0.60) {
      detected.push(
        makeActivity(
          rows[i].date,
          "campaign",
          `Reduced ${label} budget (~${(1 / ratio).toFixed(1)}x reduction)`,
          `7-day avg: £${prevAvg.toFixed(0)}/day → £${currAvg.toFixed(0)}/day`
        )
      );
    }
  }

  // ── main scan ─────────────────────────────────────────────────────────────

  for (let i = 0; i < rows.length; i++) {
    const date = rows[i].date;

    // ── TikTok overall ────────────────────────────────────────────────────

    // All ads restarted (3+ zeros → non-zero)
    if (sustainedRestart(i, "tiktok_spend_gbp")) {
      // only fire restart if NOT a first-appearance (i.e. was previously active before the gap)
      let everActive = false;
      for (let j = 0; j < i - 3; j++) {
        if (v(rows[j], "tiktok_spend_gbp") > 0) { everActive = true; break; }
      }
      if (everActive) {
        detected.push(makeActivity(date, "campaign", "Restarted TikTok advertising", null));
      }
    }

    // All ads paused (3 consecutive zeros after active)
    if (sustainedPause(i, "tiktok_spend_gbp")) {
      detected.push(makeActivity(rows[i - 2].date, "campaign", "Paused all TikTok advertising", null));
    }

    // Budget level changes for total TikTok spend
    checkBudgetChange(i, "tiktok_spend_gbp", "TikTok");

    // ── Parent campaigns ──────────────────────────────────────────────────

    if (firstAppearance(i, "parent_spend_gbp")) {
      detected.push(makeActivity(date, "campaign", "Started running Parent TikTok campaigns", null));
    }
    if (sustainedPause(i, "parent_spend_gbp")) {
      detected.push(makeActivity(rows[i - 2].date, "campaign", "Paused Parent TikTok campaigns", null));
    }
    checkBudgetChange(i, "parent_spend_gbp", "Parent campaign");

    // ── Teen campaigns ────────────────────────────────────────────────────

    if (firstAppearance(i, "teen_spend_gbp")) {
      detected.push(makeActivity(date, "campaign", "Started running Teen TikTok campaigns", null));
    }
    if (sustainedPause(i, "teen_spend_gbp")) {
      detected.push(makeActivity(rows[i - 2].date, "campaign", "Paused Teen TikTok campaigns", null));
    }
    checkBudgetChange(i, "teen_spend_gbp", "Teen campaign");

    // ── Market / audience targeting ───────────────────────────────────────

    if (firstAppearance(i, "us_trials")) {
      detected.push(makeActivity(date, "campaign", "Started targeting US audience", null));
    }
    if (sustainedPause(i, "us_trials")) {
      detected.push(makeActivity(rows[i - 2].date, "campaign", "Paused US market targeting", null));
    }

    if (firstAppearance(i, "gb_trials")) {
      detected.push(makeActivity(date, "campaign", "Started targeting UK audience", null));
    }
    if (sustainedPause(i, "gb_trials")) {
      detected.push(makeActivity(rows[i - 2].date, "campaign", "Paused UK market targeting", null));
    }

    if (firstAppearance(i, "parent_trials")) {
      detected.push(makeActivity(date, "campaign", "Started targeting Parent audience", null));
    }
    if (firstAppearance(i, "teen_trials")) {
      detected.push(makeActivity(date, "campaign", "Started targeting Teen audience", null));
    }

    // ── Paywall / plan changes ────────────────────────────────────────────

    if (firstAppearance(i, "annual_discount_trials")) {
      detected.push(makeActivity(date, "paywall", "Launched discounted annual plan", null));
    }
    if (sustainedPause(i, "annual_discount_trials")) {
      detected.push(makeActivity(rows[i - 2].date, "paywall", "Removed discounted annual plan", null));
    }

    if (firstAppearance(i, "monthly_trials")) {
      detected.push(makeActivity(date, "paywall", "Enabled monthly subscription plan", null));
    }

    if (firstAppearance(i, "annual_full_trials")) {
      detected.push(makeActivity(date, "paywall", "Enabled full-price annual plan", null));
    }
  }

  // Insert all detected activities
  let insertedCount = 0;
  if (detected.length > 0) {
    const { error: insertError } = await supabase
      .from("activities")
      .insert(detected);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    insertedCount = detected.length;
  }

  return NextResponse.json({
    detected: detected.length,
    inserted: insertedCount,
    message:
      insertedCount > 0
        ? `Wiped old entries and added ${insertedCount} action-based activities`
        : "No actions detected in current data",
  });
}

function makeActivity(
  date: string,
  category: string,
  title: string,
  description: string | null
): DetectedActivity {
  return {
    client_id: "luna",
    date,
    category,
    title,
    description,
    auto_detected: true,
    source: "metrics_scan",
    created_by: null,
  };
}

import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface MetricsRow {
  date: string;
  tiktok_spend_gbp: number;
  tiktok_installs: number;
  total_trials: number;
  onboarding_trials: number;
  non_onboarding_trials: number;
  new_subscriptions: number;
  churn: number;
  total_revenue_gbp: number;
  us_trials: number;
  gb_trials: number;
  us_revenue_gbp: number;
  gb_revenue_gbp: number;
  monthly_trials: number;
  annual_full_trials: number;
  annual_discount_trials: number;
  cost_per_install_gbp: number | null;
  install_to_trial_cr: number | null;
  ab_test_significance: number | null;
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

// POST /api/activities/detect — scan metrics and auto-generate timeline activities
export async function POST() {
  const supabase = createServerClient();

  // Fetch all metrics ordered by date ascending
  const { data: metrics, error: metricsError } = await supabase
    .from("metrics")
    .select("*")
    .eq("client_id", "luna")
    .order("date", { ascending: true });

  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 });
  }

  if (!metrics || metrics.length < 2) {
    return NextResponse.json({ detected: 0, message: "Not enough data to detect changes" });
  }

  // Fetch existing auto-detected activities to avoid duplicates
  const { data: existingActivities } = await supabase
    .from("activities")
    .select("date, title")
    .eq("client_id", "luna")
    .eq("auto_detected", true);

  const existingKeys = new Set(
    (existingActivities ?? []).map((a: { date: string; title: string }) => `${a.date}::${a.title}`)
  );

  const detected: DetectedActivity[] = [];

  for (let i = 1; i < metrics.length; i++) {
    const prev = metrics[i - 1] as MetricsRow;
    const curr = metrics[i] as MetricsRow;
    const date = curr.date;

    // --- CAMPAIGN DETECTION ---

    // Spend started (was 0 or null, now > 0)
    if ((prev.tiktok_spend_gbp ?? 0) === 0 && (curr.tiktok_spend_gbp ?? 0) > 0) {
      detected.push(makeActivity(date, "campaign", "TikTok ad spend started", `£${num(curr.tiktok_spend_gbp)} spent, ${curr.tiktok_installs} installs`));
    }

    // Spend stopped (was > 0, now 0)
    if ((prev.tiktok_spend_gbp ?? 0) > 0 && (curr.tiktok_spend_gbp ?? 0) === 0) {
      detected.push(makeActivity(date, "campaign", "TikTok ad spend paused", `Previous day: £${num(prev.tiktok_spend_gbp)}`));
    }

    // Big spend change (>80% increase or >50% decrease, both days > £5)
    const prevSpend = prev.tiktok_spend_gbp ?? 0;
    const currSpend = curr.tiktok_spend_gbp ?? 0;
    if (prevSpend > 5 && currSpend > 5) {
      const spendChange = ((currSpend - prevSpend) / prevSpend) * 100;
      if (spendChange > 80) {
        detected.push(makeActivity(date, "campaign", `Ad spend surged +${Math.round(spendChange)}%`, `£${num(prevSpend)} → £${num(currSpend)}`));
      } else if (spendChange < -50) {
        detected.push(makeActivity(date, "campaign", `Ad spend dropped ${Math.round(spendChange)}%`, `£${num(prevSpend)} → £${num(currSpend)}`));
      }
    }

    // Install volume spike (>2x, both > 10)
    if (prev.tiktok_installs > 10 && curr.tiktok_installs > prev.tiktok_installs * 2) {
      detected.push(makeActivity(date, "campaign", `Install spike: ${curr.tiktok_installs} installs (${Math.round((curr.tiktok_installs / prev.tiktok_installs - 1) * 100)}% increase)`, null));
    }

    // --- MARKET DETECTION ---

    // First US trials
    if ((prev.us_trials ?? 0) === 0 && (curr.us_trials ?? 0) > 0) {
      detected.push(makeActivity(date, "growth", `First US trials: ${curr.us_trials}`, "US market generating conversions"));
    }

    // First US revenue
    if ((prev.us_revenue_gbp ?? 0) === 0 && (curr.us_revenue_gbp ?? 0) > 0) {
      detected.push(makeActivity(date, "growth", `First US revenue: £${num(curr.us_revenue_gbp)}`, null));
    }

    // --- CONVERSION DETECTION ---

    // Trial spike (>2x, both days > 2)
    if (prev.total_trials > 2 && curr.total_trials > 2 && curr.total_trials > prev.total_trials * 2) {
      detected.push(makeActivity(date, "growth", `Trial spike: ${curr.total_trials} trials (was ${prev.total_trials})`, null));
    }

    // Non-onboarding trials appeared or spiked
    if ((prev.non_onboarding_trials ?? 0) === 0 && (curr.non_onboarding_trials ?? 0) >= 2) {
      detected.push(makeActivity(date, "growth", `In-app conversions: ${curr.non_onboarding_trials} non-onboarding trials`, "Users converting from in-app paywalls, not just onboarding"));
    }

    // Conversion rate significant change (>1 ppt, both days have installs > 20)
    const prevCR = prev.install_to_trial_cr ?? 0;
    const currCR = curr.install_to_trial_cr ?? 0;
    if (prev.tiktok_installs > 20 && curr.tiktok_installs > 20) {
      const crDiff = currCR - prevCR;
      if (crDiff > 1) {
        detected.push(makeActivity(date, "growth", `Conversion rate up: ${num(prevCR)}% → ${num(currCR)}%`, `+${num(crDiff)} percentage points`));
      } else if (crDiff < -1) {
        detected.push(makeActivity(date, "growth", `Conversion rate down: ${num(prevCR)}% → ${num(currCR)}%`, `${num(crDiff)} percentage points`));
      }
    }

    // --- SUBSCRIPTION DETECTION ---

    // First subscriber
    if ((prev.new_subscriptions ?? 0) === 0 && (curr.new_subscriptions ?? 0) > 0) {
      detected.push(makeActivity(date, "growth", `New subscribers: ${curr.new_subscriptions}`, null));
    }

    // Churn spike (> 2 and > 2x previous)
    if ((prev.churn ?? 0) > 0 && (curr.churn ?? 0) > 2 && curr.churn > prev.churn * 2) {
      detected.push(makeActivity(date, "growth", `Churn spike: ${curr.churn} (was ${prev.churn})`, null));
    }

    // --- REVENUE DETECTION ---

    // Revenue spike (>2x, both > £5)
    const prevRev = prev.total_revenue_gbp ?? 0;
    const currRev = curr.total_revenue_gbp ?? 0;
    if (prevRev > 5 && currRev > prevRev * 2) {
      detected.push(makeActivity(date, "growth", `Revenue spike: £${num(currRev)} (was £${num(prevRev)})`, null));
    }

    // --- A/B TEST DETECTION ---

    // Significance reached
    const prevSig = prev.ab_test_significance ?? 0;
    const currSig = curr.ab_test_significance ?? 0;
    if (prevSig < 95 && currSig >= 95) {
      detected.push(makeActivity(date, "paywall", `A/B test reached ${num(currSig)}% significance`, "Statistical significance threshold reached"));
    }

    // --- CPI DETECTION ---

    // CPI significant change (both have CPI, change > 30%)
    const prevCPI = prev.cost_per_install_gbp;
    const currCPI = curr.cost_per_install_gbp;
    if (prevCPI && currCPI && prevCPI > 0.05 && currCPI > 0.05) {
      const cpiChange = ((currCPI - prevCPI) / prevCPI) * 100;
      if (cpiChange < -30) {
        detected.push(makeActivity(date, "campaign", `CPI improved: £${num(prevCPI)} → £${num(currCPI)}`, `${Math.round(cpiChange)}% decrease`));
      } else if (cpiChange > 50) {
        detected.push(makeActivity(date, "campaign", `CPI increased: £${num(prevCPI)} → £${num(currCPI)}`, `+${Math.round(cpiChange)}% increase`));
      }
    }
  }

  // Filter out duplicates
  const newActivities = detected.filter(
    (a) => !existingKeys.has(`${a.date}::${a.title}`)
  );

  // Insert new activities
  let insertedCount = 0;
  if (newActivities.length > 0) {
    const { error: insertError } = await supabase
      .from("activities")
      .insert(newActivities);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    insertedCount = newActivities.length;
  }

  return NextResponse.json({
    detected: detected.length,
    inserted: insertedCount,
    skipped: detected.length - insertedCount,
    message: insertedCount > 0
      ? `Added ${insertedCount} new activities to the timeline`
      : "No new activities detected (all already logged)",
  });
}

function makeActivity(date: string, category: string, title: string, description: string | null): DetectedActivity {
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

function num(val: number | null | undefined): string {
  if (val === null || val === undefined) return "0";
  return Number(val).toFixed(2);
}

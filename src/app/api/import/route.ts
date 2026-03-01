import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const metricsToInsert: Record<string, unknown>[] = [];
    const activitiesToInsert: Record<string, unknown>[] = [];

    for (const row of rows) {
      // Skip TOTALS row
      const dateRaw = row["Date"];
      if (!dateRaw || dateRaw === "TOTALS") continue;

      let dateStr: string;
      if (dateRaw instanceof Date) {
        dateStr = dateRaw.toISOString().split("T")[0];
      } else if (typeof dateRaw === "string") {
        dateStr = dateRaw.substring(0, 10);
      } else {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(dateRaw as number);
        dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      }

      const installs = safeInt(row["TikTok InstallsI"]);
      const trials = safeInt(row["All Trials"]);
      const subs = safeInt(row["All Subscriptions"]);
      const spend = safeFloat(row["TikTok Ad Spend (£)"]) ?? 0;
      const revenue = safeFloat(row["Revenue (£)"]) ?? 0;

      const cpi = installs > 0 ? round2(spend / installs) : null;
      const cpt = trials > 0 ? round2(spend / trials) : null;
      const installToTrialCR = installs > 0 ? round2((trials / installs) * 100) : null;
      const cps = safeFloat(row["Cost Per Subscriber (£)"]);
      const roas = safeFloat(row["ROAS"]);

      metricsToInsert.push({
        client_id: "luna",
        date: dateStr,
        tiktok_installs: installs,
        tiktok_spend_gbp: spend,
        tiktok_impressions: 0,
        tiktok_clicks: 0,
        tiktok_cpm: null,
        apple_revenue_gbp: revenue,
        google_revenue_gbp: 0,
        total_revenue_gbp: revenue,
        new_subscriptions: subs,
        churn: 0,
        net_subscriptions: subs,
        total_trials: trials,
        onboarding_trials: trials,
        non_onboarding_trials: 0,
        annual_discount_trials: 0,
        annual_full_trials: 0,
        monthly_trials: 0,
        cost_per_install_gbp: cpi,
        cost_per_trial_gbp: cpt,
        cost_per_subscriber_gbp: cps,
        install_to_trial_cr: installToTrialCR,
        roas_7d: roas,
        potential_trial_value_gbp: 0,
        ab_variant_a_viewers: null,
        ab_variant_a_trials: null,
        ab_variant_b_viewers: null,
        ab_variant_b_trials: null,
        ab_test_significance: null,
        us_trials: 0,
        gb_trials: trials,
        us_revenue_gbp: 0,
        gb_revenue_gbp: revenue,
        placement_breakdown: null,
        data_quality_checks: null,
        notes: null,
      });

      // Extract activities from note columns
      const noteColumns: Record<string, string> = {
        "Paywall Changes": "paywall",
        "Onboarding Changes": "paywall",
        "TikTok Campaign Changes": "campaign",
        "General Notes": "growth",
      };

      for (const [col, category] of Object.entries(noteColumns)) {
        const note = row[col];
        if (note && typeof note === "string" && note.trim().length > 0) {
          // Split on semicolons for multiple notes
          for (const part of note.split(";")) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            activitiesToInsert.push({
              client_id: "luna",
              date: dateStr,
              category,
              title: trimmed.substring(0, 200),
              description: trimmed.length > 200 ? trimmed : null,
              auto_detected: false,
              source: "google_sheet_import",
              created_by: "Darius",
            });
          }
        }
      }
    }

    // Upsert metrics one by one for better error tracking
    let metricsCount = 0;
    let metricsErrors: string[] = [];

    for (let i = 0; i < metricsToInsert.length; i++) {
      const row = metricsToInsert[i];
      const { error } = await supabase
        .from("metrics")
        .upsert(row, { onConflict: "client_id,date" });
      if (error) {
        metricsErrors.push(`Row ${i} (${row.date}): ${error.message}`);
      } else {
        metricsCount++;
      }
    }

    // Delete existing imported activities to avoid duplicates on re-import
    await supabase
      .from("activities")
      .delete()
      .eq("client_id", "luna")
      .eq("source", "google_sheet_import");

    // Insert activities
    let activitiesCount = 0;
    let activitiesErrors: string[] = [];

    if (activitiesToInsert.length > 0) {
      const { error } = await supabase
        .from("activities")
        .insert(activitiesToInsert);
      if (error) {
        activitiesErrors.push(error.message);
      } else {
        activitiesCount = activitiesToInsert.length;
      }
    }

    // Return sample data for debugging
    const sample = metricsToInsert.slice(0, 3).map(m => ({
      date: m.date,
      installs: m.tiktok_installs,
      trials: m.total_trials,
      subs: m.new_subscriptions,
      spend: m.tiktok_spend_gbp,
      revenue: m.total_revenue_gbp,
      cpi: m.cost_per_install_gbp,
      cpt: m.cost_per_trial_gbp,
      cps: m.cost_per_subscriber_gbp,
    }));

    return NextResponse.json({
      success: true,
      metrics: { imported: metricsCount, errors: metricsErrors, sample },
      activities: { imported: activitiesCount, errors: activitiesErrors },
      totalRows: metricsToInsert.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function safeFloat(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string" && (val.startsWith("#") || val.trim() === "")) return null;
  const n = Number(val);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

function safeInt(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : Math.round(n);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

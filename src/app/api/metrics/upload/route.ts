import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  parseRevenueCSV,
  parseSubsCSV,
  parseConversionsCSV,
  parseScreenViewsCSV,
  parseTikTokXLSX,
  detectLatestDate,
  computeMetrics,
} from "@/lib/metrics";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const types = formData.getAll("types") as string[];
    const dateOverride = formData.get("date") as string | null;

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    // First pass: read all file contents and detect the target date
    let tiktokBuffer: ArrayBuffer | null = null;
    let revenueText = "";
    let subsText = "";
    let conversionsText = "";
    let screenViewsText = "";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = types[i] || "unknown";

      if (type === "tiktok") {
        tiktokBuffer = await file.arrayBuffer();
      } else if (type === "revenue") {
        revenueText = await file.text();
      } else if (type === "subscriptions") {
        subsText = await file.text();
      } else if (type === "conversions") {
        conversionsText = await file.text();
      } else if (type === "screenviews") {
        screenViewsText = await file.text();
      }
    }

    // Determine target date:
    // 1. Use explicit override if provided
    // 2. Detect from conversions CSV (most reliable — has exact dates)
    // 3. Detect from revenue CSV
    // 4. Fall back to today
    let detectedDate = dateOverride || "";

    if (!detectedDate && conversionsText) {
      detectedDate = detectLatestDate(conversionsText);
    }
    if (!detectedDate && revenueText) {
      detectedDate = detectLatestDate(revenueText);
    }
    if (!detectedDate) {
      detectedDate = new Date().toISOString().split("T")[0];
    }

    // Second pass: parse each file using the target date
    const tiktokData = tiktokBuffer
      ? await parseTikTokXLSX(tiktokBuffer)
      : { installs: 0, spend: 0, impressions: 0, clicks: 0, cpm: 0 };

    const revenueData = revenueText
      ? parseRevenueCSV(revenueText, detectedDate)
      : { apple: 0, google: 0 };

    const subsData = subsText
      ? parseSubsCSV(subsText, detectedDate)
      : { new_subs: 0, churn: 0 };

    const conversions = conversionsText
      ? parseConversionsCSV(conversionsText, detectedDate)
      : [];

    const screenViews = screenViewsText
      ? parseScreenViewsCSV(screenViewsText, detectedDate)
      : [];

    // Look up spend from 7 days ago for ROAS calculation
    const supabase = createServerClient();
    const sevenDaysAgo = new Date(detectedDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const { data: historicalRow } = await supabase
      .from("metrics")
      .select("tiktok_spend_gbp")
      .eq("client_id", "luna")
      .eq("date", sevenDaysAgoStr)
      .single();

    const spendSevenDaysAgo = historicalRow?.tiktok_spend_gbp ?? null;

    // Compute all metrics
    const metrics = computeMetrics({
      date: detectedDate,
      tiktok: tiktokData,
      revenue: revenueData,
      subs: subsData,
      conversions,
      screenViews,
      spendSevenDaysAgo,
    });

    // Verify checksums before saving
    if (
      metrics.data_quality_checks &&
      !metrics.data_quality_checks.checksum_passed
    ) {
      console.warn("Data quality check failed:", metrics.data_quality_checks);
    }

    // Upsert to database
    const { error } = await supabase.from("metrics").upsert(
      {
        ...metrics,
        // Supabase expects JSON columns as objects
        placement_breakdown: metrics.placement_breakdown as unknown,
        data_quality_checks: metrics.data_quality_checks as unknown,
        computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,date" }
    );

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      date: detectedDate,
      metrics,
      files_processed: files.length,
      quality_checks: metrics.data_quality_checks,
    });
  } catch (err: unknown) {
    console.error("Upload processing error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

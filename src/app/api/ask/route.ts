import { createServerClient } from "@/lib/supabase";
import { verifySession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function buildSystemPrompt(metrics: Record<string, unknown>[], activities: Record<string, unknown>[]): string {
  // Format metrics into a compact table
  const metricsTable = metrics.map((m) => {
    const row: Record<string, unknown> = {};
    const keys = [
      "date", "tiktok_spend_gbp", "tiktok_installs", "tiktok_impressions", "tiktok_clicks",
      "total_trials", "onboarding_trials", "non_onboarding_trials",
      "monthly_trials", "annual_full_trials", "annual_discount_trials",
      "us_trials", "gb_trials",
      "new_subscriptions", "churn",
      "total_revenue_gbp", "us_revenue_gbp", "gb_revenue_gbp",
      "cost_per_install_gbp", "cost_per_trial_gbp", "cost_per_subscriber_gbp",
      "install_to_trial_cr", "roas_7d",
      "ab_variant_a_viewers", "ab_variant_a_trials", "ab_variant_b_viewers", "ab_variant_b_trials",
      "ab_test_significance",
      "notes",
    ];
    for (const k of keys) {
      if (m[k] !== null && m[k] !== undefined && m[k] !== 0) {
        row[k] = m[k];
      }
    }
    return row;
  });

  const activitiesText = activities.map((a) =>
    `[${a.date}] ${a.category}: ${a.title}${a.description ? " — " + a.description : ""}`
  ).join("\n");

  return `You are Luna Brain, the AI analyst for Luna, a teen period tracker app.

## YOUR ROLE
You answer questions about Luna's growth metrics, campaign performance, and business strategy. You are data-driven, precise, and always cite specific numbers and dates from the data provided.

## BUSINESS CONTEXT
- Luna is a period tracker app targeting teens (primary) and parents (secondary)
- Goal: increase install-to-subscriber conversion from ~0.8% to 5%
- Primary acquisition: TikTok paid ads (UK and US markets)
- Paywall management: Purchasely with A/B testing
- Currency: GBP (£) for all metrics
- Key pricing: Monthly £4.99, Annual £39.99, Annual Discount £19.99
- US market launched Feb 21, 2026. UK has been running since early Feb.
- Monthly pricing consistently outperforms annual in A/B tests

## KEY METRICS DEFINITIONS
- CPI = Cost Per Install (spend / installs)
- CPT = Cost Per Trial (spend / trials)
- CPS = Cost Per Subscriber (spend / new subscriptions)
- I→T% = Install to Trial Conversion Rate (trials / installs × 100)
- ROAS = Return on Ad Spend (revenue / spend)
- Onboarding trials = conversions from the onboarding paywall flow
- Non-onboarding trials = conversions from in-app paywalls (teen_home, etc.)

## COMPLETE METRICS DATA (${metrics.length} days)
${JSON.stringify(metricsTable, null, 1)}

## TIMELINE / ACTIVITIES (${activities.length} events)
${activitiesText || "No activities logged yet."}

## RESPONSE GUIDELINES
1. Always cite specific dates and numbers. Say "On Feb 20, CPI was £0.34" not "CPI was around 30p"
2. When comparing periods, compute the actual difference and percentage change
3. If data is missing or zero for certain fields (common for historical imports), say so honestly
4. For "why" questions, look for correlated changes: campaign launches, paywall tests, market changes
5. Use the timeline/activities to correlate metric changes with business decisions
6. Format numbers consistently: currency with £ and 2 decimals, percentages with %, integers for counts
7. If you genuinely cannot answer from the data, say what additional data would be needed
8. Keep answers concise but thorough. Lead with the answer, then supporting evidence.
9. Structure longer answers with clear sections but avoid excessive formatting
10. When the data shows something surprising or concerning, flag it proactively`;
}

export async function POST(request: Request) {
  const isAuthenticated = await verifySession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { question, history } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch all metrics and activities
    const [metricsResult, activitiesResult] = await Promise.all([
      supabase
        .from("metrics")
        .select("*")
        .eq("client_id", "luna")
        .order("date", { ascending: true }),
      supabase
        .from("activities")
        .select("*")
        .eq("client_id", "luna")
        .order("date", { ascending: false })
        .limit(100),
    ]);

    const metrics = (metricsResult.data ?? []) as Record<string, unknown>[];
    const activities = (activitiesResult.data ?? []) as Record<string, unknown>[];

    const systemPrompt = buildSystemPrompt(metrics, activities);

    // Build conversation messages
    const messages: { role: string; content: string }[] = [];

    // Include conversation history (last 10 exchanges max)
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-20); // 10 pairs of user/assistant
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current question
    messages.push({ role: "user", content: question });

    // Call Claude API with streaming
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`));
                  } else if (parsed.type === "message_stop") {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                  }
                } catch {
                  // Skip unparseable lines
                }
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

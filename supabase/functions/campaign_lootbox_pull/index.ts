/**
 * Campaign Lootbox: Open = one pull, response = check if won.
 *
 * When a campaign is over, user opens the lootbox (one pull per request).
 * We compute probabilities from prize values (higher value = lower chance),
 * run one random raffle, and return whether they won and which prize (or nothing).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrizeOption {
  id?: string;
  label: string;
  image?: string;
  sponsor?: string;
  value: number;
  amount?: number | string;
  metadataHash?: string;
}

function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / (0xffff_ffff + 1);
}

/**
 * Build probability weights: weight = amount / (value + 1).
 * Higher value (price) => lower chance; more quantity (amount) => higher chance.
 * Example: 10 coffee (value 2), 100×1usd (value 1), 1 phone (value 300) → 1usd most likely, phone rarest.
 */
function buildWeights(prizes: PrizeOption[]): { prize: PrizeOption; weight: number }[] {
  return prizes.map((prize) => {
    const amount = Number(prize.amount) || 1;
    const value = Number(prize.value) || 0;
    const weight = amount / (value + 1);
    return { prize, weight };
  });
}

/**
 * One random draw: optional "no prize" outcome, then weighted choice among prizes.
 * noPrizeShare: fraction of total probability for "won nothing" (e.g. 0.4 = 40%).
 */
function draw(
  weighted: { prize: PrizeOption; weight: number }[],
  noPrizeShare: number,
  rng: () => number
): PrizeOption | null {
  const totalPrizeWeight = weighted.reduce((s, x) => s + x.weight, 0);
  if (totalPrizeWeight <= 0) return null;

  const noPrizeWeight = (noPrizeShare / (1 - noPrizeShare)) * totalPrizeWeight;
  const total = totalPrizeWeight + noPrizeWeight;
  const r = rng();

  if (r < noPrizeWeight / total) return null;

  const r2 = (r - noPrizeWeight / total) / (totalPrizeWeight / total);
  let cum = 0;
  for (const { prize, weight } of weighted) {
    cum += weight / totalPrizeWeight;
    if (r2 < cum) return prize;
  }
  return weighted[weighted.length - 1]?.prize ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));
    const { campaign_id: campaignId, signature, message } = body as {
      campaign_id?: string;
      signature?: string;
      message?: string;
    };

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "Missing campaign_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve user: Bearer token or signature+message
    let userAddress: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user?.user_metadata?.wallet_address) {
        userAddress = String(user.user_metadata.wallet_address).toLowerCase();
      }
    }
    if (!userAddress && signature && message) {
      const { ethers } = await import("https://esm.sh/ethers@6.11.1");
      userAddress = ethers.verifyMessage(message, signature)?.toLowerCase() ?? null;
    }
    if (!userAddress) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: provide Bearer token or signature+message" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load campaign and check it is over
    const { data: campaign, error: campError } = await supabaseClient
      .from("campaigns")
      .select("id, status, end_date, prize_chest")
      .eq("id", campaignId)
      .single();

    if (campError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const isEnded = campaign.status === "ended" || (campaign.end_date && campaign.end_date < now);
    if (!isEnded) {
      return new Response(
        JSON.stringify({ error: "Campaign is not over yet. Lootbox is only available after the campaign ends." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Load prizes: prefer campaign_prizes table, fallback to prize_chest
    let prizes: PrizeOption[] = [];
    const { data: rows } = await supabaseClient
      .from("campaign_prizes")
      .select("id, label, image, sponsor, value, amount, metadata_hash")
      .eq("campaign_id", campaignId);

    if (rows && rows.length > 0) {
      prizes = rows.map((r: any) => ({
        id: r.id,
        label: r.label ?? "Prize",
        image: r.image ?? undefined,
        sponsor: r.sponsor ?? undefined,
        value: Number(r.value) || 1,
        amount: r.amount,
        metadataHash: r.metadata_hash,
      }));
    } else if (campaign.prize_chest && Array.isArray(campaign.prize_chest)) {
      prizes = (campaign.prize_chest as any[]).map((p: any) => ({
        label: p.label ?? "Prize",
        image: p.image,
        sponsor: p.sponsor,
        value: Number(p.value ?? p.amount ?? 1) || 1,
        amount: p.amount ?? p.value,
        metadataHash: p.metadataHash,
      }));
    }

    if (prizes.length === 0) {
      return new Response(
        JSON.stringify({
          won: false,
          prize: null,
          message: "No prizes configured for this campaign.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Probabilities: higher value => lower probability
    const weighted = buildWeights(prizes);
    const noPrizeShare = 0.4; // 40% chance of nothing per pull
    const wonPrize = draw(weighted, noPrizeShare, secureRandom);

    // 4. Log pull for analytics
    await supabaseClient.from("campaign_lootbox_pulls").insert({
      campaign_id: campaignId,
      user_address: userAddress,
      won: !!wonPrize,
      prize_id: (wonPrize as PrizeOption & { id?: string })?.id ?? null,
      prize_label: wonPrize?.label ?? null,
      prize_value: wonPrize?.value ?? null,
    }).then(() => {}).catch((e) => console.warn("[campaign_lootbox_pull] log insert failed:", e));

    return new Response(
      JSON.stringify({
        won: !!wonPrize,
        prize: wonPrize
          ? {
              label: wonPrize.label,
              image: wonPrize.image,
              sponsor: wonPrize.sponsor,
              value: wonPrize.value,
              amount: wonPrize.amount,
            }
          : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[campaign_lootbox_pull]", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

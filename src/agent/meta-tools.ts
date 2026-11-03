import { tool } from "ai";
import { z } from "zod";
import {
  allowedAccountIds,
  assertAccountAllowed,
  metaGet,
} from "@/lib/meta";

const accountId = z
  .string()
  .describe("Ad account ID, with or without the act_ prefix");

const DATE_PRESETS = [
  "today",
  "yesterday",
  "last_3d",
  "last_7d",
  "last_14d",
  "last_28d",
  "last_30d",
  "last_90d",
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "last_year",
  "maximum",
] as const;

const LEVEL_FIELDS = {
  account: ["account_id", "account_name"],
  campaign: ["campaign_id", "campaign_name"],
  adset: ["campaign_name", "adset_id", "adset_name"],
  ad: ["campaign_name", "adset_name", "ad_id", "ad_name"],
} as const;

const METRIC_FIELDS = [
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "inline_link_clicks",
  "ctr",
  "cpc",
  "cpm",
  "actions",
  "cost_per_action_type",
  "action_values",
  "purchase_roas",
];

export const listAdAccounts = tool({
  description:
    "List the Meta ad accounts this agent can read, with currency and timezone.",
  inputSchema: z.object({}),
  execute: async () => {
    const fields = "id,name,account_status,currency,timezone_name,amount_spent";
    const allowed = allowedAccountIds();
    if (allowed.length > 0) {
      return {
        accounts: await Promise.all(
          allowed.map((id) => metaGet(id, { fields })),
        ),
      };
    }
    const res = await metaGet("me/adaccounts", { fields, limit: 100 });
    return { accounts: res.data ?? [] };
  },
});

export const listCampaigns = tool({
  description:
    "List campaigns in an ad account with status, objective and budget. Budgets are in the account currency's minor unit (e.g. cents, paise).",
  inputSchema: z.object({
    accountId,
    effectiveStatus: z
      .array(z.enum(["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"]))
      .optional()
      .describe("Filter by effective status. Omit for all non-deleted."),
    limit: z.number().int().min(1).max(200).default(50),
  }),
  execute: async ({ accountId: rawId, effectiveStatus, limit }) => {
    const id = assertAccountAllowed(rawId);
    const res = await metaGet(`${id}/campaigns`, {
      fields:
        "id,name,objective,status,effective_status,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,bid_strategy",
      effective_status: effectiveStatus
        ? JSON.stringify(effectiveStatus)
        : undefined,
      limit,
    });
    return { campaigns: res.data ?? [], hasMore: Boolean(res.paging?.next) };
  },
});

export const getInsights = tool({
  description:
    "Get performance insights (spend, impressions, clicks, CTR, CPC, CPM, conversions, ROAS) for an ad account, broken down by campaign, ad set or ad. Use a date preset or an explicit since/until range.",
  inputSchema: z.object({
    accountId,
    level: z.enum(["account", "campaign", "adset", "ad"]).default("campaign"),
    datePreset: z.enum(DATE_PRESETS).optional(),
    since: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Start date YYYY-MM-DD. Use with until instead of datePreset."),
    until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("End date YYYY-MM-DD"),
    breakdowns: z
      .array(
        z.enum([
          "age",
          "gender",
          "country",
          "region",
          "publisher_platform",
          "platform_position",
          "device_platform",
          "impression_device",
        ]),
      )
      .max(2)
      .optional(),
    dailyBreakdown: z
      .boolean()
      .default(false)
      .describe("Return one row per day instead of one row per period."),
    limit: z.number().int().min(1).max(200).default(50),
  }),
  execute: async ({
    accountId: rawId,
    level,
    datePreset,
    since,
    until,
    breakdowns,
    dailyBreakdown,
    limit,
  }) => {
    const id = assertAccountAllowed(rawId);
    const hasRange = since && until;
    const res = await metaGet(`${id}/insights`, {
      level,
      fields: [...LEVEL_FIELDS[level], ...METRIC_FIELDS].join(","),
      date_preset: hasRange ? undefined : (datePreset ?? "last_7d"),
      time_range: hasRange ? JSON.stringify({ since, until }) : undefined,
      breakdowns: breakdowns?.join(","),
      time_increment: dailyBreakdown ? 1 : undefined,
      limit,
    });
    return { rows: res.data ?? [], hasMore: Boolean(res.paging?.next) };
  },
});

export const metaTools = { listAdAccounts, listCampaigns, getInsights };

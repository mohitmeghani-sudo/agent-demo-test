/* eslint-disable @typescript-eslint/no-explicit-any -- Meta payloads are loosely typed and normalised here */
import { assertAccountAllowed, metaGet, metaGetAll } from "./meta";

export const DEFAULT_AD_ACCOUNT_ID = "261215873024315";

export type Setting = { label: string; value: string };

export type LiveAd = {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  createdTime?: string;
  updatedTime?: string;
  previewLink?: string;
  conversionDomain?: string;
  creative: {
    id?: string;
    name?: string;
    type?: string;
    imageUrl?: string;
    primaryTexts: string[];
    headlines: string[];
    descriptions: string[];
    callToAction?: string;
    links: string[];
    displayLinks: string[];
    urlTags?: string;
    cards: { headline?: string; description?: string; link?: string }[];
    enhancements: string[];
    isDynamic: boolean;
    postUrl?: string;
    instagramUrl?: string;
  };
};

export type LiveAdSet = {
  id: string;
  name: string;
  settings: Setting[];
  targeting: Setting[];
  rawTargeting: unknown;
  ads: LiveAd[];
};

export type LiveCampaign = {
  id: string;
  name: string;
  settings: Setting[];
  adsets: LiveAdSet[];
};

export type LiveAdsResponse = {
  account: { id: string; name?: string; currency?: string; timezone?: string };
  fetchedAt: string;
  truncated: boolean;
  totals: { campaigns: number; adsets: number; ads: number };
  campaigns: LiveCampaign[];
};

const CREATIVE_FIELDS = [
  "id",
  "name",
  "object_type",
  "body",
  "title",
  "link_url",
  "call_to_action_type",
  "image_url",
  "thumbnail_url",
  "url_tags",
  "object_story_spec",
  "asset_feed_spec",
  "effective_object_story_id",
  "instagram_permalink_url",
  "degrees_of_freedom_spec",
].join(",");

const CAMPAIGN_FIELDS = [
  "id",
  "name",
  "objective",
  "buying_type",
  "status",
  "effective_status",
  "special_ad_categories",
  "bid_strategy",
  "daily_budget",
  "lifetime_budget",
  "spend_cap",
  "start_time",
  "stop_time",
].join(",");

const ADSET_FIELDS = [
  "id",
  "name",
  "status",
  "effective_status",
  "optimization_goal",
  "billing_event",
  "bid_strategy",
  "bid_amount",
  "daily_budget",
  "lifetime_budget",
  "budget_remaining",
  "start_time",
  "end_time",
  "destination_type",
  "pacing_type",
  "is_dynamic_creative",
  "attribution_spec",
  "promoted_object",
  "targeting",
].join(",");

const AD_FIELDS = [
  "id",
  "name",
  "status",
  "effective_status",
  "created_time",
  "updated_time",
  "preview_shareable_link",
  "conversion_domain",
  `campaign{${CAMPAIGN_FIELDS}}`,
  `adset{${ADSET_FIELDS}}`,
  `creative{${CREATIVE_FIELDS}}`,
].join(",");

const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "HUF", "TWD"]);

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

function money(minor: unknown, currency?: string): string | undefined {
  if (minor === undefined || minor === null || minor === "") return undefined;
  const n = Number(minor);
  if (Number.isNaN(n)) return String(minor);
  const value = ZERO_DECIMAL.has(currency ?? "") ? n : n / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

const date = (v?: string) => (v ? v.slice(0, 16).replace("T", " ") : undefined);

function settings(entries: [string, unknown][]): Setting[] {
  return entries
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([label, v]) => ({
      label,
      value: Array.isArray(v) ? v.join(", ") : String(v),
    }))
    .filter((s) => s.value !== "");
}

function uniq(values: (string | undefined | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v && !!v.trim()))];
}

function summariseTargeting(t: any): Setting[] {
  if (!t) return [];
  const geo = t.geo_locations ?? {};
  const places = [
    ...(geo.countries ?? []),
    ...(geo.regions ?? []).map((r: any) => r.name),
    ...(geo.cities ?? []).map((c: any) => c.name),
    ...(geo.custom_locations ?? []).map((c: any) => c.name ?? "Custom location"),
  ];
  const genders = t.genders
    ? t.genders.map((g: number) => (g === 1 ? "Male" : g === 2 ? "Female" : "All"))
    : ["All"];
  const interests = (t.flexible_spec ?? []).flatMap((spec: any) =>
    Object.values(spec).flatMap((group: any) =>
      Array.isArray(group) ? group.map((i: any) => i.name).filter(Boolean) : [],
    ),
  );
  const audienceNames = (list?: any[]) => (list ?? []).map((a) => a.name ?? a.id);

  return settings([
    ["Locations", places],
    ["Excluded locations", (t.excluded_geo_locations?.countries ?? [])],
    ["Age", t.age_min || t.age_max ? `${t.age_min ?? 18}–${t.age_max ?? "65+"}` : undefined],
    ["Gender", genders],
    ["Interests / behaviours", interests],
    ["Custom audiences", audienceNames(t.custom_audiences)],
    ["Excluded audiences", audienceNames(t.excluded_custom_audiences)],
    ["Platforms", t.publisher_platforms],
    ["Facebook placements", t.facebook_positions],
    ["Instagram placements", t.instagram_positions],
    ["Devices", t.device_platforms],
    [
      "Advantage+ audience",
      t.targeting_automation?.advantage_audience === 1 ? "On" : undefined,
    ],
  ]);
}

function normaliseCreative(c: any = {}): LiveAd["creative"] {
  const spec = c.object_story_spec ?? {};
  const link = spec.link_data;
  const video = spec.video_data;
  const photo = spec.photo_data;
  const feed = c.asset_feed_spec;

  const cards = (link?.child_attachments ?? []).map((a: any) => ({
    headline: a.name,
    description: a.description,
    link: a.link,
  }));

  const enhancements = Object.entries(
    c.degrees_of_freedom_spec?.creative_features_spec ?? {},
  )
    .filter(([, v]: [string, any]) => v?.enroll_status === "OPT_IN")
    .map(([k]) => titleCase(k));

  const story = c.effective_object_story_id as string | undefined;

  return {
    id: c.id,
    name: c.name,
    type: c.object_type,
    imageUrl: c.image_url ?? c.thumbnail_url,
    primaryTexts: uniq([
      c.body,
      link?.message,
      video?.message,
      photo?.caption,
      ...(feed?.bodies ?? []).map((b: any) => b.text),
    ]),
    headlines: uniq([
      c.title,
      link?.name,
      video?.title,
      ...(feed?.titles ?? []).map((t: any) => t.text),
      ...cards.map((x: any) => x.headline),
    ]),
    descriptions: uniq([
      link?.description,
      video?.link_description,
      ...(feed?.descriptions ?? []).map((d: any) => d.text),
      ...cards.map((x: any) => x.description),
    ]),
    callToAction:
      c.call_to_action_type ??
      link?.call_to_action?.type ??
      video?.call_to_action?.type ??
      feed?.call_to_action_types?.[0],
    links: uniq([
      c.link_url,
      link?.link,
      link?.call_to_action?.value?.link,
      video?.call_to_action?.value?.link,
      ...(feed?.link_urls ?? []).map((l: any) => l.website_url),
    ]),
    displayLinks: uniq([
      link?.caption,
      ...(feed?.link_urls ?? []).map((l: any) => l.display_url),
    ]),
    urlTags: c.url_tags || undefined,
    cards,
    enhancements,
    isDynamic: Boolean(feed),
    postUrl: story ? `https://www.facebook.com/${story}` : undefined,
    instagramUrl: c.instagram_permalink_url,
  };
}

export async function fetchLiveAds(rawAccountId: string): Promise<LiveAdsResponse> {
  const accountId = assertAccountAllowed(rawAccountId);

  const [account, { items, truncated }] = await Promise.all([
    metaGet<any>(accountId, { fields: "id,name,currency,timezone_name" }),
    // effective_status ACTIVE means the ad AND its ad set AND its campaign are all live.
    metaGetAll<any>(
      `${accountId}/ads`,
      {
        fields: AD_FIELDS,
        effective_status: JSON.stringify(["ACTIVE"]),
        limit: 25,
      },
      500,
    ),
  ]);

  const currency = account.currency as string | undefined;
  const campaigns = new Map<string, LiveCampaign>();

  for (const raw of items) {
    const c = raw.campaign;
    const s = raw.adset;
    if (!c || !s) continue;

    let campaign = campaigns.get(c.id);
    if (!campaign) {
      campaign = {
        id: c.id,
        name: c.name,
        settings: settings([
          ["Objective", c.objective && titleCase(c.objective)],
          ["Buying type", c.buying_type],
          ["Status", c.effective_status],
          ["Budget (daily)", money(c.daily_budget, currency)],
          ["Budget (lifetime)", money(c.lifetime_budget, currency)],
          ["Spend cap", money(c.spend_cap, currency)],
          ["Bid strategy", c.bid_strategy && titleCase(c.bid_strategy)],
          ["Special ad categories", (c.special_ad_categories ?? []).filter((x: string) => x !== "NONE")],
          ["Start", date(c.start_time)],
          ["Stop", date(c.stop_time)],
        ]),
        adsets: [],
      };
      campaigns.set(c.id, campaign);
    }

    let adset = campaign.adsets.find((a) => a.id === s.id);
    if (!adset) {
      const promoted = s.promoted_object ?? {};
      adset = {
        id: s.id,
        name: s.name,
        settings: settings([
          ["Status", s.effective_status],
          ["Optimization goal", s.optimization_goal && titleCase(s.optimization_goal)],
          ["Billing event", s.billing_event && titleCase(s.billing_event)],
          ["Bid strategy", s.bid_strategy && titleCase(s.bid_strategy)],
          ["Bid amount", money(s.bid_amount, currency)],
          ["Budget (daily)", money(s.daily_budget, currency)],
          ["Budget (lifetime)", money(s.lifetime_budget, currency)],
          ["Budget remaining", money(s.budget_remaining, currency)],
          ["Destination", s.destination_type && titleCase(s.destination_type)],
          ["Conversion event", promoted.custom_event_type && titleCase(promoted.custom_event_type)],
          ["Pixel", promoted.pixel_id],
          [
            "Attribution",
            (s.attribution_spec ?? []).map(
              (a: any) => `${a.window_days}-day ${titleCase(a.event_type)}`,
            ),
          ],
          ["Pacing", s.pacing_type],
          ["Dynamic creative", s.is_dynamic_creative ? "Yes" : undefined],
          ["Start", date(s.start_time)],
          ["End", date(s.end_time)],
        ]),
        targeting: summariseTargeting(s.targeting),
        rawTargeting: s.targeting,
        ads: [],
      };
      campaign.adsets.push(adset);
    }

    adset.ads.push({
      id: raw.id,
      name: raw.name,
      status: raw.status,
      effectiveStatus: raw.effective_status,
      createdTime: date(raw.created_time),
      updatedTime: date(raw.updated_time),
      previewLink: raw.preview_shareable_link,
      conversionDomain: raw.conversion_domain,
      creative: normaliseCreative(raw.creative),
    });
  }

  const list = [...campaigns.values()];
  return {
    account: {
      id: accountId,
      name: account.name as string | undefined,
      currency,
      timezone: account.timezone_name as string | undefined,
    },
    fetchedAt: new Date().toISOString(),
    truncated,
    totals: {
      campaigns: list.length,
      adsets: list.reduce((n, c) => n + c.adsets.length, 0),
      ads: list.reduce(
        (n, c) => n + c.adsets.reduce((m, a) => m + a.ads.length, 0),
        0,
      ),
    },
    campaigns: list,
  };
}

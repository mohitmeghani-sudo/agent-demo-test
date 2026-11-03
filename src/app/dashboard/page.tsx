"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  LiveAd,
  LiveAdSet,
  LiveAdsResponse,
  LiveCampaign,
  Setting,
} from "@/lib/live-ads";

const CODE_KEY = "ads-dashboard-access-code";

type Row = { campaign: LiveCampaign; adset: LiveAdSet; ad: LiveAd };
type Tab = "all" | "copy" | "preview" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All in one" },
  { id: "copy", label: "Ad copy" },
  { id: "preview", label: "Preview" },
  { id: "settings", label: "Settings" },
];

function readStoredCode() {
  try {
    return sessionStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

const setting = (list: Setting[], label: string) =>
  list.find((s) => s.label === label)?.value;

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(rows: Row[]) {
  const header = [
    "Campaign",
    "Ad set",
    "Ad",
    "Ad ID",
    "Status",
    "Primary texts",
    "Headlines",
    "Descriptions",
    "CTA",
    "Links",
    "URL tags",
    "Objective",
    "Optimization goal",
    "Daily budget",
    "Locations",
    "Age",
    "Gender",
  ];
  const lines = rows.map(({ campaign, adset, ad }) =>
    [
      campaign.name,
      adset.name,
      ad.name,
      ad.id,
      ad.effectiveStatus,
      ad.creative.primaryTexts.join(" || "),
      ad.creative.headlines.join(" || "),
      ad.creative.descriptions.join(" || "),
      ad.creative.callToAction ?? "",
      ad.creative.links.join(" || "),
      ad.creative.urlTags ?? "",
      setting(campaign.settings, "Objective") ?? "",
      setting(adset.settings, "Optimization goal") ?? "",
      setting(adset.settings, "Budget (daily)") ??
        setting(campaign.settings, "Budget (daily)") ??
        "",
      setting(adset.targeting, "Locations") ?? "",
      setting(adset.targeting, "Age") ?? "",
      setting(adset.targeting, "Gender") ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\n");
}

function rowMatches({ campaign, adset, ad }: Row, q: string) {
  if (!q) return true;
  return [
    campaign.name,
    adset.name,
    ad.name,
    ...ad.creative.primaryTexts,
    ...ad.creative.headlines,
    ...ad.creative.descriptions,
  ]
    .join("\n")
    .toLowerCase()
    .includes(q.toLowerCase());
}

/* ---------- shared bits ---------- */

function Variants({ values }: { values: string[] }) {
  if (values.length === 0) return <span className="text-slate-400">—</span>;
  if (values.length === 1)
    return <div className="whitespace-pre-wrap">{values[0]}</div>;
  return (
    <ol className="list-decimal space-y-1.5 pl-4">
      {values.map((v, i) => (
        <li key={i} className="whitespace-pre-wrap">
          {v}
        </li>
      ))}
    </ol>
  );
}

function Dash({ value }: { value?: string }) {
  return value ? <>{value}</> : <span className="text-slate-400">—</span>;
}

function Thumb({ ad }: { ad: LiveAd }) {
  if (!ad.creative.imageUrl)
    return <div className="h-14 w-14 rounded bg-slate-100" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ad.creative.imageUrl}
      alt=""
      className="h-14 w-14 rounded object-cover"
    />
  );
}

function Status({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {value}
    </span>
  );
}

function Table({
  headers,
  children,
  minWidth,
}: {
  headers: { label: string; className?: string }[];
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className={`w-full border-collapse text-sm ${minWidth ?? ""}`}>
        <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            {headers.map((h) => (
              <th
                key={h.label}
                className={`border-b border-slate-200 px-3 py-2.5 font-semibold ${h.className ?? ""}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 align-top">{children}</tbody>
      </table>
    </div>
  );
}

const td = "px-3 py-3 align-top";

function AdIdentity({ row }: { row: Row }) {
  return (
    <div className="space-y-1">
      <div className="font-medium">{row.ad.name}</div>
      <Status value={row.ad.effectiveStatus} />
      <div className="text-xs text-slate-500">ID {row.ad.id}</div>
    </div>
  );
}

/* ---------- tabs ---------- */

function AllInOneTab({ rows }: { rows: Row[] }) {
  return (
    <Table
      minWidth="min-w-[2000px]"
      headers={[
        { label: "Creative" },
        { label: "Campaign", className: "min-w-44" },
        { label: "Ad set", className: "min-w-44" },
        { label: "Ad", className: "min-w-40" },
        { label: "Primary text", className: "min-w-80" },
        { label: "Headline", className: "min-w-56" },
        { label: "Description", className: "min-w-56" },
        { label: "CTA" },
        { label: "Destination URL", className: "min-w-56" },
        { label: "Objective" },
        { label: "Optimization" },
        { label: "Budget" },
        { label: "Bid strategy" },
        { label: "Locations", className: "min-w-40" },
        { label: "Age / gender" },
        { label: "Placements", className: "min-w-40" },
      ]}
    >
      {rows.map((row) => {
        const { campaign, adset, ad } = row;
        const c = ad.creative;
        const budget =
          setting(adset.settings, "Budget (daily)") ??
          setting(adset.settings, "Budget (lifetime)") ??
          setting(campaign.settings, "Budget (daily)") ??
          setting(campaign.settings, "Budget (lifetime)");
        const age = setting(adset.targeting, "Age");
        const gender = setting(adset.targeting, "Gender");
        return (
          <tr key={ad.id} className="hover:bg-slate-50">
            <td className={td}>
              <Thumb ad={ad} />
            </td>
            <td className={td}>{campaign.name}</td>
            <td className={td}>{adset.name}</td>
            <td className={td}>
              <AdIdentity row={row} />
            </td>
            <td className={td}>
              <Variants values={c.primaryTexts} />
            </td>
            <td className={td}>
              <Variants values={c.headlines} />
            </td>
            <td className={td}>
              <Variants values={c.descriptions} />
            </td>
            <td className={td}>
              <Dash value={c.callToAction} />
            </td>
            <td className={`${td} break-all`}>
              <Dash value={c.links[0]} />
            </td>
            <td className={td}>
              <Dash value={setting(campaign.settings, "Objective")} />
            </td>
            <td className={td}>
              <Dash value={setting(adset.settings, "Optimization goal")} />
            </td>
            <td className={td}>
              <Dash value={budget} />
            </td>
            <td className={td}>
              <Dash
                value={
                  setting(adset.settings, "Bid strategy") ??
                  setting(campaign.settings, "Bid strategy")
                }
              />
            </td>
            <td className={td}>
              <Dash value={setting(adset.targeting, "Locations")} />
            </td>
            <td className={td}>
              <Dash value={[age, gender].filter(Boolean).join(" · ")} />
            </td>
            <td className={td}>
              <Dash
                value={[
                  setting(adset.targeting, "Platforms"),
                  setting(adset.targeting, "Facebook placements"),
                  setting(adset.targeting, "Instagram placements"),
                ]
                  .filter(Boolean)
                  .join(" | ")}
              />
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function CopyTab({ rows }: { rows: Row[] }) {
  return (
    <Table
      minWidth="min-w-[1400px]"
      headers={[
        { label: "Campaign", className: "min-w-40" },
        { label: "Ad set", className: "min-w-40" },
        { label: "Ad", className: "min-w-40" },
        { label: "Primary text", className: "min-w-96" },
        { label: "Headline", className: "min-w-60" },
        { label: "Description", className: "min-w-60" },
        { label: "CTA" },
        { label: "Destination URL", className: "min-w-56" },
        { label: "URL parameters", className: "min-w-48" },
      ]}
    >
      {rows.map((row) => {
        const c = row.ad.creative;
        return (
          <tr key={row.ad.id} className="hover:bg-slate-50">
            <td className={td}>{row.campaign.name}</td>
            <td className={td}>{row.adset.name}</td>
            <td className={td}>
              <AdIdentity row={row} />
            </td>
            <td className={td}>
              <Variants values={c.primaryTexts} />
            </td>
            <td className={td}>
              <Variants values={c.headlines} />
            </td>
            <td className={td}>
              <Variants values={c.descriptions} />
            </td>
            <td className={td}>
              <Dash value={c.callToAction} />
            </td>
            <td className={`${td} break-all`}>
              <Dash value={c.links.join("\n")} />
            </td>
            <td className={`${td} break-all`}>
              <Dash value={c.urlTags} />
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function domainOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase();
  } catch {
    return "";
  }
}

function PreviewCard({ row }: { row: Row }) {
  const { ad, campaign, adset } = row;
  const c = ad.creative;
  const extra =
    Math.max(c.primaryTexts.length, c.headlines.length, c.descriptions.length) - 1;
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <div className="text-sm font-semibold">{ad.name}</div>
        <div className="truncate text-xs text-slate-500">
          {campaign.name} › {adset.name}
        </div>
      </div>
      <div className="whitespace-pre-wrap px-4 py-3 text-sm">
        {c.primaryTexts[0] ?? <span className="text-slate-400">No primary text</span>}
      </div>
      {c.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.imageUrl} alt="" className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
          No image
        </div>
      )}
      <div className="flex items-center justify-between gap-3 bg-slate-100 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-xs text-slate-500">
            {c.displayLinks[0]?.toUpperCase() || domainOf(c.links[0])}
          </div>
          <div className="truncate text-sm font-semibold">{c.headlines[0] ?? ""}</div>
          <div className="truncate text-xs text-slate-600">{c.descriptions[0] ?? ""}</div>
        </div>
        {c.callToAction && (
          <span className="shrink-0 rounded bg-slate-300 px-3 py-1.5 text-xs font-semibold">
            {c.callToAction.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2.5 text-xs">
        {extra > 0 && (
          <span className="text-slate-500">+{extra} more text variants</span>
        )}
        {c.cards.length > 1 && (
          <span className="text-slate-500">Carousel · {c.cards.length} cards</span>
        )}
        {ad.previewLink && (
          <a className="text-blue-600 underline" href={ad.previewLink} target="_blank" rel="noreferrer">
            Open Meta preview
          </a>
        )}
        {c.postUrl && (
          <a className="text-blue-600 underline" href={c.postUrl} target="_blank" rel="noreferrer">
            Post
          </a>
        )}
        {c.instagramUrl && (
          <a className="text-blue-600 underline" href={c.instagramUrl} target="_blank" rel="noreferrer">
            Instagram
          </a>
        )}
      </div>
    </div>
  );
}

function PreviewTab({ rows }: { rows: Row[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <PreviewCard key={row.ad.id} row={row} />
      ))}
    </div>
  );
}

function SettingsList({ items }: { items: Setting[] }) {
  if (items.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {items.map((s) => (
        <div key={s.label} className="contents">
          <dt className="text-slate-500">{s.label}</dt>
          <dd className="break-words">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SettingsTab({ rows }: { rows: Row[] }) {
  const campaigns = useMemo(() => {
    const seen = new Map<string, LiveCampaign>();
    rows.forEach((r) => seen.set(r.campaign.id, r.campaign));
    return [...seen.values()];
  }, [rows]);

  const adsets = useMemo(() => {
    const seen = new Map<string, { campaign: LiveCampaign; adset: LiveAdSet }>();
    rows.forEach((r) =>
      seen.set(r.adset.id, { campaign: r.campaign, adset: r.adset }),
    );
    return [...seen.values()];
  }, [rows]);

  const adCount = (adsetId: string) =>
    rows.filter((r) => r.adset.id === adsetId).length;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Campaign settings ({campaigns.length})
        </h2>
        <Table
          minWidth="min-w-[900px]"
          headers={[
            { label: "Campaign", className: "min-w-56" },
            { label: "Settings", className: "min-w-96" },
          ]}
        >
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className={td}>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-slate-500">ID {c.id}</div>
              </td>
              <td className={td}>
                <SettingsList items={c.settings} />
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Ad set settings and targeting ({adsets.length})
        </h2>
        <Table
          minWidth="min-w-[1300px]"
          headers={[
            { label: "Ad set", className: "min-w-52" },
            { label: "Campaign", className: "min-w-44" },
            { label: "Ads" },
            { label: "Delivery & budget", className: "min-w-80" },
            { label: "Targeting", className: "min-w-80" },
          ]}
        >
          {adsets.map(({ campaign, adset }) => (
            <tr key={adset.id} className="hover:bg-slate-50">
              <td className={td}>
                <div className="font-medium">{adset.name}</div>
                <div className="text-xs text-slate-500">ID {adset.id}</div>
              </td>
              <td className={td}>{campaign.name}</td>
              <td className={td}>{adCount(adset.id)}</td>
              <td className={td}>
                <SettingsList items={adset.settings} />
              </td>
              <td className={td}>
                <SettingsList items={adset.targeting} />
              </td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}

/* ---------- page ---------- */

export default function Dashboard() {
  const [accessCode, setAccessCode] = useState("");
  const [data, setData] = useState<LiveAdsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const run = useCallback(async (code: string) => {
    try {
      const res = await fetch("/api/ads", { headers: { "x-access-code": code } });
      if (res.status === 401) throw new Error("Wrong or missing access code.");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      try {
        sessionStorage.setItem(CODE_KEY, code);
      } catch {}
      setAccessCode(code);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ads");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = (code: string) => {
    setLoading(true);
    void run(code);
  };

  useEffect(() => {
    // run() only sets state after the fetch resolves; the rule can't see through the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run(readStoredCode());
  }, [run]);

  const allRows = useMemo<Row[]>(
    () =>
      data?.campaigns.flatMap((campaign) =>
        campaign.adsets.flatMap((adset) =>
          adset.ads.map((ad) => ({ campaign, adset, ad })),
        ),
      ) ?? [],
    [data],
  );
  const rows = useMemo(
    () => allRows.filter((r) => rowMatches(r, query)),
    [allRows, query],
  );

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `live-ads-${data?.account.id ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-[1800px] px-4 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              Live ads{data?.account.name ? ` — ${data.account.name}` : ""}
            </h1>
            {data && (
              <p className="text-sm text-slate-500">
                {data.totals.ads} ads · {data.totals.adsets} ad sets ·{" "}
                {data.totals.campaigns} campaigns · {data.account.currency} ·{" "}
                {data.account.timezone} · fetched{" "}
                {new Date(data.fetchedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="text-sm text-blue-600 underline">
              Chat agent
            </Link>
            <input
              type="password"
              className="w-36 rounded border border-slate-300 bg-white p-1.5 text-sm"
              placeholder="Access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && refresh(accessCode)}
            />
            <button
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              disabled={loading}
              onClick={() => refresh(accessCode)}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={rows.length === 0}
              onClick={download}
            >
              Export CSV
            </button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {data?.truncated && (
          <p className="mb-4 text-sm text-amber-600">
            Showing the first 500 ads only; more live ads exist.
          </p>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-slate-200/70 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                  tab === t.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            className="w-full rounded border border-slate-300 bg-white p-2 text-sm sm:w-96"
            placeholder="Search campaigns, ad sets, ads, copy…"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </div>

        {data && rows.length === 0 ? (
          <p className="text-sm text-slate-500">No live ads match.</p>
        ) : (
          <>
            {tab === "all" && <AllInOneTab rows={rows} />}
            {tab === "copy" && <CopyTab rows={rows} />}
            {tab === "preview" && <PreviewTab rows={rows} />}
            {tab === "settings" && <SettingsTab rows={rows} />}
          </>
        )}
      </main>
    </div>
  );
}

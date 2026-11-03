"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LiveAd,
  LiveAdsResponse,
  Setting,
} from "@/lib/live-ads";

const CODE_KEY = "ads-dashboard-access-code";

function readStoredCode() {
  try {
    return sessionStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(data: LiveAdsResponse) {
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
  ];
  const rows = data.campaigns.flatMap((c) =>
    c.adsets.flatMap((s) =>
      s.ads.map((a) =>
        [
          c.name,
          s.name,
          a.name,
          a.id,
          a.effectiveStatus,
          a.creative.primaryTexts.join(" || "),
          a.creative.headlines.join(" || "),
          a.creative.descriptions.join(" || "),
          a.creative.callToAction ?? "",
          a.creative.links.join(" || "),
          a.creative.urlTags ?? "",
        ]
          .map(csvCell)
          .join(","),
      ),
    ),
  );
  return [header.map(csvCell).join(","), ...rows].join("\n");
}

function matches(ad: LiveAd, campaign: string, adset: string, q: string) {
  if (!q) return true;
  const hay = [
    campaign,
    adset,
    ad.name,
    ...ad.creative.primaryTexts,
    ...ad.creative.headlines,
    ...ad.creative.descriptions,
  ]
    .join("\n")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function SettingsList({ items }: { items: Setting[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {items.map((s) => (
        <div key={s.label} className="contents">
          <dt className="text-zinc-500">{s.label}</dt>
          <dd className="break-words">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TextBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase text-zinc-500">
        {label}
        {values.length > 1 ? ` (${values.length})` : ""}
      </div>
      {values.length === 0 ? (
        <div className="text-sm text-zinc-400">—</div>
      ) : (
        <ul className="space-y-1.5">
          {values.map((v, i) => (
            <li key={i} className="whitespace-pre-wrap text-sm">
              {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdCard({ ad }: { ad: LiveAd }) {
  const c = ad.creative;
  return (
    <div className="flex gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      {c.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.imageUrl}
          alt=""
          className="h-24 w-24 shrink-0 rounded object-cover"
        />
      )}
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-medium">{ad.name}</h4>
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-100">
            {ad.effectiveStatus}
          </span>
          {c.isDynamic && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
              Dynamic creative
            </span>
          )}
          {c.type && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
              {c.type}
            </span>
          )}
        </div>

        <TextBlock label="Primary text" values={c.primaryTexts} />
        <TextBlock label="Headline" values={c.headlines} />
        <TextBlock label="Description" values={c.descriptions} />

        {c.cards.length > 1 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-zinc-500">
              Carousel cards ({c.cards.length})
            </summary>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              {c.cards.map((card, i) => (
                <li key={i}>
                  {[card.headline, card.description].filter(Boolean).join(" — ")}
                </li>
              ))}
            </ol>
          </details>
        )}

        <SettingsList
          items={[
            ...(c.callToAction
              ? [{ label: "Call to action", value: c.callToAction }]
              : []),
            ...(c.links.length
              ? [{ label: "Destination URL", value: c.links.join(", ") }]
              : []),
            ...(c.displayLinks.length
              ? [{ label: "Display link", value: c.displayLinks.join(", ") }]
              : []),
            ...(c.urlTags ? [{ label: "URL parameters", value: c.urlTags }] : []),
            ...(ad.conversionDomain
              ? [{ label: "Conversion domain", value: ad.conversionDomain }]
              : []),
            ...(c.enhancements.length
              ? [{ label: "Creative enhancements", value: c.enhancements.join(", ") }]
              : []),
            { label: "Ad ID", value: ad.id },
            ...(ad.createdTime ? [{ label: "Created", value: ad.createdTime }] : []),
            ...(ad.updatedTime ? [{ label: "Updated", value: ad.updatedTime }] : []),
          ]}
        />

        <div className="flex gap-3 text-xs">
          {ad.previewLink && (
            <a className="underline" href={ad.previewLink} target="_blank" rel="noreferrer">
              Preview
            </a>
          )}
          {c.postUrl && (
            <a className="underline" href={c.postUrl} target="_blank" rel="noreferrer">
              Facebook post
            </a>
          )}
          {c.instagramUrl && (
            <a className="underline" href={c.instagramUrl} target="_blank" rel="noreferrer">
              Instagram post
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [accessCode, setAccessCode] = useState("");
  const [data, setData] = useState<LiveAdsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.campaigns
      .map((c) => ({
        ...c,
        adsets: c.adsets
          .map((s) => ({
            ...s,
            ads: s.ads.filter((a) => matches(a, c.name, s.name, query)),
          }))
          .filter((s) => s.ads.length > 0),
      }))
      .filter((c) => c.adsets.length > 0);
  }, [data, query]);

  const download = () => {
    if (!data) return;
    const blob = new Blob([toCsv(data)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `live-ads-${data.account.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Live ads{data?.account.name ? ` — ${data.account.name}` : ""}
          </h1>
          {data && (
            <p className="text-sm text-zinc-500">
              {data.totals.ads} ads · {data.totals.adsets} ad sets ·{" "}
              {data.totals.campaigns} campaigns · {data.account.currency} ·{" "}
              {data.account.timezone} · fetched{" "}
              {new Date(data.fetchedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className="text-sm underline">
            Chat agent
          </Link>
          <input
            type="password"
            className="w-36 rounded border border-zinc-300 p-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Access code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && refresh(accessCode)}
          />
          <button
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
            disabled={loading}
            onClick={() => refresh(accessCode)}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
            disabled={!data}
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

      <input
        className="mb-6 w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        placeholder="Search campaigns, ad sets, ads, primary text, headlines…"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
      />

      {data && filtered.length === 0 && (
        <p className="text-sm text-zinc-500">No live ads match.</p>
      )}

      <div className="space-y-8">
        {filtered.map((c) => (
          <section key={c.id} className="space-y-4">
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
              <h2 className="mb-2 text-lg font-semibold">{c.name}</h2>
              <SettingsList items={[...c.settings, { label: "Campaign ID", value: c.id }]} />
            </div>

            {c.adsets.map((s) => (
              <div key={s.id} className="ml-0 space-y-3 border-l-2 border-zinc-200 pl-4 md:ml-4 dark:border-zinc-800">
                <div>
                  <h3 className="mb-2 font-medium">{s.name}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SettingsList items={[...s.settings, { label: "Ad set ID", value: s.id }]} />
                    <SettingsList items={s.targeting} />
                  </div>
                  {s.rawTargeting != null && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-zinc-500">
                        Raw targeting JSON
                      </summary>
                      <pre className="mt-1 max-h-64 overflow-auto rounded bg-zinc-100 p-2 dark:bg-zinc-900">
                        {JSON.stringify(s.rawTargeting, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="space-y-3">
                  {s.ads.map((a) => (
                    <AdCard key={a.id} ad={a} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}

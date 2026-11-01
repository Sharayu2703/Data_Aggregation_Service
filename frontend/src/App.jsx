import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownUp, ArrowUpRight, CheckCircle2, Clock3, Globe2, RefreshCw, Search, ShieldCheck, WifiOff } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿" },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone", flag: "🇳🇴" },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽" }
];
const DEFAULT_SYMBOLS = ["EUR", "GBP", "INR", "JPY", "CAD", "AUD", "CHF", "CNY", "SGD", "AED", "NZD"];

function formatRate(value) {
  return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 7 }).format(value);
}
function formatDate(value) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function ageLabel(ms) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? "" : "s"} ago`;
}

export default function App() {
  const [base, setBase] = useState("USD");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const loadRates = useCallback(async (selectedBase = base) => {
    setLoading(true);
    setError("");
    try {
      const symbols = DEFAULT_SYMBOLS.filter((item) => item !== selectedBase).join(",");
      const response = await fetch(`${API_BASE}/api/rates?base=${selectedBase}&symbols=${symbols}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Rates are temporarily unavailable.");
      setData(payload);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err.message || "Unable to load rates.");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { loadRates("USD"); }, []); // initial load
  useEffect(() => {
    const timer = setInterval(() => setLastUpdated(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const rows = useMemo(() => {
    if (!data?.rates) return [];
    return Object.entries(data.rates)
      .map(([code, rate]) => ({ code, rate, currency: CURRENCIES.find((item) => item.code === code) || { code, name: "Currency", flag: "🌐" } }))
      .filter((item) => `${item.code} ${item.currency.name}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data, query]);

  const status = data?.status || "fresh";
  const statusText = status === "stale" ? "Using saved rates" : status === "delayed" ? "Delayed reference data" : "Sources responding";
  const updatedAgo = data?.fetchedAt ? ageLabel(lastUpdated - new Date(data.fetchedAt).getTime()) : "—";

  function changeBase(nextBase) {
    setBase(nextBase);
    loadRates(nextBase);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Ratewise home">
          <span className="brand-mark"><Activity size={19} strokeWidth={2.5} /></span>
          <span>ratewise<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="market-status"><span className="pulse-dot" /> Public reference rates</span>
          <span className="top-divider" />
          <span className="top-label"><ShieldCheck size={15} /> Transparent by design</span>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> CURRENCY EXCHANGE, MADE CLEAR</div>
            <h1>Know the rate.<br /><span>Trust the timing.</span></h1>
            <p className="hero-subtitle">Clear reference rates for wherever life takes you. See where your numbers come from, and exactly how fresh they are.</p>
            <div className="hero-proof">
              <span><CheckCircle2 size={16} /> Multiple public sources</span>
              <span><CheckCircle2 size={16} /> Freshness always visible</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orb orb-one" /><div className="orb orb-two" />
            <div className="visual-card visual-card-back"><span className="mini-label">GLOBAL MARKETS</span><div className="visual-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>
            <div className="visual-card visual-card-front">
              <div className="visual-card-top"><span className="visual-icon"><Globe2 size={17} /></span><span>REFERENCE SNAPSHOT</span><span className="live-pill"><i /> TRACKED</span></div>
              <div className="visual-number">1 <small>USD</small></div>
              <div className="visual-conversion"><span>≈</span> 0.92 <small>EUR</small></div>
              <div className="visual-card-bottom"><span>Indicative rate</span><span><ArrowUpRight size={14} /> View rates</span></div>
            </div>
            <div className="floating-chip"><span className="chip-check"><CheckCircle2 size={14} /></span><span><b>Clarity first</b><small>Source & date shown</small></span></div>
          </div>
        </section>

        <section className="rates-section">
          <div className="section-heading">
            <div><div className="eyebrow section-eyebrow">YOUR RATE BOARD</div><h2>Exchange rates</h2><p>One base currency. Useful rates. No guesswork.</p></div>
            <button className="refresh-button" onClick={() => loadRates()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh rates</button>
          </div>

          <div className="rate-panel">
            <div className="panel-toolbar">
              <div className="base-select-wrap">
                <label htmlFor="base-currency">I want to compare</label>
                <div className="base-select-control">
                  <span className="base-flag">{CURRENCIES.find((item) => item.code === base)?.flag || "🌐"}</span>
                  <select id="base-currency" value={base} onChange={(event) => changeBase(event.target.value)}>
                    {CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}
                  </select>
                  <ArrowDownUp size={16} />
                </div>
              </div>
              <div className="search-wrap"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search currency..." aria-label="Search currencies" /></div>
            </div>

            <div className="data-meta">
              <div className={`freshness freshness-${status}`}>
                {status === "stale" ? <WifiOff size={14} /> : <span className="fresh-dot" />}
                <span>{statusText}</span>
              </div>
              <div className="meta-details"><span><Clock3 size={13} /> Rate date: <b>{formatDate(data?.asOf)}</b></span><span>Updated {updatedAgo}</span></div>
            </div>

            {error && !data && <div className="error-state"><div className="error-icon"><WifiOff size={22} /></div><h3>Rates are taking a break</h3><p>{error} Please try again in a moment.</p><button onClick={() => loadRates()}>Try again <RefreshCw size={14} /></button></div>}
            {error && data && <div className="inline-warning"><WifiOff size={15} /> Could not refresh just now. Showing the last rates we received.</div>}
            {data?.warnings?.length > 0 && <div className="inline-warning"><ShieldCheck size={15} /> {data.warnings[0]}</div>}
            {loading && !data && <div className="loading-state"><span className="loader" /> Connecting to public rate sources…</div>}

            {data && <div className="rates-table-wrap">
              <div className="rates-table-head"><span>CURRENCY</span><span>1 {base} EQUALS</span><span>REFERENCE RATE</span></div>
              {rows.length === 0 ? <div className="empty-state">No currencies match your search.</div> : rows.map((item) => (
                <div className="rate-row" key={item.code}>
                  <div className="currency-cell"><span className="currency-flag">{item.currency.flag}</span><span><b>{item.code}</b><small>{item.currency.name}</small></span></div>
                  <div className="equals-cell">1 {base}</div>
                  <div className="rate-value">{formatRate(item.rate)} <span>{item.code}</span></div>
                </div>
              ))}
            </div>}

            <div className="panel-footer">
              <div className="source-info"><span className="source-icon"><Globe2 size={14} /></span><span><b>Data source</b><small>{data?.source || "Waiting for provider response"}</small></span></div>
              <div className="provider-info">{data?.providers?.filter((provider) => provider.ok).length || 0} of 2 sources responding <span className="provider-dots"><i className={data?.providers?.[0]?.ok ? "ok" : ""} /><i className={data?.providers?.[1]?.ok ? "ok" : ""} /></span></div>
            </div>
          </div>
          <div className="disclaimer"><ShieldCheck size={15} /><span>These are indicative reference rates, not guaranteed transaction prices. Your bank or transfer provider may apply a spread, fees, or a different rate.</span></div>
        </section>

        <section className="trust-strip">
          <div><span className="trust-icon"><Activity size={18} /></span><span><b>Built for reliability</b><small>More than one public source</small></span></div>
          <div><span className="trust-icon"><Clock3 size={18} /></span><span><b>Freshness, upfront</b><small>Observation date always shown</small></span></div>
          <div><span className="trust-icon"><ShieldCheck size={18} /></span><span><b>Honest fallback</b><small>Stale data is clearly labelled</small></span></div>
        </section>
      </main>
      <footer className="footer"><span>© {new Date().getFullYear()} Ratewise</span><span>Clarity over complexity.</span><span>Reference data only</span></footer>
    </div>
  );
}

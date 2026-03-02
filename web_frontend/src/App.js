import React, { useMemo, useState } from "react";
import "./App.css";
import { apiPostJson } from "./api/client";
import {
  extractOffers,
  findCheapestPrice,
  normalizeOffer,
  sortOffers,
} from "./utils/offers";
import OffersList from "./components/OffersList";
import OfferDetailsOverlay from "./components/OfferDetailsOverlay";

const SUPPORTED_SITES = [
  "gameloot.in",
  "gamestheshop.com",
  "gamenation.in",
  "amazon.com",
  "flipkart.com",
];

/**
 * PUBLIC_INTERFACE
 * Main SPA entry: Compare product prices across supported sites.
 *
 * Calls backend endpoint:
 *   POST /api/comparePrices
 *
 * Backend base URL is configured by:
 *   NEXT_PUBLIC_API_BASE_URL
 */
function App() {
  const [query, setQuery] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [selectedSites, setSelectedSites] = useState(() => new Set(SUPPORTED_SITES));
  const [includeOutOfStock, setIncludeOutOfStock] = useState(true);

  const [sortKey, setSortKey] = useState("priceAsc"); // priceAsc|priceDesc|siteAsc|titleAsc
  const [siteFilter, setSiteFilter] = useState("all"); // "all" | site
  const [showOnlyWithPrice, setShowOnlyWithPrice] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [rawResponse, setRawResponse] = useState(null);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const selectedSitesArr = useMemo(() => Array.from(selectedSites), [selectedSites]);

  const cheapestPrice = useMemo(() => findCheapestPrice(offers), [offers]);

  const filteredOffers = useMemo(() => {
    let list = [...offers];

    if (siteFilter !== "all") {
      list = list.filter((o) => o.site === siteFilter);
    }
    if (showOnlyWithPrice) {
      list = list.filter((o) => typeof o.price === "number" && Number.isFinite(o.price));
    }
    if (!includeOutOfStock) {
      list = list.filter((o) => !String(o.availability || "").toLowerCase().includes("out"));
    }

    return sortOffers(list, sortKey);
  }, [offers, siteFilter, showOnlyWithPrice, includeOutOfStock, sortKey]);

  const siteOptions = useMemo(() => {
    const fromOffers = new Set(offers.map((o) => o.site).filter(Boolean));
    // include supported list so dropdown stays stable
    for (const s of SUPPORTED_SITES) fromOffers.add(s);
    return ["all", ...Array.from(fromOffers)];
  }, [offers]);

  // PUBLIC_INTERFACE
  function toggleSite(site) {
    setSelectedSites((prev) => {
      const next = new Set(prev);
      if (next.has(site)) next.delete(site);
      else next.add(site);
      return next;
    });
  }

  function selectAllSites() {
    setSelectedSites(new Set(SUPPORTED_SITES));
  }

  function selectNoSites() {
    setSelectedSites(new Set());
  }

  function resetResults() {
    setRawResponse(null);
    setOffers([]);
    setApiError("");
  }

  async function onCompare(e) {
    e.preventDefault();
    setApiError("");

    const q = query.trim();
    const u = productUrl.trim();

    if (!q && !u) {
      setApiError("Enter a search query or paste a product URL.");
      return;
    }
    if (selectedSites.size === 0) {
      setApiError("Select at least one site to compare.");
      return;
    }

    setIsLoading(true);
    setSelectedOffer(null);

    try {
      // Backend contract can evolve; we send a flexible payload containing both
      // `query` and `url` plus `sites`.
      const payload = {
        query: q || undefined,
        url: u || undefined,
        productUrl: u || undefined,
        sites: selectedSitesArr,
      };

      const res = await apiPostJson("/api/comparePrices", payload);
      setRawResponse(res);

      const extracted = extractOffers(res);
      const normalized = extracted.map(normalizeOffer);

      setOffers(normalized);
    } catch (err) {
      setApiError(err?.message || "Failed to compare prices. Please try again.");
      setRawResponse(err?.payload || null);
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Heuristic: in absence of a reliable error structure in OpenAPI,
  // show partial failures if backend returns arrays like `errors`, `failures`.
  const partialWarnings = useMemo(() => {
    if (!rawResponse || typeof rawResponse !== "object") return [];
    const candidates = [
      rawResponse.errors,
      rawResponse.failures,
      rawResponse.warnings,
      rawResponse.site_errors,
      rawResponse.siteFailures,
    ].filter(Array.isArray);

    if (!candidates.length) return [];
    return candidates.flat().filter(Boolean).map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const site = x.site || x.source || x.vendor || "";
        const msg = x.error || x.message || x.detail || JSON.stringify(x);
        return site ? `${site}: ${msg}` : msg;
      }
      return String(x);
    });
  }, [rawResponse]);

  return (
    <div className="app">
      <div className="navbar" role="banner">
        <div className="nav-inner">
          <div className="brand" aria-label="App brand">
            <div className="brand-mark" aria-hidden="true" />
            <div className="brand-title">
              <strong>PriceCompare Pro</strong>
              <span>Ocean Professional</span>
            </div>
          </div>

          <div className="nav-actions">
            <span className="pill">
              API base:{" "}
              <strong>
                {(process.env.NEXT_PUBLIC_API_BASE_URL || "(same origin)").replace(/\/+$/, "")}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <main className="container">
        <section className="hero">
          <h1>Compare prices across top stores</h1>
          <p>
            Search by keywords or paste a product URL. We’ll fetch offers from supported sites and highlight the cheapest match. Sorting and
            filters help you quickly find the best deal.
          </p>
        </section>

        <section className="grid" aria-label="Compare and results">
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <h2>Compare</h2>
                <p>Provide a query or URL, pick sites, then run a comparison.</p>
              </div>
              <div className="badge">Supported: {SUPPORTED_SITES.length}</div>
            </div>

            <div className="card-body">
              {apiError ? <div className="alert alert-danger">{apiError}</div> : null}

              {partialWarnings.length ? (
                <div className="alert alert-warning">
                  <strong>Partial results:</strong>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {partialWarnings.slice(0, 6).map((w, idx) => (
                      <li key={`${w}-${idx}`}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <form className="form" onSubmit={onCompare}>
                <div className="form-row">
                  <div className="label-row">
                    <label htmlFor="query">Search query</label>
                    <span className="hint">Example: “PS5 controller”</span>
                  </div>
                  <input
                    id="query"
                    className="input"
                    value={query}
                    placeholder="Search keywords (optional if URL is provided)"
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="form-row">
                  <div className="label-row">
                    <label htmlFor="url">Product URL</label>
                    <span className="hint">Paste a store link (optional)</span>
                  </div>
                  <input
                    id="url"
                    className="input"
                    value={productUrl}
                    placeholder="https://..."
                    onChange={(e) => setProductUrl(e.target.value)}
                    autoComplete="off"
                    inputMode="url"
                  />
                </div>

                <div className="form-row">
                  <div className="label-row">
                    <label>Sites</label>
                    <span className="hint">{selectedSites.size} selected</span>
                  </div>

                  <div className="actions">
                    <button type="button" className="btn btn-secondary" onClick={selectAllSites}>
                      Select all
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={selectNoSites}>
                      Clear
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    {SUPPORTED_SITES.map((site) => {
                      const checked = selectedSites.has(site);
                      return (
                        <label
                          key={site}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            fontWeight: 600,
                            color: "var(--ocean-text)",
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSite(site)}
                          />
                          <span>{site}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="actions">
                  <button className="btn" type="submit" disabled={isLoading}>
                    {isLoading ? "Comparing..." : "Compare prices"}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={resetResults} disabled={isLoading}>
                    Reset
                  </button>
                </div>

                <div className="alert">
                  You’ll get best results with a specific URL. If using a query, consider adding brand/model details.
                </div>
              </form>
            </div>

            <div className="toolbar" aria-label="Results controls">
              <div className="toolbar-left">
                <span className="badge">
                  Offers: <strong>{offers.length}</strong>
                </span>
                {cheapestPrice !== null ? (
                  <span className="badge badge-strong">
                    Cheapest: <strong>{cheapestPrice}</strong>
                  </span>
                ) : (
                  <span className="badge">Cheapest: —</span>
                )}
              </div>

              <div className="toolbar-right">
                <label className="visually-hidden" htmlFor="siteFilter">
                  Filter by site
                </label>
                <select
                  id="siteFilter"
                  className="select"
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  disabled={!offers.length}
                >
                  {siteOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "All sites" : s}
                    </option>
                  ))}
                </select>

                <label className="visually-hidden" htmlFor="sortKey">
                  Sort offers
                </label>
                <select
                  id="sortKey"
                  className="select"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  disabled={!offers.length}
                >
                  <option value="priceAsc">Price: low → high</option>
                  <option value="priceDesc">Price: high → low</option>
                  <option value="siteAsc">Site: A → Z</option>
                  <option value="titleAsc">Title: A → Z</option>
                </select>

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--ocean-text-2)" }}>
                  <input
                    type="checkbox"
                    checked={showOnlyWithPrice}
                    onChange={(e) => setShowOnlyWithPrice(e.target.checked)}
                    disabled={!offers.length}
                  />
                  Only priced
                </label>

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--ocean-text-2)" }}>
                  <input
                    type="checkbox"
                    checked={includeOutOfStock}
                    onChange={(e) => setIncludeOutOfStock(e.target.checked)}
                    disabled={!offers.length}
                  />
                  Include OOS
                </label>
              </div>
            </div>

            <div className="card-body">
              {isLoading ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div className="skeleton" />
                  <div className="skeleton" />
                  <div className="skeleton" />
                </div>
              ) : (
                <OffersList
                  offers={filteredOffers}
                  cheapestPrice={cheapestPrice}
                  onOpenDetails={(o) => setSelectedOffer(o)}
                />
              )}
            </div>
          </div>

          <aside className="card">
            <div className="card-header">
              <div className="card-title">
                <h2>How it works</h2>
                <p>Fast overview of what you’re seeing.</p>
              </div>
            </div>

            <div className="card-body">
              <dl>
                <div className="kv">
                  <dt>Cheapest highlight</dt>
                  <dd>Based on numeric price</dd>
                </div>
                <div className="kv">
                  <dt>Partial failures</dt>
                  <dd>Shown as warnings</dd>
                </div>
                <div className="kv">
                  <dt>Details view</dt>
                  <dd>Modal (desktop) / Drawer (mobile)</dd>
                </div>
                <div className="kv">
                  <dt>Sorting & filters</dt>
                  <dd>Price/site/title</dd>
                </div>
              </dl>

              <div className="alert alert-success" style={{ marginTop: 12 }}>
                If you don’t see offers, try turning off “Only priced”, or choose a different site filter.
              </div>

              <div className="footer">
                Backend must expose <code>/api/comparePrices</code> with CORS enabled.
              </div>
            </div>
          </aside>
        </section>
      </main>

      <OfferDetailsOverlay
        offer={selectedOffer}
        cheapestPrice={cheapestPrice}
        onClose={() => setSelectedOffer(null)}
      />
    </div>
  );
}

export default App;

/**
 * Helpers for working with offers coming from the backend.
 * Because backend shape may evolve, these functions are defensive and tolerate
 * different field names.
 */

function asNumber(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function firstString(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * PUBLIC_INTERFACE
 * Try to extract offers array from arbitrary API response.
 * @param {any} response
 * @returns {Array<any>}
 */
export function extractOffers(response) {
  if (!response) return [];

  // Common patterns:
  // - { offers: [...] }
  // - { results: [...] }
  // - { data: { offers: [...] } }
  const direct =
    response.offers ||
    response.results ||
    (response.data && (response.data.offers || response.data.results));

  if (Array.isArray(direct)) return direct;
  return [];
}

/**
 * PUBLIC_INTERFACE
 * Normalize a raw offer object into a stable shape used by the UI.
 * @param {any} raw
 * @returns {{
 *  id: string,
 *  site: string,
 *  title: string,
 *  price: number|null,
 *  currency: string,
 *  url: string,
 *  availability: string,
 *  shipping: string,
 *  raw: any
 * }}
 */
export function normalizeOffer(raw) {
  const site = firstString(raw?.site, raw?.store, raw?.source, raw?.vendor);
  const title = firstString(raw?.title, raw?.name, raw?.product_title, raw?.productName);
  const currency = firstString(raw?.currency, "INR");
  const url = firstString(raw?.url, raw?.product_url, raw?.link);
  const availability = firstString(raw?.availability, raw?.stock, raw?.status);
  const shipping = firstString(raw?.shipping, raw?.shipping_cost, raw?.delivery);

  const price =
    asNumber(raw?.price) ??
    asNumber(raw?.price_value) ??
    asNumber(raw?.amount) ??
    asNumber(raw?.final_price);

  const id =
    firstString(raw?.id, raw?.offer_id) ||
    `${site || "unknown"}::${title || url || Math.random().toString(16).slice(2)}`;

  return { id, site, title, price, currency, url, availability, shipping, raw };
}

/**
 * PUBLIC_INTERFACE
 * Format a price for display.
 * @param {number|null} price
 * @param {string} currency
 */
export function formatPrice(price, currency = "INR") {
  if (price === null) return "—";
  try {
    // INR is typical for the target sites. Still allow other currencies.
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

/**
 * PUBLIC_INTERFACE
 * Find the cheapest offer (by numeric price) in a list.
 * @param {Array<{price:number|null}>} offers
 * @returns {number|null} cheapest price value
 */
export function findCheapestPrice(offers) {
  let cheapest = null;
  for (const o of offers) {
    if (typeof o.price === "number" && Number.isFinite(o.price)) {
      if (cheapest === null || o.price < cheapest) cheapest = o.price;
    }
  }
  return cheapest;
}

/**
 * PUBLIC_INTERFACE
 * Sort offers.
 * @param {Array<any>} offers
 * @param {"priceAsc"|"priceDesc"|"siteAsc"|"titleAsc"} sortKey
 * @returns {Array<any>}
 */
export function sortOffers(offers, sortKey) {
  const copy = [...offers];
  copy.sort((a, b) => {
    if (sortKey === "priceDesc") {
      const ap = a.price ?? Number.POSITIVE_INFINITY;
      const bp = b.price ?? Number.POSITIVE_INFINITY;
      return bp - ap;
    }
    if (sortKey === "siteAsc") return String(a.site).localeCompare(String(b.site));
    if (sortKey === "titleAsc") return String(a.title).localeCompare(String(b.title));
    // priceAsc default
    const ap = a.price ?? Number.POSITIVE_INFINITY;
    const bp = b.price ?? Number.POSITIVE_INFINITY;
    return ap - bp;
  });
  return copy;
}

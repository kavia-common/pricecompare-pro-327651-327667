import React from "react";
import { formatPrice } from "../utils/offers";

/**
 * PUBLIC_INTERFACE
 * List UI for offers (cards).
 */
export default function OffersList({ offers, cheapestPrice, onOpenDetails }) {
  if (!offers.length) {
    return (
      <div className="alert">
        No offers yet. Run a comparison to see results, then sort/filter them here.
      </div>
    );
  }

  return (
    <div className="results" role="list" aria-label="Offers results">
      {offers.map((o) => {
        const isCheapest = typeof o.price === "number" && o.price === cheapestPrice;

        return (
          <div key={o.id} className={`offer ${isCheapest ? "cheapest" : ""}`} role="listitem">
            <div className="offer-main">
              <div className="offer-top">
                <span className="site">{o.site || "Unknown site"}</span>
                {isCheapest ? <span className="badge badge-strong">Cheapest</span> : null}
                {o.availability ? <span className="badge">{o.availability}</span> : null}
              </div>

              <p className="title" title={o.title || ""}>
                {o.title || "—"}
              </p>

              <div className="meta">
                {o.shipping ? <span>Shipping: {o.shipping}</span> : null}
                {o.url ? (
                  <a className="link" href={o.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : (
                  <span className="small">No URL</span>
                )}
              </div>
            </div>

            <div className="offer-right">
              <div className="price">{formatPrice(o.price, o.currency)}</div>
              <button className="btn btn-secondary" onClick={() => onOpenDetails(o)}>
                Details
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

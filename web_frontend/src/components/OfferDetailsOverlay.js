import React, { useEffect, useMemo } from "react";
import { formatPrice } from "../utils/offers";

/**
 * PUBLIC_INTERFACE
 * Offer details overlay. Renders as:
 * - Drawer on small screens
 * - Centered modal on larger screens
 */
export default function OfferDetailsOverlay({ offer, cheapestPrice, onClose }) {
  const isSmall = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  }, []);

  useEffect(() => {
    if (!offer) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [offer, onClose]);

  if (!offer) return null;

  const Wrapper = ({ children }) =>
    isSmall ? (
      <div className="drawer-overlay" role="presentation" onMouseDown={onClose}>
        <div
          className="drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Offer details"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    ) : (
      <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Offer details"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );

  const isCheapest = typeof offer.price === "number" && offer.price === cheapestPrice;

  return (
    <Wrapper>
      <div className="modal-head">
        <div>
          <h3>{offer.site || "Offer"}</h3>
          <p>{offer.title || "—"}</p>
        </div>
        <button className="btn btn-ghost" onClick={onClose} aria-label="Close details">
          Close
        </button>
      </div>

      <div className="modal-body">
        <div className="offer-top">
          {isCheapest ? <span className="badge badge-strong">Cheapest</span> : null}
          {offer.availability ? <span className="badge">{offer.availability}</span> : null}
          {offer.shipping ? <span className="badge">{offer.shipping}</span> : null}
        </div>

        <div>
          <div className="price">{formatPrice(offer.price, offer.currency)}</div>
          <div className="small">
            Currency: <strong>{offer.currency || "—"}</strong>
          </div>
        </div>

        <hr className="sep" />

        <dl>
          <div className="kv">
            <dt>Site</dt>
            <dd>{offer.site || "—"}</dd>
          </div>
          <div className="kv">
            <dt>Title</dt>
            <dd>{offer.title || "—"}</dd>
          </div>
          <div className="kv">
            <dt>URL</dt>
            <dd>
              {offer.url ? (
                <a className="link" href={offer.url} target="_blank" rel="noreferrer">
                  Open product page
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>

        <div className="actions">
          {offer.url ? (
            <a className="btn" href={offer.url} target="_blank" rel="noreferrer">
              View on site
            </a>
          ) : (
            <button className="btn" disabled>
              View on site
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="alert">
          Tip: if a site failed to return a price, it may have blocked scraping or changed its layout. Try again later or paste a more specific
          product URL.
        </div>
      </div>
    </Wrapper>
  );
}

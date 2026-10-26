// Integer screen scale (spec §4). S = largest integer with
// floor(deviceHeight / S) >= 260. The view in art pixels is
// floor(dw/S) x floor(dh/S); leftover (< S device px) is centered.

export const MIN_VIEW_H = 260;
// Narrow (portrait desktop) windows: also keep the view at least this wide,
// otherwise the HUD cannot fit. Never binds on landscape screens.
export const MIN_VIEW_W = 320;

export function computeScale(cssW, cssH, dpr) {
  const dw = Math.max(1, Math.round(cssW * dpr));
  const dh = Math.max(1, Math.round(cssH * dpr));
  const S = Math.max(1, Math.min(Math.floor(dh / MIN_VIEW_H), Math.floor(dw / MIN_VIEW_W)));
  const vw = Math.floor(dw / S), vh = Math.floor(dh / S);
  return {
    dw, dh, dpr, S, vw, vh,
    ox: Math.floor((dw - vw * S) / 2),
    oy: Math.floor((dh - vh * S) / 2),
    // minimum tap target in UI art px: 44 CSS px
    tap: Math.ceil((44 * dpr) / S),
  };
}

// Safe-area insets (CSS px from env()) converted to UI art px.
export function safeInsets(el, dpr, S) {
  if (!el) return { top: 0, right: 0, bottom: 0, left: 0 };
  const cs = getComputedStyle(el);
  const f = (v) => Math.ceil((parseFloat(v) || 0) * dpr / S);
  return { top: f(cs.paddingTop), right: f(cs.paddingRight), bottom: f(cs.paddingBottom), left: f(cs.paddingLeft) };
}

// Integer scales (spec §4, revised for 2x-detail art — see DECISIONS.md).
// UI scale S: largest integer with floor(deviceHeight / S) >= 260 (UI art and
// fonts are authored for this). World scale SW: the same rule at 520, because
// world art is authored at 2x detail, so world pixels are half the size of
// UI pixels. HI = scale for 2x-detail sprites shown inside the UI.
// Leftover (< S device px) around the UI view is centered.

export const MIN_VIEW_H = 260;
// Narrow (portrait desktop) windows: also keep the view at least this wide,
// otherwise the HUD cannot fit. Never binds on landscape screens.
export const MIN_VIEW_W = 320;
export const WORLD_DETAIL = 2;

export function computeScale(cssW, cssH, dpr) {
  const dw = Math.max(1, Math.round(cssW * dpr));
  const dh = Math.max(1, Math.round(cssH * dpr));
  const S = Math.max(1, Math.min(Math.floor(dh / MIN_VIEW_H), Math.floor(dw / MIN_VIEW_W)));
  const vw = Math.floor(dw / S), vh = Math.floor(dh / S);
  const SW = Math.max(1, Math.min(Math.floor(dh / (MIN_VIEW_H * WORLD_DETAIL)), Math.floor(dw / (MIN_VIEW_W * WORLD_DETAIL))));
  return {
    dw, dh, dpr, S, vw, vh, SW,
    HI: Math.max(1, Math.round(S / WORLD_DETAIL)),
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

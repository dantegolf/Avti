import {
  MACOS_DRAG_REGION_HEIGHT,
  MACOS_TITLEBAR_HEIGHT,
  MACOS_TRAFFIC_LIGHT_SAFE_WIDTH,
  WINDOWS_CAPTION_CONTROLS_WIDTH,
  WINDOWS_TITLEBAR_HEIGHT,
} from '../window-chrome.ts'
import { SIDEBAR_COLLAPSED } from './layout-state.ts'

/** Exact Avti mark from assets/avti-logo.svg, embedded so the browser client bundle stays self-contained. */
const AVTI_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect x="7" y="7" width="498" height="498" rx="83" fill="#000"/><path fill="#fff" d="M220 107 215 113 164 234 92 393 98 397 156 397 164 393 255 188 258 188 286 252 337 259 341 262 339 264 246 272 214 344 318 295 339 288 340 291 313 317 313 320 345 393 354 397 413 397 417 395 417 387 393 334 301 111 290 105 226 105ZM448 58 436 53 429 55 378 161 379 164 396 167Z"/></svg>'
const AVTI_LOGO_DATA_URI = `data:image/svg+xml,${encodeURIComponent(AVTI_LOGO_SVG)}`

/** Stable geometry identifiers exposed by the unchanged upstream brand primitives. */
const DEEPSEEK_WORDMARK_VIEWBOX = '0 0 182 24'
const DEEPSEEK_FISH_VIEWBOX = '0 0 23.16 17.04'

/**
 * Branding is intentionally mode-independent: compatibility mode still renders
 * the official sidebar/conversation components, so Avti must decorate those
 * surfaces even when the desktop package does not own the root layout.
 */
const BRANDING_STYLES = `
/* Expanded sidebar: replace the DeepSeek/HARNESS wordmark with Avti. */
button:has(> svg[viewBox="${DEEPSEEK_WORDMARK_VIEWBOX}"]) > svg[viewBox="${DEEPSEEK_WORDMARK_VIEWBOX}"] { display: none; }
button:has(> svg[viewBox="${DEEPSEEK_WORDMARK_VIEWBOX}"])::before {
  content: "";
  flex: none;
  width: 24px;
  height: 24px;
  margin-right: 8px;
  background: url("${AVTI_LOGO_DATA_URI}") center / contain no-repeat;
}
button:has(> svg[viewBox="${DEEPSEEK_WORDMARK_VIEWBOX}"])::after {
  content: "Avti";
  color: inherit;
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* Collapsed sidebar rail: replace only the resting fish; hover still reveals the panel toggle. */
button:has(> svg[viewBox="${DEEPSEEK_FISH_VIEWBOX}"]) > svg[viewBox="${DEEPSEEK_FISH_VIEWBOX}"] { display: none; }
button:has(> svg[viewBox="${DEEPSEEK_FISH_VIEWBOX}"])::before {
  content: "";
  width: 24px;
  height: 24px;
  background: url("${AVTI_LOGO_DATA_URI}") center / contain no-repeat;
}
button:has(> svg[viewBox="${DEEPSEEK_FISH_VIEWBOX}"]):hover::before { display: none; }

/* Blank-session hero: replace fish + Into the Unknown + Preview with Avti + Time to work!. */
div:has(> span > svg[viewBox="${DEEPSEEK_FISH_VIEWBOX}"]) {
  grid-template-columns: 32px auto !important;
}
div:has(> span > svg[viewBox="${DEEPSEEK_FISH_VIEWBOX}"]) > span { display: none !important; }
div:has(> span > svg[viewBox="${DEEPSEEK_FISH_VIEWBOX}"])::before {
  content: "";
  width: 32px;
  height: 32px;
  background: url("${AVTI_LOGO_DATA_URI}") center / contain no-repeat;
}
div:has(> span > svg[viewBox="${DEEPSEEK_FISH_VIEWBOX}"])::after {
  content: "Time to work!";
  color: var(--dsw-alias-label-primary);
  font-size: 26px;
  font-weight: 500;
  line-height: 32px;
  white-space: nowrap;
}
`

/** Advanced-shell stylesheet kept as a plain string so the package client bundle stays self-contained. */
const ADVANCED_STYLES = `
html, body, #root { width: 100%; height: 100%; }
body[data-dsh-desktop-mode="advanced"] { margin: 0; background: transparent !important; }
.dshDesktopFrame { position: relative; display: grid; grid-template-rows: 100%; width: 100%; height: 100%; overflow: hidden; background: transparent; }
.dshDesktopSidebarSurface { --dsw-specific-sidebar-fill: transparent; position: relative; grid-column: 1; grid-row: 1; min-width: 0; overflow: hidden; background: transparent; border-right: 1px solid var(--dsw-alias-border-l1); }
.dshDesktopUpstreamSidebar { box-sizing: border-box; width: 100%; height: 100%; }
.dshDesktopFrame[data-desktop-platform="darwin"] .dshDesktopUpstreamSidebar { padding-top: ${MACOS_TITLEBAR_HEIGHT}px; -webkit-app-region: no-drag; }
.dshDesktopFrame[data-desktop-platform="darwin"][data-sidebar-collapsed] .dshDesktopUpstreamSidebar { width: ${SIDEBAR_COLLAPSED}px; margin: 0 auto; }
.dshDesktopFrame[data-desktop-platform="darwin"] { grid-template-rows: ${MACOS_TITLEBAR_HEIGHT}px minmax(0, 1fr); }
.dshDesktopFrame[data-desktop-platform="darwin"] .dshDesktopSidebarSurface { grid-row: 1 / -1; -webkit-app-region: no-drag; }
.dshDesktopFrame[data-desktop-platform="darwin"] .dshDesktopConversationSurface,
.dshDesktopFrame[data-desktop-platform="darwin"] .dshDesktopDetailsSurface { grid-row: 2; }
.dshDesktopFrame[data-desktop-platform="darwin"] .dshDesktopSidebarSurface::before { content: ""; position: absolute; top: 0; right: 0; left: ${MACOS_TRAFFIC_LIGHT_SAFE_WIDTH}px; height: ${MACOS_DRAG_REGION_HEIGHT}px; user-select: none; -webkit-app-region: drag; }
.dshDesktopMacCaptionRow { position: relative; grid-column: 2 / -1; grid-row: 1; min-width: 0; background: var(--dsw-alias-bg-base); }
.dshDesktopMacCaptionRow::before { content: ""; position: absolute; top: 0; right: 0; left: 0; height: ${MACOS_DRAG_REGION_HEIGHT}px; user-select: none; -webkit-app-region: drag; }
.dshDesktopConversationSurface { grid-column: 2; grid-row: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--dsw-alias-bg-base); }
.dshDesktopDetailsSurface { grid-column: 3; grid-row: 1; min-width: 0; min-height: 0; overflow: hidden; background: var(--dsw-alias-bg-base); border-left: 1px solid var(--dsw-alias-border-l2); }
.dshDesktopFrame[data-desktop-platform="win32"] { grid-template-rows: ${WINDOWS_TITLEBAR_HEIGHT}px minmax(0, 1fr); }
.dshDesktopFrame[data-desktop-platform="win32"] .dshDesktopSidebarSurface { grid-row: 1 / -1; }
.dshDesktopFrame[data-desktop-platform="win32"] .dshDesktopConversationSurface,
.dshDesktopFrame[data-desktop-platform="win32"] .dshDesktopDetailsSurface { grid-row: 2; }
.dshDesktopWindowsCaptionRow { position: relative; grid-column: 2 / -1; grid-row: 1; min-width: 0; background: var(--dsw-alias-bg-base); }
.dshDesktopWindowsCaptionRow::before { content: ""; position: absolute; inset: 0 ${WINDOWS_CAPTION_CONTROLS_WIDTH}px 0 0; user-select: none; -webkit-app-region: drag; }
.dshDesktopFrame[data-sidebar-collapsed] { transition: grid-template-columns var(--ds-transition-duration-slow) var(--ds-ease-in-out); }
.dshDesktopOverlay { position: absolute; z-index: 1000; inset: 0; pointer-events: none; }
.dshDesktopOverlay > * { pointer-events: auto; }
.dshDesktopResizeHandle { position: absolute; z-index: 50; top: 0; bottom: 0; width: 8px; margin-left: -4px; cursor: col-resize; touch-action: none; -webkit-app-region: no-drag; }
.dshDesktopNoDrag, button, input, textarea, select, a, [role="button"], [role="dialog"], [role="presentation"] { -webkit-app-region: no-drag; }
[role="dialog"], [aria-modal="true"] { -webkit-app-region: no-drag !important; }
html:has([aria-modal="true"]) .dshDesktopWindowsCaptionRow::before,
html:has([aria-modal="true"]) .dshDesktopMacCaptionRow::before,
html:has([aria-modal="true"]) .dshDesktopSidebarSurface,
html:has([aria-modal="true"]) .dshDesktopSidebarSurface::before { -webkit-app-region: no-drag !important; }
@media (prefers-reduced-motion: reduce) { .dshDesktopFrame { transition: none !important; } }
`

function installStyles(kind: string, css: string): () => void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-plugin-desktop'
  style.dataset.pluginCss = kind
  style.textContent = css
  document.head.appendChild(style)
  return () => { style.remove() }
}

/** Install Avti product branding in compatibility and advanced desktop modes. */
export function installBrandingStyles(): () => void {
  return installStyles('dsh-plugin-desktop/branding', BRANDING_STYLES)
}

/** Install and remove the advanced shell's global native-window styles. @returns the style disposer. */
export function installAdvancedStyles(): () => void {
  return installStyles('dsh-plugin-desktop/advanced-shell', ADVANCED_STYLES)
}

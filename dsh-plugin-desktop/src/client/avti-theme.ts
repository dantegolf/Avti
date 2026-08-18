/** Avti visual tokens, aligned with AvtiCode while leaving upstream component internals intact. */
export const AVTI_THEME_STYLES = `
:root {
  --avti-bg: #f7f8fb;
  --avti-surface: #ffffff;
  --avti-surface-subtle: #f3f5f9;
  --avti-border: #e6e9f2;
  --avti-text: #0b1120;
  --avti-muted: #5b6475;
  --avti-accent: #6754f5;
  --avti-accent-hover: #5946e8;
  --avti-accent-soft: #f0edff;
  --avti-shadow: 0 4px 16px rgba(11,17,32,.07);
}
body[data-dsh-desktop-mode="advanced"] { background: var(--avti-bg) !important; color: var(--avti-text); }
.dshDesktopSidebarSurface { background: var(--avti-surface) !important; border-right-color: var(--avti-border) !important; }
.dshDesktopConversationSurface, .dshDesktopDetailsSurface, .dshDesktopMacCaptionRow, .dshDesktopWindowsCaptionRow { background: var(--avti-bg) !important; }
.dshDesktopDetailsSurface { border-left-color: var(--avti-border) !important; }
.dshDesktopResizeHandle:hover { background: rgb(103 84 245 / 10%); }
`

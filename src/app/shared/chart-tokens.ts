/**
 * Concrete hex values mirroring the CSS design tokens in `styles.css`.
 *
 * ECharts renders to <canvas>, where CSS custom properties (`var(--primary)`)
 * cannot be resolved. These constants are the single place the chart components
 * reference the palette, so they stay in lockstep with the stylesheet tokens.
 */
export const CHART_COLORS = {
  primary: '#0f9d9d',
  destructive: '#dc2626',
  warning: '#d97706',
  success: '#16a34a',
  foreground: '#1b2126',
  mutedForeground: '#6b7480',
  border: '#e3e8ec',
  borderStrong: '#cfd6dc',
  surface: '#ffffff',
  surface2: '#f1f4f6',
} as const;

export const CHART_FONT_MONO =
  "ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace";

/**
 * Alternating A/B fills for weekday bands in the timeline chart.
 * A = very light grey overlay, B = transparent (chart background shows through).
 */
export const DAY_BAND_FILLS = [
  'rgba(0,0,0,0.04)', // A · Mo
  'transparent',      // B · Di
  'rgba(0,0,0,0.04)', // A · Mi
  'transparent',      // B · Do
  'rgba(0,0,0,0.04)', // A · Fr
] as const;

/** No longer used for color-coded dots; kept for potential future use. */
export const DAY_BAND_ACCENTS = ['#0f9d9d', '#2563eb', '#16a34a', '#f59e0b', '#8b5cf6'] as const;

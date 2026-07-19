// recharts renders raw SVG attributes, so we pass concrete hex values here
// rather than CSS custom properties, keeping them in sync with index.css.
export const severityColors: Record<string, string> = {
  Low: '#34d399',
  Medium: '#fbbf24',
  High: '#fb923c',
  Critical: '#f43f5e',
};

export const chartPalette = {
  violet: '#6d5ce6',
  violetLight: '#9384f2',
  pink: '#f0699e',
  green: '#3ecf8e',
  muted: '#8f90ab',
};

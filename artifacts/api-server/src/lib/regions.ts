/**
 * Ghana's 16 administrative regions.
 * Used for region-based provider filtering.
 */
export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Eastern",
  "Central",
  "Northern",
  "Upper East",
  "Upper West",
  "Volta",
  "Brong-Ahafo",
  "Savannah",
  "Bono East",
  "Ahafo",
  "North East",
  "Oti",
  "Western North",
] as const;

export type GhanaRegion = typeof GHANA_REGIONS[number];

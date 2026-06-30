/** Practice metadata + the option lists derived from the dataset. */
export interface PraxisMeta {
  praxis: string;
  zeitraumVon: string;
  zeitraumBis: string;
  oeffnungszeitenHinweis: string;
  /** Distinct doctor names found in valid rows (sorted). */
  doctors: string[];
  /** Distinct treatment groups found in valid rows (sorted). */
  behandlungen: string[];
  /** ISO Mondays present in the data (sorted ascending). */
  weeks: string[];
}

/**
 * Central API timeouts (milliseconds).
 * Change API_TIMEOUT_MS here only — used by signup, admin, dashboard reads, etc.
 * Radar run stays on RADAR_TIMEOUT_MS (do not fold into the default).
 */
export const API_TIMEOUT_MS = 60_000

/** Radar scans can run much longer than normal API calls — leave alone. */
export const RADAR_TIMEOUT_MS = 120_000

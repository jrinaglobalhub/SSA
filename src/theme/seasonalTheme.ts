export type SeasonalThemeId =
  | "ramadan"
  | "christmas_ice"
  | "new_year"
  | "ice"
  | "monsoon"
  | "sunny"
  | "normal";

export interface RamadanDateRange {
  year: number;
  start: string; // YYYY-MM-DD in Asia/Kolkata
  end: string;   // YYYY-MM-DD in Asia/Kolkata
}

export interface SeasonalThemeConfig {
  id: SeasonalThemeId;
  name: string;
  backgroundColor: string;
  headerBackgroundColor: string;
  headerTextColor: string;
  headerBorderColor: string;
  surfaceColor: string;
  surfaceBorderColor: string;
  inputSurfaceColor: string;
  sectionSurfaceColor: string;
  cardSurfaceColor: string;
  tabBarBackgroundColor: string;
  tabBarInactiveColor: string;
  accentTint: string;
  secondaryTint: string;
  isWinter: boolean;
}

/**
 * Annually configurable Ramadan calendar (Asia/Kolkata local dates).
 * Update or extend entries as official local moon-sighting dates are confirmed.
 * Priority: Ramadan overrides all other seasonal themes when dates overlap.
 */
export const RAMADAN_CALENDAR: RamadanDateRange[] = [
  { year: 2025, start: "2025-03-02", end: "2025-03-31" },
  { year: 2026, start: "2026-02-19", end: "2026-03-20" },
  { year: 2027, start: "2027-02-09", end: "2027-03-10" },
  { year: 2028, start: "2028-01-29", end: "2028-02-27" },
  { year: 2029, start: "2029-01-17", end: "2029-02-15" },
  { year: 2030, start: "2030-01-06", end: "2030-02-04" },
  { year: 2030, start: "2030-12-26", end: "2031-01-24" },
  { year: 2031, start: "2031-12-16", end: "2032-01-14" },
  { year: 2032, start: "2032-12-05", end: "2033-01-02" }
];

export const SEASONAL_THEMES: Record<SeasonalThemeId, SeasonalThemeConfig> = {
  ramadan: {
    id: "ramadan",
    name: "Ramadan",
    backgroundColor: "#F9F7F2",
    headerBackgroundColor: "#FFFFFF",
    headerTextColor: "#0F172A",
    headerBorderColor: "#E2E8F0",
    surfaceColor: "#FFFFFF",
    surfaceBorderColor: "#E2E8F0",
    inputSurfaceColor: "#F1F5F9",
    sectionSurfaceColor: "#FFFFFF",
    cardSurfaceColor: "#FFFFFF",
    tabBarBackgroundColor: "#FFFFFF",
    tabBarInactiveColor: "#64748B",
    accentTint: "#D97706",
    secondaryTint: "#1E293B",
    isWinter: false
  },
  christmas_ice: {
    id: "christmas_ice",
    name: "Christmas & Winter",
    backgroundColor: "#D5E3F2",
    headerBackgroundColor: "#FFFFFF",
    headerTextColor: "#0F172A",
    headerBorderColor: "#DCE6F0",
    surfaceColor: "#E2ECF7",
    surfaceBorderColor: "#B8CCE0",
    inputSurfaceColor: "#F4F8FD",
    sectionSurfaceColor: "#E6EFF8",
    cardSurfaceColor: "#F2F7FC",
    tabBarBackgroundColor: "#FFFFFF",
    tabBarInactiveColor: "#64748B",
    accentTint: "#DC2626",
    secondaryTint: "#166534",
    isWinter: true
  },
  new_year: {
    id: "new_year",
    name: "New Year",
    backgroundColor: "#FAF9FF",
    headerBackgroundColor: "#FFFFFF",
    headerTextColor: "#0F172A",
    headerBorderColor: "#E2E8F0",
    surfaceColor: "#FFFFFF",
    surfaceBorderColor: "#E2E8F0",
    inputSurfaceColor: "#F1F5F9",
    sectionSurfaceColor: "#FFFFFF",
    cardSurfaceColor: "#FFFFFF",
    tabBarBackgroundColor: "#FFFFFF",
    tabBarInactiveColor: "#64748B",
    accentTint: "#EA580C",
    secondaryTint: "#6366F1",
    isWinter: false
  },
  ice: {
    id: "ice",
    name: "Winter",
    backgroundColor: "#D5E3F2",
    headerBackgroundColor: "#FFFFFF",
    headerTextColor: "#0F172A",
    headerBorderColor: "#DCE6F0",
    surfaceColor: "#E2ECF7",
    surfaceBorderColor: "#B8CCE0",
    inputSurfaceColor: "#F4F8FD",
    sectionSurfaceColor: "#E6EFF8",
    cardSurfaceColor: "#F2F7FC",
    tabBarBackgroundColor: "#FFFFFF",
    tabBarInactiveColor: "#64748B",
    accentTint: "#38BDF8",
    secondaryTint: "#94A3B8",
    isWinter: true
  },
  monsoon: {
    id: "monsoon",
    name: "Monsoon & School Reopening",
    backgroundColor: "#F4F8FB",
    headerBackgroundColor: "#FFFFFF",
    headerTextColor: "#0F172A",
    headerBorderColor: "#E2E8F0",
    surfaceColor: "#FFFFFF",
    surfaceBorderColor: "#E2E8F0",
    inputSurfaceColor: "#F1F5F9",
    sectionSurfaceColor: "#FFFFFF",
    cardSurfaceColor: "#FFFFFF",
    tabBarBackgroundColor: "#FFFFFF",
    tabBarInactiveColor: "#64748B",
    accentTint: "#0284C7",
    secondaryTint: "#94A3B8",
    isWinter: false
  },
  sunny: {
    id: "sunny",
    name: "Sunny",
    backgroundColor: "#FFFDF7",
    headerBackgroundColor: "#FFFFFF",
    headerTextColor: "#0F172A",
    headerBorderColor: "#E2E8F0",
    surfaceColor: "#FFFFFF",
    surfaceBorderColor: "#E2E8F0",
    inputSurfaceColor: "#F1F5F9",
    sectionSurfaceColor: "#FFFFFF",
    cardSurfaceColor: "#FFFFFF",
    tabBarBackgroundColor: "#FFFFFF",
    tabBarInactiveColor: "#64748B",
    accentTint: "#F59E0B",
    secondaryTint: "#FDBA74",
    isWinter: false
  },
  normal: {
    id: "normal",
    name: "Normal",
    backgroundColor: "#F8FAFC",
    headerBackgroundColor: "#FFFFFF",
    headerTextColor: "#0F172A",
    headerBorderColor: "#E2E8F0",
    surfaceColor: "#FFFFFF",
    surfaceBorderColor: "#E2E8F0",
    inputSurfaceColor: "#F1F5F9",
    sectionSurfaceColor: "#FFFFFF",
    cardSurfaceColor: "#FFFFFF",
    tabBarBackgroundColor: "#FFFFFF",
    tabBarInactiveColor: "#64748B",
    accentTint: "#EA580C",
    secondaryTint: "#E2E8F0",
    isWinter: false
  }
};

export interface KolkataDateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  isoDate: string; // YYYY-MM-DD
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Extracts YYYY, MM, DD in Asia/Kolkata (UTC+05:30).
 * Uses Intl.DateTimeFormat with Asia/Kolkata and falls back to fixed +05:30 math
 * if the runtime lacks full ICU timezone data.
 */
export function getKolkataDateParts(date: Date = new Date()): KolkataDateParts {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(date);
    const yearStr = parts.find((p) => p.type === "year")?.value;
    const monthStr = parts.find((p) => p.type === "month")?.value;
    const dayStr = parts.find((p) => p.type === "day")?.value;

    if (yearStr && monthStr && dayStr) {
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        return { year, month, day, isoDate: `${year}-${mm}-${dd}` };
      }
    }
  } catch {
    // Fallback to fixed IST (+05:30) offset below
  }

  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth() + 1;
  const day = istDate.getUTCDate();
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return { year, month, day, isoDate: `${year}-${mm}-${dd}` };
}

/**
 * Resolves the active seasonal theme for a given Date using Asia/Kolkata time
 * and the strict priority order:
 * 1. Ramadan  2. Christmas + Ice (Dec 24-26)  3. New Year (Dec 31-Jan 5)
 * 4. Ice (Nov 20-Dec 30)  5. Monsoon + School Reopening (Jun 1-30)
 * 6. Sunny (Mar 1-May 31)  7. Normal
 */
export function resolveSeasonalTheme(
  date: Date = new Date(),
  ramadanRanges: RamadanDateRange[] = RAMADAN_CALENDAR
): SeasonalThemeConfig {
  const { month, day, isoDate } = getKolkataDateParts(date);

  // 1. Ramadan (highest priority, overrides all other themes)
  const isRamadan = ramadanRanges.some(
    (range) => isoDate >= range.start && isoDate <= range.end
  );
  if (isRamadan) {
    return SEASONAL_THEMES.ramadan;
  }

  // 2. Christmas + Ice: Dec 24 – Dec 26 (overrides regular Ice)
  if (month === 12 && day >= 24 && day <= 26) {
    return SEASONAL_THEMES.christmas_ice;
  }

  // 3. New Year: Dec 31 – Jan 5 (across year transitions)
  if ((month === 12 && day === 31) || (month === 1 && day >= 1 && day <= 5)) {
    return SEASONAL_THEMES.new_year;
  }

  // 4. Ice: Nov 20 – Dec 30
  if ((month === 11 && day >= 20) || (month === 12 && day >= 1 && day <= 30)) {
    return SEASONAL_THEMES.ice;
  }

  // 5. Monsoon + School Reopening: June 1 – June 30
  if (month === 6 && day >= 1 && day <= 30) {
    return SEASONAL_THEMES.monsoon;
  }

  // 6. Sunny: March 1 – May 31
  if (month >= 3 && month <= 5) {
    return SEASONAL_THEMES.sunny;
  }

  // 7. Normal: all remaining dates
  return SEASONAL_THEMES.normal;
}

/**
 * Computes milliseconds until the next midnight in Asia/Kolkata (UTC+05:30).
 */
export function getMsUntilNextKolkataMidnight(date: Date = new Date()): number {
  const istNowMs = date.getTime() + IST_OFFSET_MS;
  const msInDay = 24 * 60 * 60 * 1000;
  const msSinceMidnight = ((istNowMs % msInDay) + msInDay) % msInDay;
  return msInDay - msSinceMidnight + 1000; // +1s buffer past midnight
}

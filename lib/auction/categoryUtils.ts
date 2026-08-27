import { Player } from '@/lib/types';

/** Auction proceeds in this order */
export const CATEGORY_ORDER = ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'] as const;
export type Category = typeof CATEGORY_ORDER[number];

/**
 * A category is COMPLETE only when every player in it has status = 'SOLD'.
 * Any UPCOMING, UNSOLD, LIVE, or PENDING player keeps the category open.
 */
export function isCategoryComplete(players: Player[], cat: string): boolean {
  const inCat = players.filter(p => p.category.toUpperCase() === cat.toUpperCase());
  if (inCat.length === 0) return true; // no players in this cat → treated as complete
  return inCat.every(p => p.status === 'SOLD');
}

/**
 * Returns progress stats for a category.
 */
export function getCategoryProgress(players: Player[], cat: string) {
  const inCat = players.filter(p => p.category.toUpperCase() === cat.toUpperCase());
  const sold = inCat.filter(p => p.status === 'SOLD').length;
  const unsold = inCat.filter(p => p.status === 'UNSOLD').length;
  const upcoming = inCat.filter(p => p.status === 'UPCOMING').length;
  const live = inCat.filter(p => p.status === 'LIVE').length;
  return { total: inCat.length, sold, unsold, upcoming, live, players: inCat };
}

/**
 * Returns the currently active category — the first category in H→A order
 * that is NOT yet complete (has at least one non-SOLD player).
 * Returns null if all categories are complete (auction over).
 */
export function getActiveCategory(players: Player[]): string | null {
  for (const cat of CATEGORY_ORDER) {
    if (!isCategoryComplete(players, cat)) {
      return cat;
    }
  }
  return null; // all done
}

/**
 * Returns the next player to auction within the active category:
 * Priority 1: UPCOMING players (by sort_order)
 * Priority 2: UNSOLD players (by sort_order) for re-auction
 * Returns null if no player is available.
 */
export function getNextPlayerInCategory(players: Player[], cat: string): Player | null {
  const upcoming = players
    .filter(p => p.category.toUpperCase() === cat.toUpperCase() && p.status === 'UPCOMING')
    .sort((a, b) => a.sort_order - b.sort_order);

  if (upcoming.length > 0) return upcoming[0];

  const unsold = players
    .filter(p => p.category.toUpperCase() === cat.toUpperCase() && p.status === 'UNSOLD')
    .sort((a, b) => a.sort_order - b.sort_order);

  return unsold.length > 0 ? unsold[0] : null;
}

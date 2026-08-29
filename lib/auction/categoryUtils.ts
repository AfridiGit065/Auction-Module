import { Player } from '@/lib/types';

/** Standard auction progression order (A -> B -> C -> D -> E -> F -> G -> H) */
export const CATEGORY_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type Category = typeof CATEGORY_ORDER[number];

/**
 * A category is COMPLETE only when every player in it has status = 'SOLD'.
 * Any UPCOMING, UNSOLD, LIVE player keeps the category open.
 */
export function isCategoryComplete(players: Player[], cat: string): boolean {
  const inCat = players.filter(p => p.category.toUpperCase() === cat.toUpperCase());
  if (inCat.length === 0) return true; // no players in this cat → treated as complete
  return inCat.every(p => p.status === 'SOLD');
}

/**
 * Checks if a category has any available player to auction (UPCOMING or UNSOLD).
 */
export function hasAvailablePlayersInCategory(players: Player[], cat: string): boolean {
  return players.some(
    p => p.category.toUpperCase() === cat.toUpperCase() && (p.status === 'UPCOMING' || p.status === 'UNSOLD')
  );
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
  const total = inCat.length;
  const isComplete = total > 0 && sold === total;
  const isRound2 = upcoming === 0 && unsold > 0;

  return {
    total,
    sold,
    unsold,
    upcoming,
    live,
    isComplete,
    isRound2,
    players: inCat,
  };
}

/**
 * Returns the next active category:
 * 1. If `currentCatHint` is provided and still has available players (UPCOMING or UNSOLD), keep it.
 * 2. If `currentCatHint` is complete, find the next incomplete category in CATEGORY_ORDER starting after `currentCatHint`.
 * 3. Otherwise, return the first incomplete category in CATEGORY_ORDER.
 */
export function getActiveCategory(players: Player[], currentCatHint?: string | null): string | null {
  if (currentCatHint) {
    const hintUpper = currentCatHint.toUpperCase();
    if (hasAvailablePlayersInCategory(players, hintUpper)) {
      return hintUpper;
    }

    // Hint category is finished -> find the next category after this hint in order
    const hintIdx = CATEGORY_ORDER.indexOf(hintUpper as Category);
    if (hintIdx !== -1) {
      for (let i = hintIdx + 1; i < CATEGORY_ORDER.length; i++) {
        const nextCat = CATEGORY_ORDER[i];
        if (hasAvailablePlayersInCategory(players, nextCat)) {
          return nextCat;
        }
      }
    }
  }

  // Fallback: first category that has available players
  for (const cat of CATEGORY_ORDER) {
    if (hasAvailablePlayersInCategory(players, cat)) {
      return cat;
    }
  }

  // If none have UPCOMING/UNSOLD, check if any category has non-SOLD players (e.g. LIVE)
  for (const cat of CATEGORY_ORDER) {
    if (!isCategoryComplete(players, cat)) {
      return cat;
    }
  }

  return null; // All players sold!
}

export interface NextPlayerResult {
  player: Player;
  round: 'REGULAR' | 'UNSOLD_REAUCTION';
  isUnsoldRound: boolean;
}

/**
 * Returns the next player to auction within a category:
 * - Round 1: UPCOMING players (sorted by sort_order)
 * - Round 2: UNSOLD players (sorted by sort_order) for automatic re-auction
 * Returns null if no player is available in this category.
 */
export function getNextPlayerInCategory(players: Player[], cat: string): NextPlayerResult | null {
  const catUpper = cat.toUpperCase();

  // Round 1: Regular UPCOMING players
  const upcoming = players
    .filter(p => p.category.toUpperCase() === catUpper && p.status === 'UPCOMING')
    .sort((a, b) => a.sort_order - b.sort_order);

  if (upcoming.length > 0) {
    return {
      player: upcoming[0],
      round: 'REGULAR',
      isUnsoldRound: false,
    };
  }

  // Round 2: UNSOLD players (automatic re-auction after all upcoming players in this category finish)
  const unsold = players
    .filter(p => p.category.toUpperCase() === catUpper && p.status === 'UNSOLD')
    .sort((a, b) => a.sort_order - b.sort_order);

  if (unsold.length > 0) {
    return {
      player: unsold[0],
      round: 'UNSOLD_REAUCTION',
      isUnsoldRound: true,
    };
  }

  return null;
}

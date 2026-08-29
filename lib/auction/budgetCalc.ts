import { Team, Player, Settings, AuctionState } from '../types';

export const CATEGORY_ORDER: string[] = ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];

export const CATEGORY_BASE_PRICES: Record<string, number> = {
  H: 5000,
  G: 7000,
  F: 8000,
  E: 10000,
  D: 12000,
  C: 15000,
  B: 18000,
  A: 25000,
};

export interface CalculatedTeam extends Team {
  remaining_balance: number;
  reserved_base_price: number;
  max_bid: number;
  has_bought_in_category: boolean;
}

/**
 * Computes team budgets, remaining balances, future category reserves, max legal bids,
 * and category purchase status.
 *
 * Rule: Each team must buy exactly 1 player per category.
 * For each team, we must reserve enough budget to buy base-price players for every
 * required category where this team has NOT yet bought a player (excluding the current category).
 */
export function computeTeamBudgets(
  teams: Team[],
  players: Player[],
  settings: Settings,
  auctionState: AuctionState
): CalculatedTeam[] {
  // 1. Identify current active player and category
  const currentPlayer = players.find(p => p.id === auctionState.current_player_id);
  const currentCategory = currentPlayer?.category?.toUpperCase();

  // 2. Distinct categories present in the tournament
  const allTournamentCategories = Array.from(
    new Set([
      ...Object.keys(CATEGORY_BASE_PRICES),
      ...players.map(p => p.category.toUpperCase()),
    ])
  );

  return teams.map(team => {
    // Calculate spent directly from sold players for this team
    const teamSoldPlayers = players.filter(
      p => p.sold_to === team.id && p.status === 'SOLD'
    );
    const actualSpent = teamSoldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);

    // Categories where this team has already purchased a player
    const boughtCategories = teamSoldPlayers.map(p => p.category.toUpperCase());

    // Rule: Each team can buy max 1 player per category
    const hasBoughtInCat = currentCategory
      ? boughtCategories.includes(currentCategory)
      : false;

    // Determine which categories this team still MUST purchase in future:
    // Every category in the tournament where team hasn't bought yet, EXCLUDING the currentCategory being bid on right now
    let categoriesToReserve: string[] = [];

    if (currentCategory) {
      categoriesToReserve = allTournamentCategories.filter(
        cat => cat !== currentCategory && !boughtCategories.includes(cat)
      );
    } else {
      // If no player is currently live, reserve for all unbought categories minus 1 (for the next player)
      const unbought = allTournamentCategories.filter(cat => !boughtCategories.includes(cat));
      categoriesToReserve = unbought.length > 1 ? unbought.slice(1) : [];
    }

    // Sum base prices for all categories this team must still buy
    const reservedBasePrice = categoriesToReserve.reduce((sum, cat) => {
      const catPlayers = players.filter(p => p.category.toUpperCase() === cat);
      const catBasePrice = catPlayers.length > 0 ? catPlayers[0].base_price : (CATEGORY_BASE_PRICES[cat] || 5000);
      return sum + catBasePrice;
    }, 0);

    const remainingBalance = Math.max(0, settings.total_budget - actualSpent);
    const maxBid = Math.max(0, remainingBalance - reservedBasePrice);

    return {
      ...team,
      spent: actualSpent,
      remaining_balance: remainingBalance,
      reserved_base_price: reservedBasePrice,
      max_bid: maxBid,
      has_bought_in_category: hasBoughtInCat,
    };
  });
}



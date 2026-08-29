import { Team, Player, Settings, AuctionState } from '../types';

export const CATEGORY_ORDER: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const CATEGORY_BASE_PRICES: Record<string, number> = {
  A: 25000,
  B: 18000,
  C: 15000,
  D: 12000,
  E: 10000,
  F: 8000,
  G: 7000,
  H: 5000,
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

  // 2. Compute Reserved Base Price for FUTURE categories only
  let reservedBasePrice = 0;

  if (currentCategory && CATEGORY_ORDER.includes(currentCategory)) {
    const currentIndex = CATEGORY_ORDER.indexOf(currentCategory);
    // Future categories coming AFTER current category in sequence H -> G -> F -> E -> D -> C -> B -> A
    const futureCategories = CATEGORY_ORDER.slice(currentIndex + 1);

    reservedBasePrice = futureCategories.reduce((sum, cat) => {
      const catPlayers = players.filter(p => p.category.toUpperCase() === cat);
      const catBasePrice = catPlayers.length > 0 ? catPlayers[0].base_price : (CATEGORY_BASE_PRICES[cat] || 0);
      return sum + catBasePrice;
    }, 0);
  } else {
    // If no player is live, find upcoming categories
    const upcomingCategories = Array.from(
      new Set(players.filter(p => p.status === 'UPCOMING').map(p => p.category.toUpperCase()))
    );
    const sortedUpcoming = CATEGORY_ORDER.filter(c => upcomingCategories.includes(c));
    const futureCategories = sortedUpcoming.length > 1 ? sortedUpcoming.slice(1) : [];

    reservedBasePrice = futureCategories.reduce((sum, cat) => {
      const catPlayers = players.filter(p => p.category.toUpperCase() === cat);
      const catBasePrice = catPlayers.length > 0 ? catPlayers[0].base_price : (CATEGORY_BASE_PRICES[cat] || 0);
      return sum + catBasePrice;
    }, 0);
  }

  return teams.map(team => {
    // Calculate spent directly from sold players for this team
    const teamSoldPlayers = players.filter(
      p => p.sold_to === team.id && p.status === 'SOLD'
    );
    const actualSpent = teamSoldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);

    // Rule: Each team can buy max 1 player per category
    const hasBoughtInCat = currentCategory
      ? teamSoldPlayers.some(p => p.category.toUpperCase() === currentCategory)
      : false;

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



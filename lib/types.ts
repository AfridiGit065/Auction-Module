// TypeScript types matching the Supabase DB schema

export interface Settings {
  id: number;
  total_budget: number;
  bid_increment: number;
  countdown_time: number;
  logo_url: string | null;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  spent: number;
  created_at: string;
  // Computed on the fly (not stored)
  remaining_balance?: number;
  reserved_base_price?: number;
  max_bid?: number;
  has_bought_in_category?: boolean;
}

export interface Player {
  id: string;
  name: string;
  category: string;
  position: string;
  base_price: number;
  status: 'UPCOMING' | 'LIVE' | 'SOLD' | 'UNSOLD';
  sold_price: number | null;
  sold_to: string | null;
  photo_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface AuctionState {
  id: number;
  status: 'UPCOMING' | 'LIVE' | 'PAUSED' | 'SOLD' | 'UNSOLD';
  current_player_id: string | null;
  current_bid: number;
  leading_team_id: string | null;
  timer: number;
  timer_active: boolean;
  updated_at: string;
}

export interface Bid {
  id: string;
  player_id: string;
  team_id: string;
  team_name: string;
  amount: number;
  created_at: string;
}

export interface HistoryEntry {
  id: string;
  type: string;
  player_id: string | null;
  player_name: string | null;
  team_id: string | null;
  team_name: string | null;
  amount: number | null;
  notes: string | null;
  created_at: string;
}

// Full enriched state sent to clients
export interface AuctionSnapshot {
  settings: Settings;
  teams: Team[];       // enriched with computed budget fields
  players: Player[];
  auction_state: AuctionState;
  current_player: Player | null;
  leading_team: Team | null;
  bids: Bid[];         // bids for the current player
}

// Image upload types
export type ImageBucket = 'player-photos' | 'team-logos' | 'league-logo';

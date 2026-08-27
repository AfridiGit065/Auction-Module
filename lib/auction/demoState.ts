import { AuctionSnapshot } from '../types';

const now = new Date().toISOString();

export let demoState: AuctionSnapshot = {
  settings: {
    id: 1,
    total_budget: 300000,
    bid_increment: 1000,
    countdown_time: 30,
    logo_url: null,
    updated_at: now,
  },
  teams: [
    { id: 'team-1', name: 'Dewvog Strikers', logo_url: '⚽', spent: 0, created_at: now },
    { id: 'team-2', name: 'Premier Titans', logo_url: '⚡', spent: 0, created_at: now },
    { id: 'team-3', name: 'Crown Kings', logo_url: '👑', spent: 0, created_at: now },
    { id: 'team-4', name: 'Stadium Warriors', logo_url: '🛡️', spent: 0, created_at: now },
    { id: 'team-5', name: 'Falcon United', logo_url: '🦅', spent: 0, created_at: now },
  ],
  players: [
    { id: 'p1', name: 'Player 1 (Cat H)', category: 'H', position: 'Forward', base_price: 5000, status: 'LIVE', sold_price: null, sold_to: null, photo_url: null, sort_order: 1, created_at: now },
    { id: 'p2', name: 'Player 2 (Cat G)', category: 'G', position: 'Forward', base_price: 7000, status: 'UPCOMING', sold_price: null, sold_to: null, photo_url: null, sort_order: 2, created_at: now },
    { id: 'p3', name: 'Player 3 (Cat F)', category: 'F', position: 'Midfielder', base_price: 8000, status: 'UPCOMING', sold_price: null, sold_to: null, photo_url: null, sort_order: 3, created_at: now },
    { id: 'p4', name: 'Player 4 (Cat E)', category: 'E', position: 'Midfielder', base_price: 10000, status: 'UPCOMING', sold_price: null, sold_to: null, photo_url: null, sort_order: 4, created_at: now },
    { id: 'p5', name: 'Player 5 (Cat D)', category: 'D', position: 'Defender', base_price: 12000, status: 'UPCOMING', sold_price: null, sold_to: null, photo_url: null, sort_order: 5, created_at: now },
    { id: 'p6', name: 'Player 6 (Cat C)', category: 'C', position: 'Defender', base_price: 15000, status: 'UPCOMING', sold_price: null, sold_to: null, photo_url: null, sort_order: 6, created_at: now },
    { id: 'p7', name: 'Player 7 (Cat B)', category: 'B', position: 'Goalkeeper', base_price: 18000, status: 'UPCOMING', sold_price: null, sold_to: null, photo_url: null, sort_order: 7, created_at: now },
    { id: 'p8', name: 'Player 8 (Cat A)', category: 'A', position: 'Goalkeeper', base_price: 25000, status: 'UPCOMING', sold_price: null, sold_to: null, photo_url: null, sort_order: 8, created_at: now },
  ],
  auction_state: {
    id: 1,
    status: 'LIVE',
    current_player_id: 'p1',
    current_bid: 5000,
    leading_team_id: 'team-1',
    timer: 30,
    timer_active: true,
    updated_at: now,
  },
  current_player: null,
  leading_team: null,
  bids: [],
};

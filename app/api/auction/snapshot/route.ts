import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { computeTeamBudgets } from '@/lib/auction/budgetCalc';
import { demoState } from '@/lib/auction/demoState';
import { AuctionSnapshot, Settings, Team, Player, AuctionState, Bid } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fallback to local demo mode if Supabase credentials are not added to .env.local yet
    if (!supabase) {
      const settings = demoState.settings;
      const rawTeams = demoState.teams;
      const players = demoState.players;
      const auctionState = demoState.auction_state;

      const teams = computeTeamBudgets(rawTeams, players, settings, auctionState);
      const currentPlayer = players.find(p => p.id === auctionState.current_player_id) || null;
      const leadingTeam = teams.find(t => t.id === auctionState.leading_team_id) || null;

      return NextResponse.json({
        settings,
        teams,
        players,
        auction_state: auctionState,
        current_player: currentPlayer,
        leading_team: leadingTeam,
        bids: demoState.bids,
      });
    }

    // Connected to Supabase
    const [settingsRes, teamsRes, playersRes, stateRes] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 1).single(),
      supabase.from('teams').select('*').order('created_at', { ascending: true }),
      supabase.from('players').select('*').order('sort_order', { ascending: true }),
      supabase.from('auction_state').select('*').eq('id', 1).single(),
    ]);

    if (settingsRes.error || !settingsRes.data) {
      return NextResponse.json({ error: 'Failed to fetch settings from Supabase' }, { status: 500 });
    }

    const settings: Settings = settingsRes.data;
    const rawTeams: Team[] = teamsRes.data || [];
    const players: Player[] = playersRes.data || [];
    const auctionState: AuctionState = stateRes.data || {
      id: 1,
      status: 'UPCOMING',
      current_player_id: null,
      current_bid: 0,
      leading_team_id: null,
      timer: 30,
      timer_active: false,
      updated_at: new Date().toISOString(),
    };

    const teams = computeTeamBudgets(rawTeams, players, settings, auctionState);
    const currentPlayer = players.find(p => p.id === auctionState.current_player_id) || null;
    const leadingTeam = teams.find(t => t.id === auctionState.leading_team_id) || null;

    let bids: Bid[] = [];
    if (auctionState.current_player_id) {
      const bidsRes = await supabase
        .from('bids')
        .select('*')
        .eq('player_id', auctionState.current_player_id)
        .order('created_at', { ascending: true });
      bids = bidsRes.data || [];
    }

    const snapshot: AuctionSnapshot = {
      settings,
      teams,
      players,
      auction_state: auctionState,
      current_player: currentPlayer,
      leading_team: leadingTeam,
      bids,
    };

    return NextResponse.json(snapshot);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

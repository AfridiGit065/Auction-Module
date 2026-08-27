import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { computeTeamBudgets } from '@/lib/auction/budgetCalc';
import { getActiveCategory } from '@/lib/auction/categoryUtils';
import { demoState } from '@/lib/auction/demoState';
import { Settings, Team, Player, AuctionState } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { teamId, amount } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Local Demo Mode if Supabase is not connected yet
    if (!supabase) {
      const settings = demoState.settings;
      const rawTeams = demoState.teams;
      const players = demoState.players;
      const auctionState = demoState.auction_state;

      const currentPlayer = players.find(p => p.id === auctionState.current_player_id);
      if (!currentPlayer) return NextResponse.json({ error: 'No active player' }, { status: 400 });

      const enrichedTeams = computeTeamBudgets(rawTeams, players, settings, auctionState);
      const targetTeam = enrichedTeams.find(t => t.id === teamId);
      if (!targetTeam) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 });

      const minRequired = auctionState.current_bid > 0
        ? auctionState.current_bid + settings.bid_increment
        : currentPlayer.base_price;
      const bidAmount = amount ? Number(amount) : minRequired;

      if (targetTeam.has_bought_in_category) {
        return NextResponse.json({
          error: `Franchise ${targetTeam.name} has already purchased a player in Category ${currentPlayer.category.toUpperCase()}!`
        }, { status: 400 });
      }

      if (bidAmount > targetTeam.max_bid) {
        return NextResponse.json({ error: `Bid exceeds maximum allowable bid (৳${targetTeam.max_bid.toLocaleString()})` }, { status: 400 });
      }

      auctionState.current_bid = bidAmount;
      auctionState.leading_team_id = targetTeam.id;
      demoState.bids.push({
        id: `bid-${Date.now()}`,
        player_id: currentPlayer.id,
        team_id: targetTeam.id,
        team_name: targetTeam.name,
        amount: bidAmount,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, bidAmount, leadingTeam: targetTeam.name });
    }

    // Connected to Supabase
    const [settingsRes, teamsRes, playersRes, stateRes] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 1).single(),
      supabase.from('teams').select('*'),
      supabase.from('players').select('*'),
      supabase.from('auction_state').select('*').eq('id', 1).single(),
    ]);

    const settings: Settings = settingsRes.data;
    const rawTeams: Team[] = teamsRes.data || [];
    const players: Player[] = playersRes.data || [];
    const auctionState: AuctionState = stateRes.data;

    if (!auctionState || auctionState.status !== 'LIVE') {
      return NextResponse.json({ error: `Auction is not LIVE. Current status: ${auctionState?.status || 'UNKNOWN'}` }, { status: 400 });
    }

    const currentPlayer = players.find(p => p.id === auctionState.current_player_id);
    if (!currentPlayer || currentPlayer.status === 'SOLD') {
      return NextResponse.json({ error: 'No active player available for bidding' }, { status: 400 });
    }

    const enrichedTeams = computeTeamBudgets(rawTeams, players, settings, auctionState);
    const targetTeam = enrichedTeams.find(t => t.id === teamId);

    if (!targetTeam) {
      return NextResponse.json({ error: 'Franchise not found' }, { status: 404 });
    }

    const minRequiredBid = auctionState.current_bid > 0
      ? auctionState.current_bid + settings.bid_increment
      : currentPlayer.base_price;

    const bidAmount = amount ? Number(amount) : minRequiredBid;

    if (bidAmount < minRequiredBid) {
      return NextResponse.json({ error: `Bid amount must be at least ৳${minRequiredBid.toLocaleString()}` }, { status: 400 });
    }

    if (targetTeam.has_bought_in_category) {
      return NextResponse.json(
        { error: `Franchise ${targetTeam.name} has already purchased a player in Category ${currentPlayer.category.toUpperCase()}!` },
        { status: 400 }
      );
    }

    if (bidAmount > targetTeam.max_bid) {
      return NextResponse.json(
        { error: `Bid exceeds maximum allowable bid (৳${targetTeam.max_bid.toLocaleString()}) to preserve budget for upcoming players` },
        { status: 400 }
      );
    }

    await supabase.from('bids').insert({
      player_id: currentPlayer.id,
      team_id: targetTeam.id,
      team_name: targetTeam.name,
      amount: bidAmount,
    });

    await supabase
      .from('auction_state')
      .update({
        current_bid: bidAmount,
        leading_team_id: targetTeam.id,
        timer: settings.countdown_time,
        timer_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    await supabase.from('history').insert({
      type: 'BID',
      player_id: currentPlayer.id,
      player_name: currentPlayer.name,
      team_id: targetTeam.id,
      team_name: targetTeam.name,
      amount: bidAmount,
    });

    return NextResponse.json({ success: true, bidAmount, leadingTeam: targetTeam.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}


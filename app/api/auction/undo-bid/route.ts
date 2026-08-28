import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';
import { Settings, AuctionState, Bid } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();

    // Local Demo Mode if Supabase is not connected
    if (!supabase) {
      const auctionState = demoState.auction_state;
      const currentPlayerId = auctionState.current_player_id;
      if (!currentPlayerId) {
        return NextResponse.json({ error: 'No active player on board' }, { status: 400 });
      }

      const playerBids = demoState.bids.filter(b => b.player_id === currentPlayerId);
      if (playerBids.length === 0) {
        return NextResponse.json({ error: 'No bids to undo for the current player' }, { status: 400 });
      }

      // Remove the last bid
      const lastBid = playerBids[playerBids.length - 1];
      demoState.bids = demoState.bids.filter(b => b.id !== lastBid.id);

      const remainingBids = demoState.bids.filter(b => b.player_id === currentPlayerId);
      if (remainingBids.length > 0) {
        const prevBid = remainingBids[remainingBids.length - 1];
        auctionState.current_bid = prevBid.amount;
        auctionState.leading_team_id = prevBid.team_id;
      } else {
        auctionState.current_bid = 0;
        auctionState.leading_team_id = null;
      }

      auctionState.timer = demoState.settings.countdown_time;
      auctionState.timer_active = true;

      return NextResponse.json({
        success: true,
        message: `Undid bid of ৳${lastBid.amount.toLocaleString()} by ${lastBid.team_name}`,
        currentBid: auctionState.current_bid,
        leadingTeamId: auctionState.leading_team_id,
      });
    }

    // Connected to Supabase
    const [stateRes, settingsRes] = await Promise.all([
      supabase.from('auction_state').select('*').eq('id', 1).single(),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ]);

    const auctionState: AuctionState = stateRes.data;
    const settings: Settings = settingsRes.data;

    if (!auctionState || !auctionState.current_player_id) {
      return NextResponse.json({ error: 'No active player on board' }, { status: 400 });
    }

    // Fetch bids for current player ordered by created_at DESC
    const { data: bidsData, error: bidsErr } = await supabase
      .from('bids')
      .select('*')
      .eq('player_id', auctionState.current_player_id)
      .order('created_at', { ascending: false });

    if (bidsErr) {
      return NextResponse.json({ error: bidsErr.message }, { status: 500 });
    }

    const bids: Bid[] = bidsData || [];
    if (bids.length === 0) {
      return NextResponse.json({ error: 'No bids to undo for the current player' }, { status: 400 });
    }

    const lastBid = bids[0];
    const previousBid = bids.length > 1 ? bids[1] : null;

    // Delete the most recent bid
    await supabase.from('bids').delete().eq('id', lastBid.id);

    const newCurrentBid = previousBid ? previousBid.amount : 0;
    const newLeadingTeamId = previousBid ? previousBid.team_id : null;

    // Update auction state
    await supabase
      .from('auction_state')
      .update({
        current_bid: newCurrentBid,
        leading_team_id: newLeadingTeamId,
        timer: settings?.countdown_time || 30,
        timer_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    // Record undo in history
    await supabase.from('history').insert({
      type: 'UNDO_BID',
      player_id: auctionState.current_player_id,
      player_name: '',
      team_id: lastBid.team_id,
      team_name: lastBid.team_name,
      amount: lastBid.amount,
    });

    return NextResponse.json({
      success: true,
      message: `Undid bid of ৳${lastBid.amount.toLocaleString()} by ${lastBid.team_name}`,
      currentBid: newCurrentBid,
      leadingTeamId: newLeadingTeamId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

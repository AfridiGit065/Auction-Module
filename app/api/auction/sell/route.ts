import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';

export async function POST() {
  try {
    const supabase = createAdminClient();

    if (!supabase) {
      const { current_player_id, leading_team_id, current_bid } = demoState.auction_state;
      const player = demoState.players.find(p => p.id === current_player_id);
      const team = demoState.teams.find(t => t.id === leading_team_id);

      if (player && team) {
        player.status = 'SOLD';
        player.sold_price = current_bid;
        player.sold_to = team.id;
        team.spent = demoState.players
          .filter(p => p.sold_to === team.id && p.status === 'SOLD')
          .reduce((sum, p) => sum + (p.sold_price || 0), 0);

        demoState.auction_state.status = 'SOLD';
        demoState.auction_state.timer_active = false;
      }
      return NextResponse.json({ success: true });
    }

    const { data: auctionState } = await supabase.from('auction_state').select('*').eq('id', 1).single();

    if (!auctionState || !auctionState.current_player_id) {
      return NextResponse.json({ error: 'No player loaded on board' }, { status: 400 });
    }
    if (!auctionState.leading_team_id) {
      return NextResponse.json({ error: 'No bids placed yet. Cannot sell.' }, { status: 400 });
    }

    const { data: player } = await supabase.from('players').select('*').eq('id', auctionState.current_player_id).single();
    const { data: team } = await supabase.from('teams').select('*').eq('id', auctionState.leading_team_id).single();

    if (!player || !team) {
      return NextResponse.json({ error: 'Player or Team not found' }, { status: 404 });
    }

    if (player.status === 'SOLD') {
      return NextResponse.json({ error: `Player ${player.name} is already sold.` }, { status: 400 });
    }

    const finalPrice = auctionState.current_bid;

    await supabase.from('players').update({
      status: 'SOLD',
      sold_price: finalPrice,
      sold_to: team.id,
    }).eq('id', player.id);

    await supabase.from('auction_state').update({
      status: 'SOLD',
      timer_active: false,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);

    const { data: teamSoldPlayers } = await supabase
      .from('players')
      .select('sold_price')
      .eq('sold_to', team.id)
      .eq('status', 'SOLD');

    const newSpent = (teamSoldPlayers || []).reduce((sum, p) => sum + (p.sold_price || 0), 0);
    await supabase.from('teams').update({ spent: newSpent }).eq('id', team.id);

    await supabase.from('history').insert({
      type: 'SOLD',
      player_id: player.id,
      player_name: player.name,
      team_id: team.id,
      team_name: team.name,
      amount: finalPrice,
    });

    return NextResponse.json({ success: true, player: player.name, team: team.name, price: finalPrice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

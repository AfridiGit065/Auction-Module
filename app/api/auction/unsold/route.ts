import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';

export async function POST() {
  try {
    const supabase = createAdminClient();

    if (!supabase) {
      const { current_player_id } = demoState.auction_state;
      const player = demoState.players.find(p => p.id === current_player_id);
      if (player) {
        player.status = 'UNSOLD';
        demoState.auction_state.status = 'UNSOLD';
        demoState.auction_state.timer_active = false;
      }
      return NextResponse.json({ success: true });
    }

    const { data: auctionState } = await supabase.from('auction_state').select('*').eq('id', 1).single();

    if (!auctionState || !auctionState.current_player_id) {
      return NextResponse.json({ error: 'No player loaded on board' }, { status: 400 });
    }

    const { data: player } = await supabase.from('players').select('*').eq('id', auctionState.current_player_id).single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    await supabase.from('players').update({
      status: 'UNSOLD',
      sold_price: null,
      sold_to: null,
    }).eq('id', player.id);

    await supabase.from('auction_state').update({
      status: 'UNSOLD',
      timer_active: false,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);

    await supabase.from('history').insert({
      type: 'UNSOLD',
      player_id: player.id,
      player_name: player.name,
    });

    return NextResponse.json({ success: true, player: player.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

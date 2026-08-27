import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';
import { Player } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { playerId } = await req.json();

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!supabase) {
      const players = demoState.players;
      const player = players.find(p => p.id === playerId);
      if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

      player.status = 'LIVE';
      demoState.auction_state.status = 'LIVE';
      demoState.auction_state.current_player_id = playerId;
      demoState.auction_state.current_bid = 0;
      demoState.auction_state.leading_team_id = null;
      demoState.auction_state.timer = demoState.settings.countdown_time;
      demoState.auction_state.timer_active = true;
      demoState.bids = [];

      return NextResponse.json({ success: true, player: player.name, category: player.category });
    }

    // Supabase Mode
    const [playerRes, settingsRes] = await Promise.all([
      supabase.from('players').select('*').eq('id', playerId).single(),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ]);

    const player: Player | null = playerRes.data;
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const countdownTime = settingsRes.data?.countdown_time || 30;

    await supabase.from('players').update({ status: 'LIVE' }).eq('id', playerId);

    await supabase.from('auction_state').update({
      status: 'LIVE',
      current_player_id: playerId,
      current_bid: 0,
      leading_team_id: null,
      timer: countdownTime,
      timer_active: true,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);

    await supabase.from('history').insert({
      type: 'START_PLAYER',
      player_id: player.id,
      player_name: player.name,
    });

    return NextResponse.json({ success: true, player: player.name, category: player.category });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}



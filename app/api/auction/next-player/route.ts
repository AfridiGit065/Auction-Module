import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';
import { getActiveCategory, getNextPlayerInCategory } from '@/lib/auction/categoryUtils';
import { Player, Team } from '@/lib/types';

export async function POST() {
  try {
    const supabase = createAdminClient();

    if (!supabase) {
      // Demo Mode
      const players = demoState.players;

      // 1. Identify the active category (must finish all non-SOLD players in current cat before next unlocks)
      const activeCategory = getActiveCategory(players);

      if (!activeCategory) {
        return NextResponse.json({ error: 'All categories and players in auction have been completed (ALL SOLD)!' }, { status: 400 });
      }

      // 2. Pick next player within the strictly active category (UPCOMING first, then UNSOLD re-auction)
      const targetPlayer = getNextPlayerInCategory(players, activeCategory);

      if (!targetPlayer) {
        return NextResponse.json({
          error: `Category ${activeCategory} is currently active but has no available player to start (check if a player is already LIVE).`
        }, { status: 400 });
      }

      targetPlayer.status = 'LIVE';
      demoState.auction_state.status = 'LIVE';
      demoState.auction_state.current_player_id = targetPlayer.id;
      demoState.auction_state.current_bid = 0;
      demoState.auction_state.leading_team_id = null;
      demoState.auction_state.timer = demoState.settings.countdown_time;
      demoState.auction_state.timer_active = true;
      demoState.bids = [];

      return NextResponse.json({ success: true, player: targetPlayer, category: activeCategory });
    }

    // Supabase Mode
    const [playersRes, settingsRes] = await Promise.all([
      supabase.from('players').select('*'),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ]);

    const players: Player[] = playersRes.data || [];
    const countdownTime = settingsRes.data?.countdown_time || 30;

    // 1. Identify the active category (H -> G -> F -> E -> D -> C -> B -> A)
    const activeCategory = getActiveCategory(players);

    if (!activeCategory) {
      return NextResponse.json({ error: 'All categories and players in auction have been completed (ALL SOLD)!' }, { status: 400 });
    }

    // 2. Pick next player within the strictly active category (UPCOMING first, then UNSOLD re-auction)
    const targetPlayer = getNextPlayerInCategory(players, activeCategory);

    if (!targetPlayer) {
      return NextResponse.json({
        error: `Category ${activeCategory} is currently active but has no available player to start (check if a player is already LIVE).`
      }, { status: 400 });
    }

    await supabase.from('players').update({ status: 'LIVE' }).eq('id', targetPlayer.id);

    await supabase.from('auction_state').update({
      status: 'LIVE',
      current_player_id: targetPlayer.id,
      current_bid: 0,
      leading_team_id: null,
      timer: countdownTime,
      timer_active: true,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);

    await supabase.from('history').insert({
      type: 'START_PLAYER',
      player_id: targetPlayer.id,
      player_name: targetPlayer.name,
    });

    return NextResponse.json({ success: true, player: targetPlayer, category: activeCategory });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}


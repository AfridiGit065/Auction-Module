import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';
import { getActiveCategory, getNextPlayerInCategory } from '@/lib/auction/categoryUtils';
import { Player } from '@/lib/types';

export async function POST(req: Request) {
  try {
    let reqCategory: string | undefined;
    try {
      const body = await req.json();
      if (body && body.category) {
        reqCategory = body.category;
      }
    } catch {
      // Body is optional
    }

    const supabase = createAdminClient();

    if (!supabase) {
      // Demo Mode
      const players = demoState.players;
      const currentPlayer = players.find(p => p.id === demoState.auction_state.current_player_id);
      const catHint = reqCategory || currentPlayer?.category || null;

      // 1. Identify active category (stays in current category if players are available)
      let activeCategory = getActiveCategory(players, catHint);

      if (!activeCategory) {
        return NextResponse.json({
          error: 'All categories and players in the auction have been completed!'
        }, { status: 400 });
      }

      // 2. Pick next player: UPCOMING first (Round 1), then UNSOLD (Round 2 Re-Auction)
      // Pass currentPlayer?.id so unsold round respects serial order
      let nextResult = getNextPlayerInCategory(players, activeCategory, currentPlayer?.id);

      // If active category has no more players, advance to next incomplete category
      if (!nextResult) {
        activeCategory = getActiveCategory(players, null);
        if (activeCategory) {
          nextResult = getNextPlayerInCategory(players, activeCategory);
        }
      }

      if (!nextResult) {
        return NextResponse.json({
          error: `No upcoming or unsold players available to start in Category ${activeCategory}.`
        }, { status: 400 });
      }

      const targetPlayer = nextResult.player;

      // Reset any other players currently marked LIVE back to UPCOMING
      players.forEach(p => {
        if (p.id !== targetPlayer.id && p.status === 'LIVE') {
          p.status = 'UPCOMING';
        }
      });

      targetPlayer.status = 'LIVE';
      demoState.auction_state.status = 'LIVE';
      demoState.auction_state.current_player_id = targetPlayer.id;
      demoState.auction_state.current_bid = 0;
      demoState.auction_state.leading_team_id = null;
      demoState.auction_state.timer = demoState.settings.countdown_time;
      demoState.auction_state.timer_active = true;
      demoState.bids = [];

      return NextResponse.json({
        success: true,
        player: targetPlayer,
        category: activeCategory,
        round: nextResult.round,
        isUnsoldRound: nextResult.isUnsoldRound,
        message: nextResult.isUnsoldRound
          ? `Loaded ${targetPlayer.name} for Round 2 (Unsold Re-Auction in Category ${activeCategory})`
          : `Loaded ${targetPlayer.name} (Category ${activeCategory})`,
      });
    }

    // Supabase Connected Mode
    const [playersRes, settingsRes, stateRes] = await Promise.all([
      supabase.from('players').select('*'),
      supabase.from('settings').select('*').eq('id', 1).single(),
      supabase.from('auction_state').select('*').eq('id', 1).single(),
    ]);

    const players: Player[] = playersRes.data || [];
    const countdownTime = settingsRes.data?.countdown_time || 30;
    const currentState = stateRes.data;

    const currentPlayer = players.find(p => p.id === currentState?.current_player_id);
    const catHint = reqCategory || currentPlayer?.category || null;

    // 1. Identify active category (stays in current category if players are available)
    let activeCategory = getActiveCategory(players, catHint);

    if (!activeCategory) {
      return NextResponse.json({
        error: 'All categories and players in the auction have been completed!'
      }, { status: 400 });
    }

    // 2. Pick next player: UPCOMING first (Round 1), then UNSOLD (Round 2 Re-Auction)
    // Pass currentPlayer?.id so unsold round respects serial order
    let nextResult = getNextPlayerInCategory(players, activeCategory, currentPlayer?.id);

    // If active category has no more players, advance to next incomplete category
    if (!nextResult) {
      activeCategory = getActiveCategory(players, null);
      if (activeCategory) {
        nextResult = getNextPlayerInCategory(players, activeCategory);
      }
    }

    if (!nextResult) {
      return NextResponse.json({
        error: `No upcoming or unsold players available to start in Category ${activeCategory}.`
      }, { status: 400 });
    }

    const targetPlayer = nextResult.player;

    // Reset any other players currently marked LIVE back to UPCOMING
    await supabase.from('players').update({ status: 'UPCOMING' }).eq('status', 'LIVE').neq('id', targetPlayer.id);
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
      notes: nextResult.isUnsoldRound ? `Round 2 Unsold Re-Auction (Cat ${activeCategory})` : `Cat ${activeCategory}`,
    });

    return NextResponse.json({
      success: true,
      player: targetPlayer,
      category: activeCategory,
      round: nextResult.round,
      isUnsoldRound: nextResult.isUnsoldRound,
      message: nextResult.isUnsoldRound
        ? `Loaded ${targetPlayer.name} for Round 2 (Unsold Re-Auction in Category ${activeCategory})`
        : `Loaded ${targetPlayer.name} (Category ${activeCategory})`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';

export async function POST(req: Request) {
  try {
    const { action } = await req.json(); // 'RESET_AUCTION' or 'RESET_ALL'
    const supabase = createAdminClient();

    // 1. DEMO MODE
    if (!supabase) {
      if (action === 'RESET_AUCTION') {
        // Reset all players back to UPCOMING
        demoState.players = demoState.players.map(p => ({
          ...p,
          status: 'UPCOMING',
          sold_price: null,
          sold_to: null,
        }));

        // Reset all teams spent back to 0
        demoState.teams = demoState.teams.map(t => ({
          ...t,
          spent: 0,
        }));

        // Clear bids and reset auction state
        demoState.bids = [];
        demoState.auction_state = {
          id: 1,
          status: 'UPCOMING',
          current_player_id: null,
          current_bid: 0,
          leading_team_id: null,
          timer: demoState.settings.countdown_time || 30,
          timer_active: false,
          updated_at: new Date().toISOString(),
        };

        return NextResponse.json({
          success: true,
          message: 'Auction state reset successfully! All players returned to UPCOMING and budgets restored to full.'
        });
      }

      if (action === 'RESET_ALL') {
        demoState.players = [];
        demoState.teams = [];
        demoState.bids = [];
        demoState.auction_state = {
          id: 1,
          status: 'UPCOMING',
          current_player_id: null,
          current_bid: 0,
          leading_team_id: null,
          timer: 30,
          timer_active: false,
          updated_at: new Date().toISOString(),
        };

        return NextResponse.json({
          success: true,
          message: 'Factory reset completed! All players and franchises have been cleared.'
        });
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // 2. SUPABASE CONNECTED MODE
    if (action === 'RESET_AUCTION') {
      // 1. Clear bids and history
      await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Reset all players to UPCOMING
      await supabase.from('players').update({
        status: 'UPCOMING',
        sold_price: null,
        sold_to: null,
      }).neq('id', '00000000-0000-0000-0000-000000000000');

      // 3. Reset team spending to 0
      await supabase.from('teams').update({
        spent: 0,
      }).neq('id', '00000000-0000-0000-0000-000000000000');

      // 4. Reset auction state
      const { data: settings } = await supabase.from('settings').select('countdown_time').eq('id', 1).single();
      const countdown = settings?.countdown_time || 30;

      await supabase.from('auction_state').update({
        status: 'UPCOMING',
        current_player_id: null,
        current_bid: 0,
        leading_team_id: null,
        timer: countdown,
        timer_active: false,
        updated_at: new Date().toISOString(),
      }).eq('id', 1);

      return NextResponse.json({
        success: true,
        message: 'Auction reset complete! All players are UPCOMING, bids are cleared, and budgets are restored.'
      });
    }

    if (action === 'RESET_ALL') {
      // Wipe everything
      await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      await supabase.from('auction_state').update({
        status: 'UPCOMING',
        current_player_id: null,
        current_bid: 0,
        leading_team_id: null,
        timer: 30,
        timer_active: false,
        updated_at: new Date().toISOString(),
      }).eq('id', 1);

      return NextResponse.json({
        success: true,
        message: 'Factory reset completed! All players, teams, and bids have been wiped clean.'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Reset Error:', err);
    return NextResponse.json({ error: err.message || 'Reset failed' }, { status: 500 });
  }
}

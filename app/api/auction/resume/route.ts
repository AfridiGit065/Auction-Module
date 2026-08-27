import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';

export async function POST() {
  try {
    const supabase = createAdminClient();

    if (!supabase) {
      demoState.auction_state.status = 'LIVE';
      demoState.auction_state.timer_active = true;
      return NextResponse.json({ success: true });
    }

    await supabase.from('auction_state').update({
      status: 'LIVE',
      timer_active: true,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

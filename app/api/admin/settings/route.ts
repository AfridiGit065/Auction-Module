import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';

export async function POST(req: Request) {
  try {
    const { totalBudget, bidIncrement, countdownTime, logoUrl } = await req.json();

    const supabase = createAdminClient();

    if (!supabase) {
      if (totalBudget !== undefined) demoState.settings.total_budget = Number(totalBudget);
      if (bidIncrement !== undefined) demoState.settings.bid_increment = Number(bidIncrement);
      if (countdownTime !== undefined) demoState.settings.countdown_time = Number(countdownTime);
      if (logoUrl !== undefined) demoState.settings.logo_url = logoUrl;
      return NextResponse.json({ success: true });
    }

    const updateData: any = { updated_at: new Date().toISOString() };

    if (totalBudget !== undefined) updateData.total_budget = Number(totalBudget);
    if (bidIncrement !== undefined) updateData.bid_increment = Number(bidIncrement);
    if (countdownTime !== undefined) updateData.countdown_time = Number(countdownTime);
    if (logoUrl !== undefined) updateData.logo_url = logoUrl;

    const { error } = await supabase.from('settings').update(updateData).eq('id', 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

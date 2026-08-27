import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';

export async function GET() {
  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json(demoState.teams);

  const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, name, logoUrl } = body;

    const supabase = createAdminClient();

    if (!supabase) {
      if (action === 'DELETE') {
        demoState.teams = demoState.teams.filter(t => t.id !== id);
      } else if (id) {
        const t = demoState.teams.find(x => x.id === id);
        if (t) {
          t.name = name;
          t.logo_url = logoUrl;
        }
      } else {
        demoState.teams.push({
          id: `team-${Date.now()}`,
          name,
          logo_url: logoUrl || '⚽',
          spent: 0,
          created_at: new Date().toISOString(),
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'DELETE') {
      if (!id) return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (id) {
      const { error } = await supabase.from('teams').update({
        name,
        logo_url: logoUrl,
      }).eq('id', id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    } else {
      const { error } = await supabase.from('teams').insert({
        name,
        logo_url: logoUrl || '⚽',
      });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

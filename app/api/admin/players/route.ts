import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { demoState } from '@/lib/auction/demoState';

export async function GET() {
  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json(demoState.players);

  const { data, error } = await supabase.from('players').select('*').order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, name, category, position, basePrice, photoUrl, sortOrder } = body;

    const supabase = createAdminClient();

    if (!supabase) {
      if (action === 'DELETE') {
        demoState.players = demoState.players.filter(p => p.id !== id);
      } else if (id) {
        const p = demoState.players.find(x => x.id === id);
        if (p) {
          p.name = name;
          p.category = category;
          p.position = position;
          p.base_price = Number(basePrice);
          p.photo_url = photoUrl || null;
          if (sortOrder !== undefined) p.sort_order = Number(sortOrder);
        }
      } else {
        demoState.players.push({
          id: `p-${Date.now()}`,
          name,
          category,
          position,
          base_price: Number(basePrice),
          status: 'UPCOMING',
          sold_price: null,
          sold_to: null,
          photo_url: photoUrl || null,
          sort_order: sortOrder ? Number(sortOrder) : demoState.players.length + 1,
          created_at: new Date().toISOString(),
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'DELETE') {
      if (!id) return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (id) {
      const { error } = await supabase.from('players').update({
        name,
        category,
        position,
        base_price: Number(basePrice),
        photo_url: photoUrl || null,
        sort_order: sortOrder ? Number(sortOrder) : 0,
      }).eq('id', id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    } else {
      const { error } = await supabase.from('players').insert({
        name,
        category,
        position,
        base_price: Number(basePrice),
        photo_url: photoUrl || null,
        sort_order: sortOrder ? Number(sortOrder) : 0,
      });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

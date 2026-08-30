import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucketFolder = (formData.get('folder') as string) || 'player-photos';
    const entityId = (formData.get('id') as string) || `img-${Date.now()}`;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!supabase) {
      // In local mode without Supabase keys, convert file to data URL preview
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${file.type || 'image/png'};base64,${buffer.toString('base64')}`;
      return NextResponse.json({ success: true, url: base64, path: 'local-demo' });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = file.name.split('.').pop() || 'png';
    const cleanEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const filePath = `${bucketFolder}/${cleanEntityId}_${timestamp}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from('dpl_images')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Storage Upload Error:', uploadErr);
      return NextResponse.json({ error: uploadErr.message || 'Failed to upload image to Supabase Storage' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('dpl_images')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    return NextResponse.json({ success: true, url: publicUrl, path: filePath });
  } catch (err: any) {
    console.error('Upload Endpoint Error:', err);
    return NextResponse.json({ error: err.message || 'Upload server error' }, { status: 500 });
  }
}

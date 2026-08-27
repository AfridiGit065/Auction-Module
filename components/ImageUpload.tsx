'use client';

import { useState } from 'react';
import { ImageBucket } from '@/lib/types';

interface ImageUploadProps {
  folder: ImageBucket;
  entityId?: string;
  currentUrl?: string | null;
  onUploadSuccess: (publicUrl: string) => void;
  label?: string;
}

export default function ImageUpload({
  folder,
  entityId,
  currentUrl,
  onUploadSuccess,
  label = 'Upload Image to Supabase Storage',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (.jpg, .png, .webp)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      formData.append('id', entityId || `img-${Date.now()}`);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Upload failed');
      }

      setPreview(data.url);
      onUploadSuccess(data.url);
    } catch (err: any) {
      setError(err.message || 'Upload error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="form-group" style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
      <label style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>{label}</label>

      {preview && (
        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={preview}
            alt="Preview"
            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-neon)' }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)' }}>Image stored in Supabase Storage</span>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="form-control"
        style={{ cursor: 'pointer' }}
      />

      {uploading && <p style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: '4px' }}>Uploading to Supabase Storage...</p>}
      {error && <p style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

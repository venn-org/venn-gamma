import { supabase } from './supabase';

export const MAX_PHOTOS = 6;

// Uploads a local image URI to the photos bucket and returns its public URL.
// Remote URLs are passed through untouched so re-saving doesn't re-upload.
export async function uploadPhoto(uid, uri, label = 'photo') {
  if (!uri) return null;
  if (uri.startsWith('http')) return uri;

  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const filename = `${uid}/${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(filename, blob, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('photos').getPublicUrl(filename);
  return data.publicUrl;
}

// Writes a photo into a specific slot, keeping the array dense so index 0 is
// always the profile photo and the feed's photos[1] stays the flat shot.
export function setPhotoAt(photos, index, url) {
  const next = [...(photos || [])];
  while (next.length < index) next.push(null);
  next[index] = url;
  return next.filter(Boolean);
}

export function removePhotoAt(photos, index) {
  return (photos || []).filter((_, i) => i !== index);
}

import { supabase } from './supabase';

export const MAX_PHOTOS = 3; // profile photos
export const MAX_FLAT_PHOTOS = 6;
export const FLAT_ROOM_LABELS = ['Living Room', 'Bedroom', 'Kitchen', 'Dining Room', 'Bathroom', 'Other'];

// Uploads a local image URI to the photos bucket and returns its public URL.
// Remote URLs are passed through untouched so re-saving doesn't re-upload.
export async function uploadPhoto(uid, uri, label = 'photo') {
  if (!uri) return null;
  if (uri.startsWith('http')) return uri;

  const res = await fetch(uri);
  const blob = await res.blob();
  // Web's ImagePicker returns a blob: URL with no file extension in it, so
  // uri.split('.').pop() would grab the whole URL instead — derive the
  // extension from the blob's actual MIME type, falling back to parsing the
  // URI only for native file:// URIs that do carry a real extension.
  const mimeExt = blob.type?.startsWith('image/') ? blob.type.split('/')[1] : null;
  const ext = mimeExt || uri.split('.').pop()?.split('?')[0] || 'jpg';
  const filename = `${uid}/${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(filename, blob, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('photos').getPublicUrl(filename);
  return data.publicUrl;
}

// Writes a photo into a specific slot, keeping the array dense so index 0
// always stays the profile picture.
export function setPhotoAt(photos, index, url) {
  const next = [...(photos || [])];
  while (next.length < index) next.push(null);
  next[index] = url;
  return next.filter(Boolean);
}

export function removePhotoAt(photos, index) {
  return (photos || []).filter((_, i) => i !== index);
}

// Promotes a photo to slot 0 (the profile picture) while keeping the relative
// order of the rest, so the other slots don't shuffle around unexpectedly.
export function makeProfilePhoto(photos, index) {
  const list = photos || [];
  if (index <= 0 || index >= list.length) return list;
  return [list[index], ...list.filter((_, i) => i !== index)];
}

// Flat photos are {label, url} objects kept at a fixed index (unlike the
// dense profile `photos` array) so each slot always maps to the same
// FLAT_ROOM_LABELS entry, even after another slot is cleared.
export function setFlatPhotoAt(photos, index, url) {
  const next = [...(photos || [])];
  while (next.length <= index) next.push(null);
  next[index] = url ? { label: FLAT_ROOM_LABELS[index], url } : null;
  return next;
}

export function removeFlatPhotoAt(photos, index) {
  const next = [...(photos || [])];
  if (index < next.length) next[index] = null;
  return next;
}

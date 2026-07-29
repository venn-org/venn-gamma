import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { FLAGS } from '../config/flags';
import { warn } from '../lib/log';

/**
 * Every remote photo in the app.
 *
 * The reason this exists rather than react-native's `Image`: RN caches in
 * memory only, so scrolling back to a card — or reopening the app — re-fetches
 * full-size photos. expo-image caches to disk. `transition` gives a fade
 * instead of a pop-in, and `recyclingKey` stops a recycled view from briefly
 * showing the previous card's photo.
 *
 * Server-side resizing is available through the same component but is OFF by
 * default; see FLAGS.supabaseImageTransforms and withTransform below.
 */
function RemoteImage({ uri, width, style, contentFit = 'cover', priority = 'normal', ...rest }) {
  // When a transformed URL fails, fall back to the original object URL rather
  // than rendering nothing. Transformation is a server-side feature that can be
  // toggled outside this codebase, so the component must not assume it works.
  //
  // Storing *which* uri failed rather than a boolean means a new photo gets a
  // fresh attempt without an effect resetting the flag — one failure would
  // otherwise pin every later card in this recycled view to the fallback.
  const [failedUri, setFailedUri] = useState(null);

  if (!uri) return null;

  const useTransform = FLAGS.supabaseImageTransforms && failedUri !== uri;
  const source = useTransform ? withTransform(uri, width) : uri;

  return (
    <Image
      source={{ uri: source }}
      style={style}
      contentFit={contentFit}
      priority={priority}
      transition={180}
      recyclingKey={uri}
      cachePolicy="memory-disk"
      onError={(e) => {
        if (useTransform && source !== uri) {
          warn('Image transform failed, retrying with the original object URL', {
            uri,
            error: e?.error,
          });
          setFailedUri(uri);
          return;
        }
        rest.onError?.(e);
      }}
      {...rest}
    />
  );
}

/**
 * Ask Supabase Storage for a resized variant.
 *
 * IMPORTANT: the `/render/image/` endpoint is a paid Storage add-on. On a
 * project without it every request returns
 *
 *   403 {"error":"FeatureNotEnabled","message":"feature not enabled for this tenant"}
 *
 * which is exactly what happened when this was first switched on unconditionally
 * — the whole feed rendered blank. It stays behind FLAGS.supabaseImageTransforms,
 * and the component falls back to the original URL if a request fails anyway.
 *
 * Only applied to public storage URLs from this project — anything else (a
 * data: URI, a local file:// from the image picker mid-upload, a third-party
 * avatar) is passed through untouched. Requesting a width larger than the
 * source is a no-op server-side, so overshooting is safe.
 */
export function withTransform(uri, width) {
  if (!width || typeof uri !== 'string') return uri;
  if (!uri.includes('/storage/v1/object/public/')) return uri;
  if (uri.includes('?')) return uri; // already parameterised — leave it alone

  const rendered = uri.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  // 2x for retina, capped: past ~1600px the bytes cost more than the sharpness.
  const target = Math.min(Math.round(width * 2), 1600);
  return `${rendered}?width=${target}&quality=75`;
}

export default memo(RemoteImage);

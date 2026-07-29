import { withTransform } from '../RemoteImage';
import { FLAGS } from '../../config/flags';

describe('supabaseImageTransforms flag', () => {
  // Regression guard. Turning this on unconditionally pointed every photo at
  // Supabase's /render/image/ endpoint, which is a paid add-on this project
  // does not have — it answers 403 FeatureNotEnabled, and the entire feed
  // rendered blank. Do not flip this without confirming the endpoint returns
  // 200 for a real object (the curl is in config/flags.js).
  test('is off until the Storage add-on is verified as enabled', () => {
    expect(FLAGS.supabaseImageTransforms).toBe(false);
  });
});

const PUBLIC_URL = 'https://abc.supabase.co/storage/v1/object/public/photos/user-1/photo-123.jpg';

describe('withTransform', () => {
  test('rewrites a Supabase public object URL to the render endpoint', () => {
    const out = withTransform(PUBLIC_URL, 400);
    expect(out).toContain('/storage/v1/render/image/public/');
    expect(out).toContain('width=800'); // 2x for retina
    expect(out).toContain('quality=75');
  });

  test('caps the requested width so huge layouts do not request huge files', () => {
    expect(withTransform(PUBLIC_URL, 2000)).toContain('width=1600');
  });

  test('leaves non-Supabase URLs untouched', () => {
    const external = 'https://lh3.googleusercontent.com/a/avatar.jpg';
    expect(withTransform(external, 400)).toBe(external);
  });

  test('leaves local picker URIs untouched', () => {
    const local = 'file:///var/mobile/tmp/IMG_0001.jpg';
    expect(withTransform(local, 400)).toBe(local);
  });

  test('does not double-parameterise an already-transformed URL', () => {
    const already = `${PUBLIC_URL}?width=100`;
    expect(withTransform(already, 400)).toBe(already);
  });

  test('passes through when no width is known', () => {
    expect(withTransform(PUBLIC_URL, undefined)).toBe(PUBLIC_URL);
  });
});

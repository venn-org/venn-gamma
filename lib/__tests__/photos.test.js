// photos.js also exports uploadPhoto, which pulls in the Supabase client (and
// transitively AsyncStorage) purely through the module import — irrelevant
// to the pure array helpers under test here, so it's mocked out.
jest.mock('../supabase', () => ({ supabase: {} }));

import {
  setPhotoAt,
  removePhotoAt,
  makeProfilePhoto,
  setFlatPhotoAt,
  removeFlatPhotoAt,
  FLAT_ROOM_LABELS,
} from '../photos';

describe('setPhotoAt', () => {
  test('sets slot 0 on an empty array', () => {
    expect(setPhotoAt([], 0, 'a.jpg')).toEqual(['a.jpg']);
  });

  test('appends without leaving holes', () => {
    expect(setPhotoAt(['a.jpg'], 1, 'b.jpg')).toEqual(['a.jpg', 'b.jpg']);
  });

  test('replaces an existing slot in place', () => {
    expect(setPhotoAt(['a.jpg', 'b.jpg'], 0, 'new.jpg')).toEqual(['new.jpg', 'b.jpg']);
  });
});

describe('removePhotoAt', () => {
  test('removes the slot and closes the gap (dense array)', () => {
    expect(removePhotoAt(['a.jpg', 'b.jpg', 'c.jpg'], 1)).toEqual(['a.jpg', 'c.jpg']);
  });

  test('handles an empty/undefined array', () => {
    expect(removePhotoAt(undefined, 0)).toEqual([]);
  });
});

describe('makeProfilePhoto', () => {
  test('promotes the given index to the front, keeping the rest in order', () => {
    expect(makeProfilePhoto(['a.jpg', 'b.jpg', 'c.jpg'], 2)).toEqual(['c.jpg', 'a.jpg', 'b.jpg']);
  });

  test('is a no-op for index 0 (already the profile photo)', () => {
    const photos = ['a.jpg', 'b.jpg'];
    expect(makeProfilePhoto(photos, 0)).toBe(photos);
  });

  test('is a no-op for an out-of-range index', () => {
    const photos = ['a.jpg', 'b.jpg'];
    expect(makeProfilePhoto(photos, 5)).toBe(photos);
  });
});

describe('setFlatPhotoAt / removeFlatPhotoAt', () => {
  test('sets a labeled slot at a fixed index, padding with null before it', () => {
    const result = setFlatPhotoAt([], 2, 'kitchen.jpg');
    expect(result).toEqual([null, null, { label: FLAT_ROOM_LABELS[2], url: 'kitchen.jpg' }]);
  });

  test('clearing a slot nulls it out without shifting the other indices', () => {
    const photos = [
      { label: FLAT_ROOM_LABELS[0], url: 'living.jpg' },
      { label: FLAT_ROOM_LABELS[1], url: 'bedroom.jpg' },
    ];
    expect(removeFlatPhotoAt(photos, 0)).toEqual([
      null,
      { label: FLAT_ROOM_LABELS[1], url: 'bedroom.jpg' },
    ]);
  });
});

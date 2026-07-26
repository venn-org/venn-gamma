import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId, notifyOnboardingComplete } from '../lib/auth';
import { mapUIPrefsToDb, toDb, toUI } from '../lib/enums';
import { upsertFlatDetails } from '../lib/flatDetails';
import { FLAT_ROOM_LABELS } from '../lib/photos';
import { getAge } from '../lib/age';

// Shared state object instance outside the hook so it persists across screen unmounts/mounts
// within the onboarding flow.
let onboardingState = {
  firstName: '',
  lastName: '',
  type: null, // 'seeking' | 'owner'
  city: null,
  zone: null,
  lat: null,
  lng: null,
  birthday: null,
  pronouns: [],
  gender: null,
  lifestyle: { drink: null, tobacco: null, weed: null },
  prefs: { areas: [], budget: null, flatType: null, gender: null },
  photos: { profile: null, flat: [null, null, null] },
};

// Restore from local storage to survive HMR during dev
if (typeof window !== 'undefined') {
  try {
    const saved = window.localStorage.getItem('venn_onboarding_state');
    if (saved) onboardingState = { ...onboardingState, ...JSON.parse(saved) };
  } catch (e) {}
}

// Owners get two extra screens (flat location + flat details) where seekers get
// one (what they're looking for), so the two paths have different lengths.
export const totalSteps = (type) => (type === 'owner' ? 10 : 9);

export function useOnboarding() {
  const [state, setState] = useState(onboardingState);

  const updateData = useCallback((newData) => {
    onboardingState = { ...onboardingState, ...newData };
    setState(onboardingState);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('venn_onboarding_state', JSON.stringify(onboardingState));
    }
  }, []);

  const submitData = async () => {
    const uid = getCurrentUserId();
    if (!uid) throw new Error("Not authenticated");

    // Upload photos if any
    let profilePhotoUrl = null;

    // Upload profile photo. Errors are allowed to propagate (instead of being
    // swallowed) so a failed upload aborts onboarding with a visible error
    // instead of silently completing with photos: null.
    if (onboardingState.photos?.profile) {
      const uri = onboardingState.photos.profile;
      if (uri.startsWith('http')) {
        profilePhotoUrl = uri;
      } else {
        const res = await fetch(uri);
        const blob = await res.blob();
        // Web's ImagePicker returns a blob: URL with no file extension in
        // it, so uri.split('.').pop() would grab the whole URL instead —
        // derive the extension from the blob's actual MIME type, falling
        // back to parsing the URI only for native file:// URIs.
        const mimeExt = blob.type?.startsWith('image/') ? blob.type.split('/')[1] : null;
        const ext = mimeExt || uri.split('.').pop() || 'jpg';
        const filename = `${uid}/profile-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('photos').upload(filename, blob, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from('photos').getPublicUrl(filename);
        profilePhotoUrl = data.publicUrl;
      }
    }

    // Upload flat photos — kept positionally aligned with FLAT_ROOM_LABELS so
    // they line up with the labeled slots in the profile screen's Flat Details section.
    const flatPhotos = [];
    if (onboardingState.photos?.flat) {
      for (let i = 0; i < onboardingState.photos.flat.length; i++) {
        const uri = onboardingState.photos.flat[i];
        if (!uri) continue;
        let url = null;
        if (uri.startsWith('http')) {
          url = uri;
        } else {
          try {
            const res = await fetch(uri);
            const blob = await res.blob();
            const mimeExt = blob.type?.startsWith('image/') ? blob.type.split('/')[1] : null;
            const ext = mimeExt || uri.split('.').pop() || 'jpg';
            const filename = `${uid}/flat-${FLAT_ROOM_LABELS[i]}-${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('photos').upload(filename, blob, { upsert: true });
            if (!error) {
              const { data } = supabase.storage.from('photos').getPublicUrl(filename);
              url = data.publicUrl;
            }
          } catch (e) {
            console.error("Flat photo upload failed", e);
          }
        }
        if (url) {
          flatPhotos[i] = { label: FLAT_ROOM_LABELS[i], url };
        }
      }
    }

    // Map preferences using enums. Onboarding collects a subset; the rest stay
    // null until the user sets them from the preferences sheet.
    const { flatType, ...rest } = onboardingState.prefs || {};
    const dbPrefs = mapUIPrefsToDb({
      ...rest,
      role: toUI('pref_role', onboardingState.type),
      flatType: flatType ? [flatType] : [], // mapUIPrefsToDb expects an array
    });

    const updatePayload = {
      name: `${onboardingState.firstName} ${onboardingState.lastName}`.trim(),
      user_type: onboardingState.type,
      city: onboardingState.city,
      zone: onboardingState.zone,
      lat: onboardingState.lat,
      lng: onboardingState.lng,
      birthday: onboardingState.birthday,
      age: getAge(onboardingState.birthday),
      pronouns: onboardingState.pronouns,
      gender: toDb('gender', onboardingState.gender) || null,

      drink: toDb('lifestyle', onboardingState.lifestyle?.drink) || null,
      tobacco: toDb('lifestyle', onboardingState.lifestyle?.tobacco) || null,
      weed: toDb('lifestyle', onboardingState.lifestyle?.weed) || null,

      areas: onboardingState.prefs?.areas || null,
      budget: toDb('pref_budget', onboardingState.prefs?.budget) || null,
      flat_type: onboardingState.type === 'owner' ? toDb('flat_type', onboardingState.prefs?.flatType) : null,

      ...dbPrefs,

      photos: profilePhotoUrl ? [profilePhotoUrl] : null,
      onboarding_done: true
    };

    // ensureProfile() (lib/auth.js) already inserts a bare row for this uid
    // right after signup, so this row always exists by the time onboarding
    // runs — a plain update, not an upsert.
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', uid);
    if (error) throw error;

    if (onboardingState.type === 'owner' && flatPhotos.length > 0) {
      await upsertFlatDetails(uid, { photos: flatPhotos });
    }

    notifyOnboardingComplete();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('venn_onboarding_state');
    }
    return true;
  };

  return { data: state, updateData, submitData };
}

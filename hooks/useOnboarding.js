import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId, notifyOnboardingComplete } from '../lib/auth';
import { mapUIPrefsToDb, toDb } from '../lib/enums';

// Shared state object instance outside the hook so it persists across screen unmounts/mounts
// within the onboarding flow.
let onboardingState = {
  firstName: '',
  lastName: '',
  type: null, // 'seeking' | 'owner'
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
    let flatPhotoUrls = [];
    
    // Upload profile photo
    if (onboardingState.photos?.profile) {
      const uri = onboardingState.photos.profile;
      if (uri.startsWith('http')) {
        profilePhotoUrl = uri;
      } else {
        try {
          const res = await fetch(uri);
          const blob = await res.blob();
          const ext = uri.split('.').pop() || 'jpg';
          const filename = `${uid}/profile-${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from('photos').upload(filename, blob, { upsert: true });
          if (!error) {
            const { data } = supabase.storage.from('photos').getPublicUrl(filename);
            profilePhotoUrl = data.publicUrl;
          }
        } catch (e) {
          console.error("Profile photo upload failed", e);
        }
      }
    }

    // Upload flat photos
    if (onboardingState.photos?.flat) {
      for (let i = 0; i < onboardingState.photos.flat.length; i++) {
        const uri = onboardingState.photos.flat[i];
        if (!uri) continue;
        if (uri.startsWith('http')) {
          flatPhotoUrls.push(uri);
        } else {
          try {
            const res = await fetch(uri);
            const blob = await res.blob();
            const ext = uri.split('.').pop() || 'jpg';
            const filename = `${uid}/flat-${Date.now()}-${i}.${ext}`;
            const { error } = await supabase.storage.from('photos').upload(filename, blob, { upsert: true });
            if (!error) {
              const { data } = supabase.storage.from('photos').getPublicUrl(filename);
              flatPhotoUrls.push(data.publicUrl);
            }
          } catch (e) {
            console.error("Flat photo upload failed", e);
          }
        }
      }
    }

    // Map preferences using enums
    const dbPrefs = mapUIPrefsToDb({
      role: onboardingState.type === 'seeking' ? '🔍 Looking for a flat' : '🏠 Have a flat / room',
      areas: onboardingState.prefs?.areas || [],
      budget: onboardingState.prefs?.budget || null,
      flatType: onboardingState.prefs?.flatType ? [onboardingState.prefs.flatType] : [], // mapUIPrefsToDb expects array
      gender: onboardingState.prefs?.gender || null,
    });

    const updatePayload = {
      name: `${onboardingState.firstName} ${onboardingState.lastName}`.trim(),
      user_type: onboardingState.type,
      birthday: onboardingState.birthday,
      pronouns: onboardingState.pronouns,
      gender: toDb('gender', onboardingState.gender) || null,
      
      drink: toDb('lifestyle', onboardingState.lifestyle?.drink) || null,
      tobacco: toDb('lifestyle', onboardingState.lifestyle?.tobacco) || null,
      weed: toDb('lifestyle', onboardingState.lifestyle?.weed) || null,
      
      areas: onboardingState.prefs?.areas || null,
      budget: toDb('pref_budget', onboardingState.prefs?.budget) || null,
      flat_type: onboardingState.type === 'owner' ? toDb('flat_type', onboardingState.prefs?.flatType) : null,
      
      ...dbPrefs,
      
      photos: profilePhotoUrl ? [profilePhotoUrl, ...flatPhotoUrls] : (flatPhotoUrls.length > 0 ? flatPhotoUrls : null),
      onboarding_done: true
    };

    const { error } = await supabase.from('profiles').upsert({ id: uid, ...updatePayload });
    if (error) throw error;
    
    notifyOnboardingComplete();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('venn_onboarding_state');
    }
    return true;
  };

  return { data: state, updateData, submitData };
}

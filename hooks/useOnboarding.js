import { useState, useCallback } from 'react';
import { supabase, getCurrentUserId } from '../lib';
import { mapUIPrefsToDb } from '../lib/enums';

// Shared state object instance outside the hook so it persists across screen unmounts/mounts
// within the onboarding flow.
let onboardingState = {
  firstName: '',
  lastName: '',
  type: null, // 'seeking' | 'owner'
  birthday: null, // ISO string
  pronouns: [],
  gender: null,
  
  // Lifestyle + Prefs
  lifestyle: {
    drink: null,
    tobacco: null,
    weed: null,
  },
  prefs: {
    areas: [],
    budget: null,
    flatType: null,
    gender: null,
  },
  
  // Photos
  photos: {
    profile: null,
    flat: [null, null, null],
  },
};

export function useOnboarding() {
  const [state, setState] = useState(onboardingState);

  const updateData = useCallback((newData) => {
    onboardingState = { ...onboardingState, ...newData };
    setState(onboardingState);
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
      gender: onboardingState.gender,
      
      drink: onboardingState.lifestyle?.drink || null,
      tobacco: onboardingState.lifestyle?.tobacco || null,
      weed: onboardingState.lifestyle?.weed || null,
      
      ...dbPrefs,
      
      photos: profilePhotoUrl ? [profilePhotoUrl, ...flatPhotoUrls] : (flatPhotoUrls.length > 0 ? flatPhotoUrls : null),
      onboarding_done: true
    };

    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', uid);
    if (error) throw error;
    
    return true;
  };

  return { data: state, updateData, submitData };
}

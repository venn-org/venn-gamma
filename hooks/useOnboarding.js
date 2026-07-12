import { useState, useCallback } from 'react';
import { supabase, getCurrentUserId } from '../lib';
import { mapUIPrefsToDb } from '../lib/enums';

// Shared state object instance outside the hook so it persists across screen unmounts/mounts
// within the onboarding flow.
let onboardingState = {
  name: '',
  role: null, // 'seeking' | 'owner'
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
    flatType: [],
    moveIn: null,
    gender: null,
    age: null,
    occupation: [],
    food: [],
    smoking: null,
    drinking: null,
    pets: [],
  },
  
  // Photos
  photos: [], // array of URIs
};

export function useOnboarding() {
  // We use state to trigger re-renders, but initialize from the global object
  const [state, setState] = useState(onboardingState);

  const updateField = useCallback((field, value) => {
    onboardingState = { ...onboardingState, [field]: value };
    setState(onboardingState);
  }, []);

  const updateNestedField = useCallback((parent, field, value) => {
    onboardingState = {
      ...onboardingState,
      [parent]: {
        ...onboardingState[parent],
        [field]: value
      }
    };
    setState(onboardingState);
  }, []);

  const saveAll = async () => {
    const uid = getCurrentUserId();
    if (!uid) throw new Error("Not authenticated");

    // Upload photos if any
    const photoUrls = [];
    for (let i = 0; i < onboardingState.photos.length; i++) {
      const uri = onboardingState.photos[i];
      if (uri.startsWith('http')) {
        photoUrls.push(uri); // Already uploaded
      } else {
        // Simple base64 upload for web (in a real app, use FormData for native)
        try {
          const res = await fetch(uri);
          const blob = await res.blob();
          const ext = uri.split('.').pop() || 'jpg';
          const filename = `${uid}/${Date.now()}-${i}.${ext}`;
          
          const { error } = await supabase.storage.from('photos').upload(filename, blob, { upsert: true });
          if (error) throw error;
          
          const { data } = supabase.storage.from('photos').getPublicUrl(filename);
          photoUrls.push(data.publicUrl);
        } catch (e) {
          console.error("Photo upload failed", e);
        }
      }
    }

    // Map preferences using enums
    const dbPrefs = mapUIPrefsToDb({
      role: onboardingState.role === 'seeking' ? '🔍 Looking for a flat' : '🏠 Have a flat / room',
      areas: onboardingState.prefs.areas,
      budget: onboardingState.prefs.budget,
      flatType: onboardingState.prefs.flatType,
      moveIn: onboardingState.prefs.moveIn,
      gender: onboardingState.prefs.gender,
      age: onboardingState.prefs.age,
      occupation: onboardingState.prefs.occupation,
      food: onboardingState.prefs.food,
      smoking: onboardingState.prefs.smoking,
      drinking: onboardingState.prefs.drinking,
      pets: onboardingState.prefs.pets,
    });

    const updatePayload = {
      name: onboardingState.name,
      user_type: onboardingState.role,
      birthday: onboardingState.birthday,
      pronouns: onboardingState.pronouns,
      gender: onboardingState.gender,
      
      drink: onboardingState.lifestyle.drink,
      tobacco: onboardingState.lifestyle.tobacco,
      weed: onboardingState.lifestyle.weed,
      
      ...dbPrefs,
      
      photos: photoUrls.length > 0 ? photoUrls : null,
      onboarding_done: true
    };

    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', uid);
    if (error) throw error;
    
    return true;
  };

  return { state, updateField, updateNestedField, saveAll };
}

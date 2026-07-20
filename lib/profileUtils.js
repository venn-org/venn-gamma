// A profile is only worth showing in the feed once onboarding is done and the
// card has something to render — otherwise it shows up as a blank card.
export function isFeedReady(profile) {
  if (!profile) return false;
  if (profile.onboarding_done === false) return false;
  if (!profile.name?.trim()) return false;
  if (!profile.photos?.[0]) return false;
  return true;
}

export function calculateProfileCompletion(profile) {
  if (!profile) return { percentage: 0, missingText: 'Complete your profile' };
  
  const items = [
    { key: 'name', isComplete: !!profile.name, message: 'Add your name' },
    { key: 'photo1', isComplete: !!profile.photos?.[0], message: 'Add a primary photo' },
    { key: 'photo2', isComplete: !!profile.photos?.[1], message: 'Add a second photo' },
    { key: 'prompt1', isComplete: !!profile.prompts?.[0]?.a, message: 'Add a prompt to get seen more' },
    { key: 'prompt2', isComplete: !!profile.prompts?.[1]?.a, message: 'Add another prompt to complete your profile' },
    { key: 'bio', isComplete: !!profile.bio?.trim(), message: 'Write a short bio' },
    { key: 'location', isComplete: !!profile.location?.trim(), message: 'Add your location' },
    { key: 'gender', isComplete: !!profile.gender, message: 'Add your gender' },
    { key: 'birthday', isComplete: !!profile.birthday, message: 'Add your birthday' },
    { key: 'work', isComplete: !!profile.job_title?.trim(), message: 'Add what you do' },
    { key: 'education', isComplete: !!profile.education_school?.trim(), message: 'Add your school' },
    { key: 'budget', isComplete: profile.budget_max != null || !!profile.budget, message: 'Set your budget' },
    { key: 'areas', isComplete: (profile.pref_areas?.length ?? 0) > 0, message: 'Set your preferred areas' },
  ];

  const total = items.length;
  let completed = 0;
  let firstMissing = null;

  for (const item of items) {
    if (item.isComplete) {
      completed++;
    } else if (!firstMissing) {
      firstMissing = item.message;
    }
  }

  const percentage = Math.round((completed / total) * 100);

  let missingPrompts = 0;
  if (!profile.prompts?.[0]?.a) missingPrompts++;
  if (!profile.prompts?.[1]?.a) missingPrompts++;
  
  let missingText = firstMissing || 'Profile complete';
  
  if (missingPrompts > 0 && !!profile.photos?.[0] && !!profile.photos?.[1]) {
    missingText = `Add ${missingPrompts} more prompt${missingPrompts > 1 ? 's' : ''} to get seen by more people`;
  }

  return { percentage, missingText, isComplete: percentage === 100 };
}

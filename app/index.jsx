import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { auth } from '../lib';

// Root index defers routing to _layout.jsx auth guard to avoid redirect flicker.
// The auth guard will route based on actual auth state once it's known.
export default function Index() {
  // Return nothing while auth state is being determined.
  // _layout.jsx will handle the redirect once it has auth info.
  return null;
}

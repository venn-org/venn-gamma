import { Redirect } from 'expo-router';

// The root index simply redirects to the feed.
// The auth guard in _layout.jsx will intercept this and route to /login or /name
// if the user isn't authenticated or hasn't finished onboarding.
export default function Index() {
  return <Redirect href="/login" />;
}

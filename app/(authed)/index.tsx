import { Redirect } from 'expo-router';

// Authed root just bounces to /forums.
export default function AuthedIndex() {
  return <Redirect href="/forums" />;
}

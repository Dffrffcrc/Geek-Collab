import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { requiresEmailVerification } from '../lib/auth-utils';

export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator color="#efeb45" />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (requiresEmailVerification(user)) return <Redirect href="/verify-email" />;
  return <Redirect href="/forums" />;
}

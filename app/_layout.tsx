import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider } from '../lib/auth';
import { COLORS } from '../lib/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: SpaceMono_400Regular,
    SpecialElite: SpecialElite_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark }}>
        <ActivityIndicator color={COLORS.yellow} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bgDark },
        }}
      />
    </AuthProvider>
  );
}

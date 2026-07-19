import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { AuthProvider } from '../lib/auth';
import { COLORS } from '../lib/theme';

export default function RootLayout() {
  // Kick off bundled-font loading but DO NOT block the app on it. The
  // Google Fonts CDN <link> in app/+html.tsx is the primary source on web
  // and the font-family chain in lib/theme.ts (`SpaceMono, "Space Mono",
  // monospace`) lets the browser pick whichever is ready first. Blocking
  // the whole shell on `fontsLoaded` used to trap users on the spinner
  // when the bundled .ttf 404'd on production.
  useFonts({
    SpaceMono: SpaceMono_400Regular,
    SpecialElite: SpecialElite_400Regular,
  });

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

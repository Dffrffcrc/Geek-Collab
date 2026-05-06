import { useState, useEffect, useRef } from 'react';
import { Slot, Redirect } from 'expo-router';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../lib/auth';
import { COLORS } from '../../lib/theme';
import { Topbar } from '../../components/Topbar';
import { Sidebar } from '../../components/Sidebar';
import { MenuIcon } from '../../components/Icons';

const SIDEBAR_WIDTH = 240;
const RAIL_WIDTH = 50;        // width of the left rail when sidebar is closed
const SIDEBAR_KEY = 'geekcollab.sidebarOpen';
const ANIM_DURATION = 240;

export default function AuthedLayout() {
  const { user, initializing } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SIDEBAR_KEY) !== 'false';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  // Single animated value drives the entire transition. 0 = closed (rail
  // only), 1 = open (full sidebar visible).
  const openness = useRef(new Animated.Value(sidebarOpen ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(openness, {
      toValue: sidebarOpen ? 1 : 0,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [sidebarOpen, openness]);

  // The "left zone" stays visible at all times. When closed, it's just a
  // narrow rail with the vertical separator + toggle button on it; when
  // open, it expands to host the full sidebar.
  const leftZoneWidth = openness.interpolate({
    inputRange: [0, 1],
    outputRange: [RAIL_WIDTH, SIDEBAR_WIDTH],
  });
  // Sidebar contents fade in only after the zone has expanded a bit, so we
  // don't see a clipped, half-rendered sidebar mid-animation.
  const sidebarOpacity = openness.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });
  // Toggle is centered on the right edge of the left zone (the vertical line).
  const toggleLeft = openness.interpolate({
    inputRange: [0, 1],
    outputRange: [RAIL_WIDTH - 22, SIDEBAR_WIDTH - 22],
  });

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.yellow} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (!user.emailVerified) return <Redirect href="/verify-email" />;

  return (
    <View style={styles.shell}>
      <Topbar />
      <View style={styles.body}>
        {/* Left zone: animates between rail (50) and full sidebar (240). The
            vertical separator line is the right border of this zone. */}
        <Animated.View style={[styles.leftZone, { width: leftZoneWidth }]}>
          <Animated.View style={[styles.sidebarHost, { opacity: sidebarOpacity }]}>
            <Sidebar />
          </Animated.View>
        </Animated.View>

        <View style={styles.content}>
          <Slot />
        </View>

        {/* Toggle button rides the right edge of the left zone. */}
        <Animated.View style={[styles.togglePos, { left: toggleLeft }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.toggle}
            onPress={() => setSidebarOpen((o) => !o)}
            activeOpacity={0.8}
            accessibilityLabel={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <MenuIcon size={18} color={COLORS.yellow} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark },
  shell: { flex: 1, backgroundColor: COLORS.bgDark },
  body: { flex: 1, flexDirection: 'row' },
  leftZone: {
    overflow: 'hidden',
    backgroundColor: COLORS.bgDark,
    borderRightWidth: 1,
    borderRightColor: COLORS.separator,
  },
  sidebarHost: {
    position: 'absolute',
    width: SIDEBAR_WIDTH,
    height: '100%',
    left: 0,
    top: 0,
  },
  content: { flex: 1, backgroundColor: COLORS.bgDark, paddingLeft: 24 },
  togglePos: {
    position: 'absolute',
    top: 16,
    zIndex: 10,
  },
  toggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    backgroundColor: COLORS.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

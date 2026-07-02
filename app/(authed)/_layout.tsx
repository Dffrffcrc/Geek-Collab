import { useState, useEffect, useRef } from 'react';
import { Slot, Redirect } from 'expo-router';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../../lib/auth';
import { COLORS } from '../../lib/theme';
import { Topbar } from '../../components/Topbar';
import { Sidebar } from '../../components/Sidebar';
import { MenuIcon } from '../../components/Icons';

const SIDEBAR_WIDTH = 240;
const MOBILE_SIDEBAR_WIDTH = 280;
const RAIL_WIDTH = 50;
const SIDEBAR_KEY = 'geekcollab.sidebarOpen';
const ANIM_DURATION = 240;

export default function AuthedLayout() {
  const { user, initializing } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 920;

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(SIDEBAR_KEY);
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(stored !== 'false');
    }
    setHydrated(true);
  }, [isMobile]);
  useEffect(() => {
    if (typeof window === 'undefined' || !hydrated || isMobile) return;
    window.localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
  }, [sidebarOpen, hydrated, isMobile]);

  const openness = useRef(new Animated.Value(sidebarOpen ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(openness, {
      toValue: sidebarOpen ? 1 : 0,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [sidebarOpen, openness]);

  const leftZoneWidth = openness.interpolate({
    inputRange: [0, 1],
    outputRange: isMobile ? [0, MOBILE_SIDEBAR_WIDTH] : [RAIL_WIDTH, SIDEBAR_WIDTH],
  });
  const sidebarOpacity = openness.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });
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
        {!isMobile && (
          <Animated.View style={[styles.leftZone, { width: leftZoneWidth }]}>
            <Animated.View style={[styles.sidebarHost, { opacity: sidebarOpacity }]}>
              <Sidebar />
            </Animated.View>
          </Animated.View>
        )}

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          <Slot />
        </View>

        {isMobile && sidebarOpen && (
          <TouchableOpacity
            style={styles.mobileBackdrop}
            activeOpacity={1}
            onPress={() => setSidebarOpen(false)}
          />
        )}

        {isMobile && (
          <Animated.View
            style={[
              styles.mobileSidebar,
              { width: leftZoneWidth, opacity: sidebarOpacity },
            ]}
            pointerEvents={sidebarOpen ? 'auto' : 'none'}
          >
            <Sidebar />
          </Animated.View>
        )}

        <Animated.View
          style={[styles.togglePos, isMobile ? styles.togglePosMobile : { left: toggleLeft }]}
          pointerEvents="box-none"
        >
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
  contentMobile: { paddingLeft: 0 },
  mobileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 8,
  },
  mobileSidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 9,
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: COLORS.separator,
    backgroundColor: COLORS.bgDark,
  },
  togglePos: {
    position: 'absolute',
    top: 16,
    zIndex: 10,
  },
  togglePosMobile: {
    left: 12,
    top: 12,
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

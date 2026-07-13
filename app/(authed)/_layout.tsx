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
import { Sidebar, SidebarContent } from '../../components/Sidebar';
import { requiresEmailVerification } from '../../lib/auth-utils';

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
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pendingNavigation = useRef<null | (() => void)>(null);
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
    if (sidebarOpen) setMobileDrawerVisible(true);
    Animated.timing(openness, {
      toValue: sidebarOpen ? 1 : 0,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      if (!sidebarOpen && pendingNavigation.current) {
        const action = pendingNavigation.current;
        pendingNavigation.current = null;
        setMobileDrawerVisible(false);
        action();
        return;
      }
      if (!sidebarOpen) {
        setMobileDrawerVisible(false);
      }
    });
  }, [sidebarOpen, openness]);

  const leftZoneWidth = openness.interpolate({
    inputRange: [0, 1],
    outputRange: isMobile ? [0, MOBILE_SIDEBAR_WIDTH] : [RAIL_WIDTH, SIDEBAR_WIDTH],
  });
  const sidebarOpacity = openness.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.yellow} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (requiresEmailVerification(user)) return <Redirect href="/verify-email" />;

  return (
    <View style={styles.shell}>
      <Topbar
        showMenuButton={isMobile}
        onMenuPress={() => {
          if (!sidebarOpen) setMobileDrawerVisible(true);
          setSidebarOpen((open) => !open);
        }}
      />
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
      </View>

      {isMobile && mobileDrawerVisible && (
        <TouchableOpacity
          style={styles.mobileBackdrop}
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
        />
      )}

      {isMobile && mobileDrawerVisible && (
        <Animated.View
          style={[
            styles.mobileSidebar,
            { width: leftZoneWidth, opacity: sidebarOpacity },
          ]}
          pointerEvents={sidebarOpen ? 'auto' : 'none'}
        >
          <SidebarContent
            onNavigate={(action) => {
              pendingNavigation.current = action;
              setSidebarOpen(false);
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark },
  shell: { flex: 1, backgroundColor: COLORS.bgDark, position: 'relative' },
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
    zIndex: 20,
  },
  mobileSidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 21,
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: COLORS.separator,
    backgroundColor: COLORS.bgDark,
  },
});

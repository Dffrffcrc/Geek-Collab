import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { useUserProfile } from '../lib/user-profile';
import { useIsServerAdmin } from '../lib/admins';
import { Avatar } from './Avatar';
import { MenuIcon, ShieldIcon } from './Icons';

export function Topbar({
  showMenuButton = false,
  onMenuPress,
}: {
  showMenuButton?: boolean;
  onMenuPress?: () => void;
}) {
  const router = useRouter();
  const profile = useUserProfile();
  const isServerAdmin = useIsServerAdmin();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isNarrow = width < 420;

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <View style={styles.left}>
        {showMenuButton && (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={onMenuPress}
            activeOpacity={0.85}
            accessibilityLabel="Open navigation menu"
          >
            <MenuIcon size={18} color={COLORS.yellow} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.brand}
          onPress={() => router.push('/forums')}
          activeOpacity={0.8}
        >
          <Image
            source={require('../assets/forum-logo.png')}
            style={[styles.logo, isMobile && styles.logoMobile]}
            resizeMode="contain"
          />
          {!isMobile && (
            <Text style={styles.title} numberOfLines={1}>
              Forum.GeeksHacking
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.right}>
        {isServerAdmin && (
          <TouchableOpacity
            onPress={() => router.push('/admin' as never)}
            style={styles.adminBtn}
            activeOpacity={0.85}
          >
            <ShieldIcon size={14} color="#000" />
            {!isNarrow && <Text style={styles.adminLabel}>Admin</Text>}
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.8}>
          <Avatar size={isMobile ? 34 : 40} label={profile?.displayName ?? profile?.username} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: COLORS.bgDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.separator,
  },
  containerMobile: { height: 60, paddingHorizontal: 14 },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    backgroundColor: COLORS.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  logo: { width: 44, height: 44, flexShrink: 0 },
  logoMobile: { width: 34, height: 34 },
  title: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 22, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 0 },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  adminLabel: { color: '#000', fontFamily: BODY_FONT, fontSize: 13, fontWeight: '700' },
});

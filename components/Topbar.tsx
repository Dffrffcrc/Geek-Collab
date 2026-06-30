import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { useUserProfile } from '../lib/user-profile';
import { useIsServerAdmin } from '../lib/admins';
import { Avatar } from './Avatar';
import { ShieldIcon } from './Icons';

export function Topbar() {
  const router = useRouter();
  const profile = useUserProfile();
  const isServerAdmin = useIsServerAdmin();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.brand}
        onPress={() => router.push('/forums')}
        activeOpacity={0.8}
      >
        <Image
          source={require('../assets/forum-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Forum.GeeksHacking</Text>
      </TouchableOpacity>

      <View style={styles.right}>
        {isServerAdmin && (
          <TouchableOpacity
            onPress={() => router.push('/admin' as never)}
            style={styles.adminBtn}
            activeOpacity={0.85}
          >
            <ShieldIcon size={14} color="#000" />
            <Text style={styles.adminLabel}>Admin</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.8}>
          <Avatar size={40} label={profile?.displayName ?? profile?.username} />
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  logo: { width: 44, height: 44, flexShrink: 0 },
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

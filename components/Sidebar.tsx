import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import { useUserProfile } from '../lib/user-profile';
import { Avatar } from './Avatar';
import { HomeIcon, ClockIcon } from './Icons';

const SIDEBAR_INNER_WIDTH = 240;

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const profile = useUserProfile();

  const recent = profile?.recentForums ?? [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        {/* --- Profile block ----------------------------------------- */}
        <TouchableOpacity style={styles.profileBlock} onPress={() => router.push('/profile')}>
          <Avatar size={56} label={profile?.displayName ?? profile?.username} />
          <Text style={styles.name}>{profile?.displayName ?? '...'}</Text>
          <Text style={styles.username}>@{profile?.username ?? '...'}</Text>
        </TouchableOpacity>

        <Divider />

        {/* --- Forum nav --------------------------------------------- */}
        <View style={styles.navSection}>
          <NavButton
            label="Active Forums"
            active={pathname === '/forums'}
            icon={(active) => <HomeIcon size={18} color={active ? '#000' : COLORS.yellow} />}
            onPress={() => router.push('/forums')}
          />
          <NavButton
            label="Past Forums"
            active={pathname === '/forums/past'}
            icon={(active) => <ClockIcon size={18} color={active ? '#000' : COLORS.yellow} />}
            onPress={() => router.push('/forums/past')}
          />
        </View>

        <Divider />

        {/* --- Recently Visited -------------------------------------- */}
        <Text style={styles.sectionHeader}>Recently Visited</Text>
        {recent.length === 0 ? (
          <Text style={styles.empty}>No forums visited yet.</Text>
        ) : (
          recent.map((f) => {
            const href = `/forums/${f.slug}`;
            const active = pathname === href;
            return (
              <TouchableOpacity
                key={f.slug}
                onPress={() => router.push(href)}
                style={[styles.recentItem, active && styles.recentItemActive]}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.recentText, active && styles.recentTextActive]}
                  numberOfLines={1}
                >
                  {f.name}
                </Text>
                {f.readOnly && <RoTag active={active} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* --- Footer (settings + logout) ------------------------------ */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerRow} onPress={() => router.push('/settings')}>
          <Text style={styles.footerIcon}>⚙</Text>
          <Text style={styles.footerLabel}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerRow}
          onPress={() => signOut(auth).then(() => router.replace('/login'))}
        >
          <Text style={[styles.footerIcon, { color: COLORS.error }]}>⎋</Text>
          <Text style={[styles.footerLabel, { color: COLORS.error }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function RoTag({ active }: { active: boolean }) {
  return <Text style={[styles.roTag, active && styles.roTagActive]}>R/O</Text>;
}

function NavButton({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active: boolean;
  icon: (active: boolean) => React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.navBtn, active && styles.navBtnActive]}
      activeOpacity={0.85}
    >
      <View style={styles.navIcon}>{icon(active)}</View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const ICON_SIZE = 22;

const styles = StyleSheet.create({
  container: {
    width: SIDEBAR_INNER_WIDTH,
    height: '100%',
    backgroundColor: COLORS.bgDark,
    paddingVertical: 20,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
  },
  inner: { paddingBottom: 24 },

  profileBlock: { alignItems: 'flex-start', paddingHorizontal: 4, marginBottom: 6 },
  name: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 17, marginTop: 10 },
  username: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12, marginTop: 2 },

  divider: {
    height: 1,
    backgroundColor: COLORS.separator,
    marginVertical: 8,
    marginHorizontal: -2,
  },

  navSection: { gap: 6 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  navBtnActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  navIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  navLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, fontWeight: '600' },
  navLabelActive: { color: '#000' },

  sectionHeader: {
    color: COLORS.yellow,
    fontFamily: HEADING_FONT,
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, paddingHorizontal: 4 },

  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    marginBottom: 5,
  },
  recentItemActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  recentText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12, flex: 1 },
  recentTextActive: { color: '#000', fontWeight: '700' },
  roTag: {
    backgroundColor: 'rgba(239, 235, 69, 0.18)',
    color: COLORS.yellow,
    fontSize: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: BODY_FONT,
    fontWeight: '700',
    letterSpacing: 0.4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 235, 69, 0.4)',
  },
  roTagActive: {
    backgroundColor: '#000',
    color: COLORS.yellow,
    borderColor: '#000',
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.separator,
    paddingTop: 16,
    gap: 14,
    paddingHorizontal: 4,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerIcon: {
    color: COLORS.textPrimary,
    fontSize: ICON_SIZE,
    width: ICON_SIZE + 2,
    lineHeight: ICON_SIZE + 4,
    textAlign: 'center',
  },
  footerLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14 },
});

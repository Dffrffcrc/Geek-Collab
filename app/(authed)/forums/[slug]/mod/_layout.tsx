import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { Slot, Redirect, useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { useAuth } from '../../../../../lib/auth';
import { useIsServerAdmin } from '../../../../../lib/admins';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../../../lib/theme';

type Forum = { name: string; moderatorUids?: string[] };

const TABS = [
  { label: 'Dashboard', path: '' },
  { label: 'Reports', path: '/reports' },
  { label: 'Quarantine', path: '/quarantine' },
  { label: 'Users', path: '/users' },
  { label: 'Activity', path: '/activity' },
];

export default function ModLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user, initializing } = useAuth();
  const isAdmin = useIsServerAdmin();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const [forum, setForum] = useState<Forum | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    return onSnapshot(doc(db, 'forums', slug), (snap) => {
      setForum(snap.exists() ? (snap.data() as Forum) : null);
    });
  }, [slug]);

  if (initializing || forum === undefined) {
    return <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 32 }} />;
  }
  if (!user) return <Redirect href="/login" />;
  if (!forum) {
    return (
      <View style={styles.deny}>
        <Text style={styles.denyText}>Forum not found.</Text>
      </View>
    );
  }



  const isMod = (forum.moderatorUids ?? []).includes(user.uid);
  if (!isMod && !isAdmin) {
    return (
      <View style={styles.deny}>
        <Text style={styles.denyText}>You're not a moderator of this forum.</Text>
        <TouchableOpacity onPress={() => router.replace(`/forums/${slug}`)}>
          <Text style={styles.denyLink}>← Back to forum</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const base = `/forums/${slug}/mod`;

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(`/forums/${slug}`)}>
          <Text style={styles.crumb}>← {forum.name}</Text>
        </TouchableOpacity>
        <Text style={[styles.heading, compact && styles.headingCompact]}>Moderator panel</Text>
        <Text style={styles.sub}>Forum safety tools, reports, and participant controls.</Text>
      </View>

      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabs, compact && styles.tabsCompact]}
        >
          {TABS.map((t) => {
            const href = `${base}${t.path}`;
            const active = pathname === href;
            return (
              <TouchableOpacity
                key={t.path}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => router.push(href as never)}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.body}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: { paddingHorizontal: 32, paddingTop: 18, paddingBottom: 0 },
  crumb: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 6 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 30 },
  headingCompact: { fontSize: 24 },
  sub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 3 },
  tabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.separator,
    backgroundColor: COLORS.bgDark,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 32,
    paddingTop: 6,
    paddingBottom: 6,
    alignItems: 'center',
  },
  tabsCompact: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
  tab: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    minHeight: 30,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12, fontWeight: '600', lineHeight: 14 },
  tabLabelActive: { color: '#000' },
  body: { flex: 1 },
  deny: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  denyText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 16, marginBottom: 12 },
  denyLink: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 14 },
});

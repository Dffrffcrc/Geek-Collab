import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { useUserProfile } from '../../../lib/user-profile';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { isClosed, timeRemaining } from '../../../lib/forum-utils';
import { addModerator, removeModerator, reopenForum } from '../../../lib/admin-tools';
import { deleteForumCascading, logActivity } from '../../../lib/moderation';
import { FormInput } from '../../../components/FormInput';
import { UserPicker } from '../../../components/UserPicker';
import { DateTimeInput } from '../../../components/DateTimeInput';
import { XIcon } from '../../../components/Icons';

type Forum = {
  slug: string;
  name: string;
  description?: string;
  closesAt: Timestamp;
  createdBy?: string;
  moderatorUids?: string[];
  postCount?: number;
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminForums() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserProfile();

  const [forums, setForums] = useState<Forum[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [modPickerFor, setModPickerFor] = useState<Forum | null>(null);
  const [reopenFor, setReopenFor] = useState<Forum | null>(null);
  const [reopenAt, setReopenAt] = useState<string>('');
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'forums'), orderBy('createdAt', 'desc')),
      (snap) => {
        setForums(snap.docs.map((d) => ({ slug: d.id, ...(d.data() as Omit<Forum, 'slug'>) })));
      },
    );
  }, []);

  const filtered = useMemo(() => {
    if (!forums) return [];
    const q = search.trim().toLowerCase();
    return forums
      .filter((f) => {
        if (filter === 'active') return !isClosed(f.closesAt);
        if (filter === 'closed') return isClosed(f.closesAt);
        return true;
      })
      .filter(
        (f) =>
          !q ||
          f.slug.toLowerCase().includes(q) ||
          f.name.toLowerCase().includes(q) ||
          (f.description ?? '').toLowerCase().includes(q),
      );
  }, [forums, search, filter]);

  async function applyMods(forumSlug: string, oldMods: string[], newMods: string[]) {
    if (!user || !profile) return;
    const toAdd = newMods.filter((u) => !oldMods.includes(u));
    const toRemove = oldMods.filter((u) => !newMods.includes(u));
    try {
      for (const uid of toAdd) await addModerator(forumSlug, uid);
      for (const uid of toRemove) await removeModerator(forumSlug, uid);
      logActivity(forumSlug, user.uid, profile.username, 'user_muted', {
        targetType: 'user',
        details: `mods updated (+${toAdd.length}/-${toRemove.length})`,
      });
    } catch (err) {
      console.error('[admin:forums:mods] failed:', err);
    }
  }

  async function applyReopen(forumSlug: string) {
    if (!reopenAt) return;
    const ms = new Date(reopenAt).getTime();
    if (!Number.isFinite(ms) || ms <= Date.now()) {
      alert('Pick a date/time in the future.');
      return;
    }
    try {
      await reopenForum(forumSlug, new Date(ms));
      setReopenFor(null);
      setReopenAt('');
    } catch (err) {
      console.error('[admin:forums:reopen] failed:', err);
    }
  }

  async function deleteForum(forumSlug: string) {
    if (
      !confirm(
        `Permanently delete the forum "${forumSlug}" and ALL its posts, comments, reports, and activity? This cannot be undone.`,
      )
    )
      return;
    setDeletingSlug(forumSlug);
    try {
      await deleteForumCascading(forumSlug);
    } catch (err) {
      console.error('[admin:forums:delete] failed:', err);
    } finally {
      setDeletingSlug(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Forum management</Text>
      <Text style={styles.sub}>Open / view / delete forums and manage moderator assignments.</Text>

      <FormInput placeholder="Search slug / name / description…" value={search} onChangeText={setSearch} />

      <View style={styles.filterRow}>
        {(['all', 'active', 'closed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Closed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {forums === null ? (
        <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>No matching forums.</Text>
      ) : (
        filtered.map((f) => {
          const closed = isClosed(f.closesAt);
          const mods = f.moderatorUids ?? [];
          return (
            <View key={f.slug} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardName}>{f.name}</Text>
                <Text style={[styles.badge, closed ? styles.badgeClosed : styles.badgeActive]}>
                  {closed ? 'Closed' : timeRemaining(f.closesAt)}
                </Text>
              </View>
              <Text style={styles.cardSlug}>/forums/{f.slug}</Text>
              {!!f.description && <Text style={styles.cardDesc}>{f.description}</Text>}
              <Text style={styles.cardMeta}>
                {mods.length} moderator{mods.length === 1 ? '' : 's'} · {f.postCount ?? 0} post{f.postCount === 1 ? '' : 's'}
              </Text>

              <View style={styles.actions}>
                <ActBtn label="View" onPress={() => router.push(`/forums/${f.slug}` as never)} />
                <ActBtn label="Manage mods" onPress={() => setModPickerFor(f)} />
                {closed && (
                  <ActBtn
                    label="Open / extend"
                    onPress={() => {
                      setReopenFor(f);
                      setReopenAt(toLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
                    }}
                  />
                )}
                <ActBtn
                  label={deletingSlug === f.slug ? 'Deleting…' : 'Delete'}
                  destructive
                  onPress={() => deleteForum(f.slug)}
                />
              </View>
            </View>
          );
        })
      )}

      {/* Moderator picker modal */}
      <Modal
        visible={modPickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModPickerFor(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Moderators · {modPickerFor?.name}
              </Text>
              <TouchableOpacity onPress={() => setModPickerFor(null)}>
                <XIcon size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {modPickerFor && (
              <ModEditor
                forumSlug={modPickerFor.slug}
                currentMods={modPickerFor.moderatorUids ?? []}
                onSave={async (newMods) => {
                  await applyMods(modPickerFor.slug, modPickerFor.moderatorUids ?? [], newMods);
                  setModPickerFor(null);
                }}
                onCancel={() => setModPickerFor(null)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Reopen modal */}
      <Modal
        visible={reopenFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReopenFor(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Open / extend · {reopenFor?.name}</Text>
              <TouchableOpacity onPress={() => setReopenFor(null)}>
                <XIcon size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>New close date & time</Text>
            <DateTimeInput
              value={reopenAt}
              onChange={setReopenAt}
              min={toLocalInputValue(new Date())}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setReopenFor(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => reopenFor && applyReopen(reopenFor.slug)}
              >
                <Text style={styles.submitLabel}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ModEditor({
  forumSlug,
  currentMods,
  onSave,
  onCancel,
}: {
  forumSlug: string;
  currentMods: string[];
  onSave: (newMods: string[]) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [mods, setMods] = useState<string[]>(currentMods);
  const [busy, setBusy] = useState(false);

  return (
    <View>
      <UserPicker selected={mods} onChange={setMods} emptyHint="No matching users." />
      <View style={styles.modalActions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitBtn}
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await onSave(mods);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.submitLabel}>Save</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ActBtn({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.actBtn, destructive && styles.actBtnDestructive]}>
      <Text style={[styles.actBtnLabel, destructive && styles.actBtnLabelDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  heading: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 24, marginBottom: 4 },
  sub: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
    backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  chipText: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  chipTextActive: { color: '#000', fontWeight: '700' },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13, marginTop: 16 },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { color: COLORS.textPrimary, fontFamily: HEADING_FONT, fontSize: 18, flexShrink: 1, paddingRight: 8 },
  cardSlug: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 11, marginBottom: 6 },
  cardDesc: { color: '#cccccc', fontFamily: BODY_FONT, fontSize: 13, marginBottom: 6, lineHeight: 18 },
  cardMeta: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginBottom: 10 },
  badge: { fontFamily: BODY_FONT, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  badgeActive: { backgroundColor: COLORS.yellow, color: '#000' },
  badgeClosed: { backgroundColor: '#444', color: COLORS.textMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#3a3a3a',
  },
  actBtnDestructive: { borderColor: COLORS.error },
  actBtnLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 12 },
  actBtnLabelDestructive: { color: COLORS.error },

  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center',
    alignItems: 'center', padding: 24,
  },
  modal: {
    backgroundColor: '#2a2a2a', borderRadius: 14, padding: 22,
    width: '100%', maxWidth: 600, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18, flex: 1, paddingRight: 12 },
  modalLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13, marginBottom: 6 },
  modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 12 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border },
  cancelLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14 },
  submitBtn: {
    backgroundColor: COLORS.yellow, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 18,
    minWidth: 100, alignItems: 'center',
  },
  submitLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 14 },
});

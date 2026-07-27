import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  orderBy,
  type Timestamp,
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { MAX_BIO_LENGTH, useUserProfile } from '../../../lib/user-profile';
import { useIsServerAdmin } from '../../../lib/admins';
import { COLORS, BODY_FONT, HEADING_FONT } from '../../../lib/theme';
import { Avatar } from '../../../components/Avatar';
import { FormInput } from '../../../components/FormInput';
import { RoleTag, useUserRole } from '../../../components/RoleTag';
import { ImageIcon } from '../../../components/Icons';
import { PostCard, type PostSummary } from '../../../components/PostCard';
import { describeActionError } from '../../../lib/admin-tools';
import { deleteMyAccount } from '../../../lib/account';
import {
  ALLOWED_AVATAR_TYPES,
  AVATAR_ACCEPT,
  MAX_AVATAR_BYTES,
  pickFiles,
  uploadFile,
  validateFile,
} from '../../../lib/uploads';

type AuthoredPost = PostSummary & { forumSlug: string; createdAt: Timestamp };

const MAX_DISPLAY_NAME = 40;

export default function MyProfile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const { user } = useAuth();
  const profile = useUserProfile();
  const isAdmin = useIsServerAdmin();

  const [posts, setPosts] = useState<AuthoredPost[] | null>(null);


  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);


  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);


  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);


  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);





  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const forumsSnap = await getDocs(collection(db, 'forums'));
        const postLists = await Promise.all(
          forumsSnap.docs.map(async (forumDoc) => {
            const postsSnap = await getDocs(
              query(
                collection(db, 'forums', forumDoc.id, 'posts'),
                where('authorUid', '==', user.uid),
                orderBy('createdAt', 'desc'),
              ),
            );
            return postsSnap.docs
              .filter((d) => {
                const data = d.data();
                if (data.isDeleted === true) return false;
                if (data.isQuarantined === true && !isAdmin) return false;
                return true;
              })
              .map((d) => {
                const data = d.data() as Omit<AuthoredPost, 'id' | 'forumSlug'>;
                return { ...data, id: d.id, forumSlug: forumDoc.id } as AuthoredPost;
              });
          }),
        );
        if (cancelled) return;
        const items = postLists
          .flat()
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setPosts(items);
      } catch (err) {
        console.warn('[profile:posts] failed:', err);
        if (!cancelled) setPosts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);


  function beginEditName() {
    setDraftName(profile?.displayName ?? '');
    setNameError(null);
    setEditingName(true);
  }

  async function saveName() {
    if (!user) return;
    const next = draftName.trim();
    if (!next) {
      setNameError('Display name cannot be empty.');
      return;
    }
    if (next.length > MAX_DISPLAY_NAME) {
      setNameError(`Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`);
      return;
    }
    if (next === profile?.displayName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), { displayName: next });
      setEditingName(false);
    } catch (err) {
      console.error('[profile:save-name] failed:', err);
      setNameError(describeActionError('update display name', err));
    } finally {
      setSavingName(false);
    }
  }


  function beginEditBio() {
    setDraftBio(profile?.bio ?? '');
    setBioError(null);
    setEditingBio(true);
  }

  async function saveBio() {
    if (!user) return;
    const next = draftBio.trim();
    if (next.length > MAX_BIO_LENGTH) {
      setBioError(`Bio must be ${MAX_BIO_LENGTH} characters or fewer.`);
      return;
    }
    setSavingBio(true);
    setBioError(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), { bio: next });
      setEditingBio(false);
    } catch (err) {
      console.error('[profile:save-bio] failed:', err);
      setBioError(describeActionError('update bio', err));
    } finally {
      setSavingBio(false);
    }
  }

  async function pickAndUploadAvatar() {
    if (!user) return;
    setAvatarError(null);
    const files = await pickFiles({ accept: AVATAR_ACCEPT, multiple: false });
    if (files.length === 0) return;
    const file = files[0];
    const err = validateFile(file, {
      allowedTypes: ALLOWED_AVATAR_TYPES,
      maxBytes: MAX_AVATAR_BYTES,
    });
    if (err) {
      setAvatarError(err);
      return;
    }
    setUploadingAvatar(true);
    try {
      const { attachment } = uploadFile({
        file,
        uid: user.uid,
        pathPrefix: 'avatars',
      });
      const result = await attachment;
      await updateDoc(doc(db, 'users', user.uid), { photoURL: result.url });
    } catch (uploadErr) {
      console.error('[profile:avatar] failed:', uploadErr);
      setAvatarError(describeActionError('upload avatar', uploadErr));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function resetAvatar() {
    if (!user) return;
    if (!profile?.photoURL) return;
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { photoURL: null });
    } catch (uploadErr) {
      console.error('[profile:avatar-reset] failed:', uploadErr);
      setAvatarError(describeActionError('reset avatar', uploadErr));
    } finally {
      setUploadingAvatar(false);
    }
  }




  const setupItems: { key: string; label: string; done: boolean; action: () => void }[] = [
    {
      key: 'photo',
      label: 'Add a profile picture',
      done: !!profile?.photoURL,
      action: pickAndUploadAvatar,
    },
    {
      key: 'bio',
      label: 'Write a short bio',
      done: !!(profile?.bio && profile.bio.trim()),
      action: beginEditBio,
    },
    {
      key: 'displayName',


      label: 'Set a display name',
      done:
        !!profile?.displayName &&
        profile.displayName.toLowerCase() !== profile.username.toLowerCase(),
      action: beginEditName,
    },
  ];
  const setupComplete = setupItems.every((i) => i.done);

  const displayName = profile?.displayName ?? '';
  const meRole = useUserRole(profile?.username);

  return (
    <ScrollView contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}>
      {/* -------- Identity header -------- */}
      <View style={[styles.header, compact && styles.headerCompact]}>
        <View style={styles.avatarCol}>
          <View style={styles.avatarWrap}>
            <Avatar
              size={compact ? 72 : 96}
              label={displayName || profile?.username}
              photoURL={profile?.photoURL}
            />
            <TouchableOpacity
              style={styles.avatarEditBtn}
              onPress={pickAndUploadAvatar}
              disabled={uploadingAvatar}
              accessibilityLabel="Change profile picture"
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <ImageIcon size={14} color="#000" />
              )}
            </TouchableOpacity>
          </View>
          {profile?.photoURL && (
            <TouchableOpacity
              onPress={resetAvatar}
              disabled={uploadingAvatar}
              style={styles.resetAvatarLink}
            >
              <Text style={styles.resetAvatarLinkText}>Reset Profile Image</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.identity}>
          {editingName ? (
            <View>
              <FormInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Display name"
                autoFocus
                maxLength={MAX_DISPLAY_NAME}
              />
              {nameError && <Text style={styles.errorText}>{nameError}</Text>}
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, savingName && styles.btnDim]}
                  onPress={saveName}
                  disabled={savingName}
                >
                  {savingName ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.btnPrimaryLabel}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => setEditingName(false)}
                  disabled={savingName}
                >
                  <Text style={styles.btnGhostLabel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.nameRow}>
                <Text
                  style={[
                    styles.name,
                    compact && styles.nameCompact,
                    meRole.nameColor ? { color: meRole.nameColor } : null,
                  ]}
                >
                  {displayName || profile?.username || '…'}
                </Text>
                <TouchableOpacity onPress={beginEditName} style={styles.editLinkWrap}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.username}>
                @{profile?.username ?? '…'}
                {meRole.isAdmin && <RoleTag role="ADMIN" />}
                {meRole.isMod && <RoleTag role="MOD" />}
              </Text>
              <Text style={styles.email}>{profile?.email ?? ''}</Text>
            </>
          )}
          {avatarError && <Text style={styles.errorText}>{avatarError}</Text>}
        </View>
      </View>

      {/* -------- Setup checklist (Instagram-style) -------- */}
      {!setupComplete && profile && (
        <View style={styles.setupCard}>
          <Text style={styles.setupHeader}>Finish setting up your profile</Text>
          <Text style={styles.setupSub}>
            A few small things help other members recognise you.
          </Text>
          {setupItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.setupRow, item.done && styles.setupRowDone]}
              onPress={item.action}
              disabled={item.done}
              activeOpacity={0.7}
            >
              <View style={[styles.setupCheck, item.done && styles.setupCheckDone]}>
                {item.done && <Text style={styles.setupCheckMark}>✓</Text>}
              </View>
              <Text style={[styles.setupLabel, item.done && styles.setupLabelDone]}>
                {item.label}
              </Text>
              {!item.done && <Text style={styles.setupChevron}>›</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* -------- Bio -------- */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Bio</Text>
          {!editingBio && (
            <TouchableOpacity onPress={beginEditBio}>
              <Text style={styles.editLink}>{profile?.bio ? 'Edit' : 'Add'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {editingBio ? (
          <View>
            <FormInput
              value={draftBio}
              onChangeText={setDraftBio}
              placeholder="Tell people a bit about yourself…"
              multiline
              maxLength={MAX_BIO_LENGTH}
              style={{ height: 90, paddingTop: 12 }}
            />
            <Text style={styles.bioMeta}>
              {draftBio.length}/{MAX_BIO_LENGTH}
            </Text>
            {bioError && <Text style={styles.errorText}>{bioError}</Text>}
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, savingBio && styles.btnDim]}
                onPress={saveBio}
                disabled={savingBio}
              >
                {savingBio ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryLabel}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={() => setEditingBio(false)}
                disabled={savingBio}
              >
                <Text style={styles.btnGhostLabel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : profile?.bio ? (
          <Text style={styles.bioText}>{profile.bio}</Text>
        ) : (
          <Text style={styles.bioEmpty}>No bio yet.</Text>
        )}
      </View>

      {/* -------- Posts -------- */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Your posts</Text>
        {posts === null ? (
          <ActivityIndicator color={COLORS.yellow} />
        ) : posts.length === 0 ? (
          <Text style={styles.empty}>You haven't posted anything yet.</Text>
        ) : (
          posts.map((p) => (
            <PostCard key={`${p.forumSlug}/${p.id}`} forumSlug={p.forumSlug} post={p} />
          ))
        )}
      </View>

      {/* -------- Danger zone -------- */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerHeader}>Danger zone</Text>
        <Text style={styles.dangerBody}>
          Permanently deletes your account, releases your @{profile?.username ?? '…'} handle,
          and removes you as moderator from any forums. Posts and comments you've made stay
          in the forums under your username but you won't be able to sign back in with this
          account.
        </Text>
        {!deleteArmed ? (
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => {
              setDeleteError(null);
              setDeleteConfirmText('');
              setDeleteArmed(true);
            }}
          >
            <Text style={styles.dangerBtnLabel}>Delete my account</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.dangerPrompt}>
              Type <Text style={styles.dangerPromptEmph}>{profile?.username}</Text> to confirm.
            </Text>
            <FormInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Your username"
              autoCapitalize="none"
            />
            {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[
                  styles.dangerBtn,
                  (deleting || deleteConfirmText !== profile?.username) && styles.dangerBtnDisabled,
                ]}
                disabled={deleting || deleteConfirmText !== profile?.username}
                onPress={async () => {
                  if (!profile) return;
                  setDeleting(true);
                  setDeleteError(null);
                  try {
                    await deleteMyAccount(profile.username.toLowerCase());
                    router.replace('/login');
                  } catch (err) {
                    console.error('[profile:delete] failed:', err);
                    setDeleteError(describeActionError('delete account', err));
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.dangerBtnLabel}>Confirm delete</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={() => {
                  setDeleteArmed(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                <Text style={styles.btnGhostLabel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}




const styles = StyleSheet.create({
  scroll: { padding: 32, paddingBottom: 64 },
  scrollCompact: { padding: 16, paddingBottom: 40 },


  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, marginBottom: 24 },
  headerCompact: { flexDirection: 'column', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  avatarCol: { alignItems: 'center', gap: 6 },
  avatarWrap: { position: 'relative' },
  resetAvatarLink: { paddingVertical: 2, paddingHorizontal: 4 },
  resetAvatarLinkText: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  avatarEditBtn: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.bgDark,
  },
  identity: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 26 },
  nameCompact: { fontSize: 22 },
  username: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 14, marginTop: 4 },
  email: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },
  editLinkWrap: { marginLeft: 10 },
  editLink: { color: COLORS.yellow, fontFamily: BODY_FONT, fontSize: 12, textDecorationLine: 'underline' },


  setupCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.separator,
    backgroundColor: COLORS.bgPanel,
    marginBottom: 24,
  },
  setupHeader: {
    color: COLORS.textPrimary,
    fontFamily: HEADING_FONT,
    fontSize: 16,
    marginBottom: 4,
  },
  setupSub: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 12,
    marginBottom: 12,
  },
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.separator,
  },
  setupRowDone: { opacity: 0.55 },
  setupCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupCheckDone: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  setupCheckMark: { color: '#000', fontSize: 13, fontWeight: '700', lineHeight: 14 },
  setupLabel: { flex: 1, color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
  setupLabelDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  setupChevron: { color: COLORS.textMuted, fontSize: 20, fontFamily: BODY_FONT },


  section: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeader: { color: COLORS.yellow, fontFamily: HEADING_FONT, fontSize: 18 },
  bioText: {
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
    fontSize: 14,
    lineHeight: 20,
  },
  bioEmpty: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 13,
    fontStyle: 'italic',
  },
  bioMeta: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  empty: { color: COLORS.textMuted, fontFamily: BODY_FONT, fontSize: 13 },
  errorText: { color: COLORS.error, fontFamily: BODY_FONT, fontSize: 12, marginTop: 4 },


  editButtons: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  btnPrimary: { backgroundColor: COLORS.yellow },
  btnPrimaryLabel: { color: '#000', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 13 },
  btnGhost: { backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: COLORS.border },
  btnGhostLabel: { color: COLORS.textPrimary, fontFamily: BODY_FONT, fontSize: 13 },
  btnDim: { opacity: 0.6 },


  dangerZone: {
    marginTop: 24,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  dangerHeader: {
    color: COLORS.error,
    fontFamily: HEADING_FONT,
    fontSize: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  dangerBody: {
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  dangerPrompt: {
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
    fontSize: 13,
    marginBottom: 8,
  },
  dangerPromptEmph: { color: COLORS.yellow, fontWeight: '700' },
  dangerBtn: {
    backgroundColor: COLORS.error,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 140,
  },
  dangerBtnDisabled: { opacity: 0.5 },
  dangerBtnLabel: { color: '#fff', fontFamily: BODY_FONT, fontWeight: '700', fontSize: 13 },
});

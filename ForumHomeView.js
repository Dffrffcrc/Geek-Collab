import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  SafeAreaView,
  TextInput,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDiscussionViewModel } from './DiscussionViewModel';
import DiscussionDetailView from './DiscussionDetailView';
import NewDiscussionView from './NewDiscussionView';
import FAQView from './FAQView';
import UserProfileView from './UserProfileView';
import ProfileEditView from './ProfileEditView';
import SideMenuDrawer from './SideMenuDrawer';
import { getAllUsers } from './StorageExtension';
import { hasModerationMatch } from './ContentModeration';

const toImageURI = (image) => {
  if (!image) return null;
  if (typeof image === 'string') return image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;
  if (image.uri) return image.uri;
  if (image.base64) {
    const mimeType = image.mimeType || 'image/jpeg';
    return `data:${mimeType};base64,${image.base64}`;
  }
  return null;
};

const getAspectRatio = (image) => {
  if (image && typeof image === 'object' && image.width && image.height) {
    return image.width / image.height;
  }
  return 4 / 3;
};

const relativeDate = (dateStr) => {
  const interval = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (interval < 3600) return 'Now';
  if (interval < 86400) return `${Math.floor(interval / 3600)}h ago`;
  return `${Math.floor(interval / 86400)}d ago`;
};

const formatMutedTime = (mutedUntilISO) => {
  if (!mutedUntilISO) return null;
  const mutedUntil = new Date(mutedUntilISO).getTime();
  const now = Date.now();
  if (mutedUntil <= now) return null;
  
  const diffMs = mutedUntil - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Muted for < 1 min';
  if (diffMins < 60) return `Muted for ${diffMins} min`;
  if (diffHours < 24) return `Muted for ${diffHours}h ${diffMins % 60}m`;
  return `Muted for ${diffDays}d`;
};

const REPORT_REASON_OPTIONS = [
  'Spam or scam',
  'Harassment or hate',
  'Violence or dangerous content',
  'False information',
  'Copyright or IP concern',
  'Other',
];

const formatDateInputValue = (date) => date.toISOString().slice(0, 10);
const formatTimeInputValue = (date) => date.toTimeString().slice(0, 5);
const formatDisplayDate = (date) => date.toLocaleDateString();
const formatDisplayTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const webPickerInputStyle = {
  width: '220px',
  border: '1px solid #D1D5DB',
  borderRadius: 8,
  padding: '12px',
  fontSize: 15,
  backgroundColor: '#F9FAFB',
  color: '#111827',
  boxSizing: 'border-box',
  cursor: 'pointer',
};

const TouchableOpacity = ({ children, style, activeOpacity = 0.85, disabled, ...rest }) => {
  return (
    <Pressable
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        typeof style === 'function' ? style({ pressed }) : style,
        !disabled && pressed ? { opacity: activeOpacity } : null,
      ]}
    >
      {children}
    </Pressable>
  );
};

const DiscussionCard = ({ discussion, viewModel, currentUser, onOpenProfile, confirmAction, openMenu, onOpenMuteModal }) => {
  const [showDetail, setShowDetail] = useState(false);
  const permissions = viewModel.getPermissionSummary(currentUser);

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={() => setShowDetail(true)} activeOpacity={0.85}>
        <View style={styles.cardAuthorRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.cardAuthorAvatar}>
              <Text style={styles.cardAuthorAvatarText}>
                {discussion.authorName[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <TouchableOpacity onPress={() => onOpenProfile(discussion.authorID, discussion.authorName)}>
                <Text style={styles.cardAuthorName}>{discussion.authorName}</Text>
              </TouchableOpacity>
              <Text style={styles.cardAuthorDate}>{relativeDate(discussion.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.moreMenuWrapper}>
            <TouchableOpacity
              style={styles.moreButton}
              onPressIn={(e) => openMenu(discussion, e.nativeEvent.pageX, e.nativeEvent.pageY)}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{discussion.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>{discussion.description}</Text>

        {permissions.canModerate && discussion.reports.length > 0 && (
          <View style={styles.reportedBadge}>
            <Text style={styles.reportedBadgeText}>Reported {discussion.reports.length}x</Text>
          </View>
        )}

        {discussion.image ? (
          <Image
            source={{ uri: toImageURI(discussion.image) }}
            style={[styles.cardImage, { aspectRatio: getAspectRatio(discussion.image) }]}
            resizeMode="contain"
          />
        ) : null}

        {discussion.tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
            {discussion.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => viewModel.likeDiscussion(discussion.id, currentUser.id)}
          >
            <Ionicons
              name={(discussion.likesBy || []).includes(currentUser.id) ? 'heart' : 'heart-outline'}
              size={16}
              color={(discussion.likesBy || []).includes(currentUser.id) ? '#EF4444' : '#6B7280'}
            />
            <Text style={styles.actionText}>{discussion.likes}</Text>
          </TouchableOpacity>

          <View style={styles.actionItem}>
            <Ionicons name="chatbubble-outline" size={15} color="#6B7280" />
            <Text style={styles.actionText}>{discussion.comments.length}</Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* more menu moved to header */}

          {permissions.canModerate && (
            <TouchableOpacity
              onPress={() =>
                confirmAction(
                  'Delete Post',
                  'This will permanently remove this post.',
                  () => viewModel.deleteDiscussion(discussion.id, currentUser)
                )
              }
            >
              <Text style={styles.deleteLink}>Delete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setShowDetail(true)}>
            <Text style={styles.viewLink}>View</Text>
          </TouchableOpacity>
        </View>

        {permissions.canModerate && discussion.authorID !== currentUser.id && (
          <View style={styles.moderationRow}>
            <TouchableOpacity
              style={styles.moderationButton}
              onPress={() => onOpenMuteModal(discussion.authorID, discussion.authorName || discussion.authorID)}
            >
              <Text style={styles.moderationButtonText}>Mute</Text>
            </TouchableOpacity>
            {permissions.isAdmin && (
              <TouchableOpacity
                style={[styles.moderationButton, styles.banButton]}
                onPress={() =>
                  confirmAction(
                    'Ban User',
                    'Ban this user and remove all their posts?',
                    () => viewModel.banUser(discussion.authorID, currentUser)
                  )
                }
              >
                <Text style={styles.moderationButtonText}>Ban User</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet">
        <DiscussionDetailView
          discussion={discussion}
          viewModel={viewModel}
          currentUser={currentUser}
          onOpenProfile={onOpenProfile}
          onBack={() => setShowDetail(false)}
        />
      </Modal>
    </>
  );
};

const ForumHomeView = ({ currentUser, onLogout, authVM, newUserNotice, clearNewUserNotice }) => {
  const discussionVM = useDiscussionViewModel();
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showPastForums, setShowPastForums] = useState(false);
  const [showModPanel, setShowModPanel] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState({ id: null, name: '' });
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showQuickReportModal, setShowQuickReportModal] = useState(false);
  const [quickReportReason, setQuickReportReason] = useState(REPORT_REASON_OPTIONS[0]);
  const [quickReportCustomText, setQuickReportCustomText] = useState('');
  const [quickReportTarget, setQuickReportTarget] = useState(null);
  const [reportedPostToView, setReportedPostToView] = useState(null);
  const [showNewForumModal, setShowNewForumModal] = useState(false);
  const [forumTitle, setForumTitle] = useState('');
  const [forumEndDate, setForumEndDate] = useState(() => formatDateInputValue(new Date(Date.now() + 30 * 60 * 1000)));
  const [forumEndTime, setForumEndTime] = useState(() => formatTimeInputValue(new Date(Date.now() + 30 * 60 * 1000)));
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedForumModerators, setSelectedForumModerators] = useState([]);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [muteTargetUser, setMuteTargetUser] = useState(null);
  const [muteTargetName, setMuteTargetName] = useState('');
  const [muteDurationMinutes, setMuteDurationMinutes] = useState(30);
  const [muteError, setMuteError] = useState('');
  const [filterWordInput, setFilterWordInput] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [reportsSearchQuery, setReportsSearchQuery] = useState('');
  const [deletedSearchQuery, setDeletedSearchQuery] = useState('');
  const [forumsSearchQuery, setForumsSearchQuery] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedReports, setSelectedReports] = useState(new Set());
  const [forumModInput, setForumModInput] = useState('');
  const [modTab, setModTab] = useState('dashboard');
  const [showPastForumPosts, setShowPastForumPosts] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [deletedForumID, setDeletedForumID] = useState(null);
  const [reportsLimit, setReportsLimit] = useState(10);
  const [deletedLimit, setDeletedLimit] = useState(10);
  const [usersLimit, setUsersLimit] = useState(10);
  const [activityLimit, setActivityLimit] = useState(20);
  const [quarantinedPosts, setQuarantinedPosts] = useState([]);
  const [userActivity, setUserActivity] = useState({});
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const webDateInputRef = useRef(null);
  const webTimeInputRef = useRef(null);
  const [overlayMenu, setOverlayMenu] = useState({ visible: false, x: 0, y: 0, discussion: null });
  const forumTitleHasBlockedLanguage = hasModerationMatch(forumTitle, discussionVM.blockedWords);
  const parsedForumEnd = useMemo(() => {
    if (!forumEndDate || !forumEndTime) return null;
    const dt = new Date(`${forumEndDate}T${forumEndTime}`);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }, [forumEndDate, forumEndTime]);
  const isForumEndFuture = Boolean(parsedForumEnd && parsedForumEnd.getTime() > Date.now());
  const canCreateForum = Boolean(
    forumTitle.trim() && isForumEndFuture && !forumTitleHasBlockedLanguage
  );
  const reportedPosts = useMemo(
    () => discussionVM.discussions.filter((item) => item.reports.length > 0),
    [discussionVM.discussions]
  );
  const filteredReportedPosts = useMemo(() => {
    if (!reportsSearchQuery.trim()) return reportedPosts;
    const query = reportsSearchQuery.toLowerCase();
    return reportedPosts.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      item.authorName.toLowerCase().includes(query)
    );
  }, [reportedPosts, reportsSearchQuery]);
  const filteredDeletedDiscussions = useMemo(() => {
    if (!deletedSearchQuery.trim()) return discussionVM.deletedDiscussions;
    const query = deletedSearchQuery.toLowerCase();
    return discussionVM.deletedDiscussions.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      item.authorName.toLowerCase().includes(query)
    );
  }, [discussionVM.deletedDiscussions, deletedSearchQuery]);
  const filteredForums = useMemo(() => {
    if (!forumsSearchQuery.trim()) return discussionVM.forums;
    const query = forumsSearchQuery.toLowerCase();
    return discussionVM.forums.filter((forum) =>
      forum.title.toLowerCase().includes(query)
    );
  }, [discussionVM.forums, forumsSearchQuery]);
  const canSubmitQuickReport = quickReportReason !== 'Other' || Boolean(quickReportCustomText.trim());

  const permissions = useMemo(() => discussionVM.getPermissionSummary(currentUser), [discussionVM, currentUser]);

  useEffect(() => {
    if (newUserNotice) {
      discussionVM.createDiscussion(
        'Welcome!',
        'New member joined',
        newUserNotice,
        null,
        ['announcement'],
        {
          ...currentUser,
          id: currentUser.id,
          username: 'system',
          role: 'admin',
        }
      );
      clearNewUserNotice?.();
    }
  }, [newUserNotice, discussionVM, clearNewUserNotice, currentUser]);

  useEffect(() => {
    if (!discussionVM.toast?.id) return;
    toastOpacity.setValue(0);
    const useNativeDriver = Platform.OS !== 'web';
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 450, useNativeDriver }),
    ]).start();
  }, [discussionVM.toast?.id, toastOpacity, discussionVM.toast]);

  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      const users = await getAllUsers();
      if (mounted) {
        setRegisteredUsers(Array.isArray(users) ? users : []);
      }
    };
    loadUsers();
    return () => {
      mounted = false;
    };
  }, [discussionVM.discussions, discussionVM.toast?.id, showModPanel]);

  useEffect(() => {
    const activity = {};
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    registeredUsers.forEach(user => {
      const userPosts = discussionVM.discussions.filter(d => d.authorID === user.id);
      const userComments = discussionVM.discussions.flatMap(d => d.comments).filter(c => c.authorID === user.id);

      const lastPost = userPosts.length > 0 ? Math.max(...userPosts.map(p => new Date(p.createdAt).getTime())) : null;
      const lastComment = userComments.length > 0 ? Math.max(...userComments.map(c => new Date(c.createdAt).getTime())) : null;
      const lastActivity = Math.max(lastPost || 0, lastComment || 0) || null;

      const recentPosts = userPosts.filter(p => new Date(p.createdAt).getTime() > sevenDaysAgo).length;
      const recentComments = userComments.filter(c => new Date(c.createdAt).getTime() > sevenDaysAgo).length;

      activity[user.id] = {
        totalPosts: userPosts.length,
        totalComments: userComments.length,
        lastPost: lastPost ? new Date(lastPost).toLocaleDateString() : 'Never',
        lastComment: lastComment ? new Date(lastComment).toLocaleDateString() : 'Never',
        lastActivity: lastActivity ? new Date(lastActivity).toLocaleDateString() : 'Never',
        recentPosts,
        recentComments,
        recentActivity: recentPosts + recentComments,
      };
    });

    setUserActivity(activity);
  }, [registeredUsers, discussionVM.discussions]);

  useEffect(() => {
    // Auto-quarantine posts with blocked words
    const quarantined = discussionVM.discussions.filter(discussion => {
      const hasBlockedWords = hasModerationMatch(discussion.title, discussionVM.blockedWords) ||
                             hasModerationMatch(discussion.content, discussionVM.blockedWords) ||
                             discussion.comments.some(comment => hasModerationMatch(comment.text, discussionVM.blockedWords));
      return hasBlockedWords && !discussionVM.deletedDiscussions.some(del => del.id === discussion.id);
    });
    setQuarantinedPosts(quarantined);
  }, [discussionVM.discussions, discussionVM.blockedWords, discussionVM.deletedDiscussions]);

  const submitForumCreation = () => {
    if (!canCreateForum) return;
    const nextExpiresAt = parsedForumEnd.toISOString();
    if (discussionVM.createForum(forumTitle, nextExpiresAt, currentUser, selectedForumModerators)) {
      setShowNewForumModal(false);
      setForumTitle('');
      const nextDefault = new Date(Date.now() + 30 * 60 * 1000);
      setForumEndDate(formatDateInputValue(nextDefault));
      setForumEndTime(formatTimeInputValue(nextDefault));
      setShowEndDatePicker(false);
      setShowEndTimePicker(false);
      setSelectedForumModerators([]);
    }
  };

  const openMuteModal = (userID, userName, defaultMinutes = 30) => {
    setMuteTargetUser(userID);
    setMuteTargetName(userName || 'User');
    setMuteDurationMinutes(defaultMinutes);
    setMuteError('');
    setShowMuteModal(true);
  };

  const closeMuteModal = () => {
    setShowMuteModal(false);
    setMuteTargetUser(null);
    setMuteTargetName('');
    setMuteDurationMinutes(30);
    setMuteError('');
  };

  const confirmMute = async () => {
    if (!muteTargetUser || !Number.isFinite(muteDurationMinutes) || muteDurationMinutes <= 0) {
      setMuteError('Please enter a valid mute duration in minutes.');
      return;
    }
    const result = await discussionVM.muteUser(muteTargetUser, muteDurationMinutes, currentUser);
    if (result) {
      closeMuteModal();
    } else {
      setMuteError('Unable to apply mute. Please try again.');
    }
  };

  const applyPickedDate = (pickedDate) => {
    const current = parsedForumEnd || new Date();
    const next = new Date(current);
    next.setFullYear(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate());
    setForumEndDate(formatDateInputValue(next));
    setForumEndTime(formatTimeInputValue(next));
  };

  const applyPickedTime = (pickedTime) => {
    const current = parsedForumEnd || new Date();
    const next = new Date(current);
    next.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);
    setForumEndDate(formatDateInputValue(next));
    setForumEndTime(formatTimeInputValue(next));
  };

  const openProfile = (userID, userName) => {
    setSelectedProfile({ id: userID, name: userName });
    setShowProfile(true);
  };

  const goHome = () => {
    setShowPastForumPosts(false);
    setShowPastForums(false);
    setShowModPanel(false);
    setShowFAQ(false);
    if (discussionVM.openForums.length > 0) {
      discussionVM.selectForum(discussionVM.openForums[0].id);
    } else {
      discussionVM.selectForum(null);
    }
  };

  const userSummaries = useMemo(() => {
    const map = new Map();
    const registeredIdSet = new Set((registeredUsers || []).map((user) => user.id));
    const now = Date.now();
    const mutedMap = discussionVM.mutedUsers || {};
    const bannedMap = discussionVM.bannedUsers || {};
    const knownUsersMap = discussionVM.knownUsers || {};
    const postHistoryMap = discussionVM.postHistoryCounts || {};

    Object.entries(knownUsersMap).forEach(([userID, userName]) => {
      if (!userID || !userName) return;
      const mutedUntilTime = mutedMap[userID] ? new Date(mutedMap[userID]).getTime() : 0;
      map.set(userID, {
        id: userID,
        name: userName,
        role: 'user',
        posts: 0,
        isBanned: Boolean(bannedMap[userID]),
        isMuted: Boolean(mutedUntilTime > now),
        mutedUntil: mutedUntilTime > now ? mutedMap[userID] : null,
      });
    });

    registeredUsers.forEach((user) => {
      const mutedUntilTime = user.mutedUntil ? new Date(user.mutedUntil).getTime() : 0;
      const inMemoryMutedTime = mutedMap[user.id] ? new Date(mutedMap[user.id]).getTime() : 0;
      const effectiveMutedTime = Math.max(mutedUntilTime, inMemoryMutedTime);
      map.set(user.id, {
        id: user.id,
        name: user.username,
        role: String(user.role || 'user').toLowerCase(),
        posts: 0,
        isBanned: Boolean(user.isBanned || bannedMap[user.id]),
        isMuted: effectiveMutedTime > now,
        mutedUntil: effectiveMutedTime > now ? new Date(effectiveMutedTime).toISOString() : null,
      });
    });

    if (currentUser?.id) {
      const current = map.get(currentUser.id) || {
        id: currentUser.id,
        name: currentUser.username,
        role: String(currentUser.role || 'user').toLowerCase(),
        posts: 0,
        isBanned: false,
        isMuted: false,
        mutedUntil: null,
      };
      current.name = current.name || currentUser.username;
      current.isBanned = Boolean(current.isBanned || bannedMap[currentUser.id]);
      const mutedTime = mutedMap[currentUser.id] ? new Date(mutedMap[currentUser.id]).getTime() : 0;
      current.isMuted = Boolean(
        current.isMuted ||
        (mutedTime > now)
      );
      current.mutedUntil = mutedTime > now ? mutedMap[currentUser.id] : null;
      map.set(currentUser.id, current);
    }

    discussionVM.discussions.forEach((post) => {
      const current = map.get(post.authorID);
      if (!current) return;
      current.posts += 1;
      current.isBanned = Boolean(current.isBanned || bannedMap[post.authorID]);
      const mutedTime = mutedMap[post.authorID] ? new Date(mutedMap[post.authorID]).getTime() : 0;
      current.isMuted = Boolean(
        current.isMuted ||
        (mutedTime > now)
      );
      if (mutedTime > now) current.mutedUntil = mutedMap[post.authorID];
      map.set(post.authorID, current);
    });

    Object.keys(bannedMap).forEach((userID) => {
      if (!bannedMap[userID]) return;
      const current = map.get(userID);
      if (!current) return;
      current.isBanned = Boolean(bannedMap[userID]);
      map.set(userID, current);
    });

    Object.entries(mutedMap).forEach(([userID, mutedUntil]) => {
      const isActiveMute = Boolean(mutedUntil && new Date(mutedUntil).getTime() > now);
      if (!isActiveMute) return;
      const current = map.get(userID);
      if (!current) return;
      current.isMuted = true;
      current.mutedUntil = mutedUntil;
      map.set(userID, current);
    });

    const mergedByName = new Map();
    Array.from(map.values()).forEach((entry) => {
      const key = (entry.name || '').trim().toLowerCase();
      if (!key) return;

      const existing = mergedByName.get(key);
      if (!existing) {
        mergedByName.set(key, { ...entry, allIDs: [entry.id] });
        return;
      }

      existing.posts += entry.posts;
      if (existing.role === 'user' && entry.role && entry.role !== 'user') {
        existing.role = entry.role;
      }
      existing.isBanned = Boolean(existing.isBanned || entry.isBanned);
      existing.isMuted = Boolean(existing.isMuted || entry.isMuted);
      if (entry.mutedUntil && (!existing.mutedUntil || new Date(entry.mutedUntil).getTime() > new Date(existing.mutedUntil).getTime())) {
        existing.mutedUntil = entry.mutedUntil;
      }
      if (!existing.allIDs.includes(entry.id)) {
        existing.allIDs.push(entry.id);
      }

      const existingIsRegistered = registeredIdSet.has(existing.id);
      const incomingIsRegistered = registeredIdSet.has(entry.id);
      if (!existingIsRegistered && incomingIsRegistered) {
        existing.id = entry.id;
        existing.name = entry.name;
      }
    });

    Array.from(mergedByName.values()).forEach((entry) => {
      const historicalCount = postHistoryMap[entry.id] || 0;
      if (historicalCount > entry.posts) {
        entry.posts = historicalCount;
      }
    });

    return Array.from(mergedByName.values()).sort((a, b) => b.posts - a.posts);
  }, [discussionVM.discussions, discussionVM.mutedUsers, discussionVM.bannedUsers, discussionVM.knownUsers, discussionVM.postHistoryCounts, registeredUsers, currentUser]);

  const filteredUserSummaries = useMemo(() => {
    const query = String(userSearchQuery || '').trim().toLowerCase();
    if (!query) return userSummaries;

    const rolePrefix = 'role:';
    const idPrefix = 'id:';
    if (query.startsWith(rolePrefix)) {
      const value = query.slice(rolePrefix.length).trim();
      if (!value) return userSummaries;
      return userSummaries.filter((userItem) => String(userItem.role || '').toLowerCase().includes(value));
    }
    if (query.startsWith(idPrefix)) {
      const value = query.slice(idPrefix.length).trim();
      if (!value) return userSummaries;
      return userSummaries.filter((userItem) => String(userItem.id || '').toLowerCase().includes(value));
    }

    return userSummaries.filter((userItem) => {
      // Default search behavior is username-only to keep results predictable.
      return String(userItem.name || '').toLowerCase().includes(query);
    });
  }, [userSearchQuery, userSummaries]);

  const confirmAction = (title, message, onConfirm, deniedMessage = 'This action was not applied. Check your permissions and current forum state.') => {
    if (Platform.OS === 'web') {
      const accepted = typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false;
      if (!accepted) return;
      Promise.resolve(onConfirm?.())
        .then((result) => {
          if (result === false && typeof window !== 'undefined') {
            window.alert(deniedMessage);
          }
        })
        .catch(() => {
          if (typeof window !== 'undefined') {
            window.alert('Something went wrong while applying this action. Please try again.');
          }
        });
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await Promise.resolve(onConfirm?.());
            if (result === false) {
              Alert.alert('Action not applied', deniedMessage);
            }
          } catch {
            Alert.alert('Action failed', 'Something went wrong while applying this action. Please try again.');
          }
        },
      },
    ]);
  };

  const submitQuickReport = () => {
    if (!quickReportTarget || !canSubmitQuickReport) return;
    const trimmedCustom = quickReportCustomText.trim();
    const finalReason = quickReportReason === 'Other'
      ? `Other: ${trimmedCustom}`
      : (trimmedCustom ? `${quickReportReason} (${trimmedCustom})` : quickReportReason);
    discussionVM.reportDiscussion(quickReportTarget.id, currentUser.id, finalReason);
    setShowQuickReportModal(false);
    setQuickReportReason(REPORT_REASON_OPTIONS[0]);
    setQuickReportCustomText('');
    setQuickReportTarget(null);
  };

  // Only show the "no forums" state after the view model has hydrated to avoid a flash
  const shouldShowNoForumsState = discussionVM.isHydrated && !discussionVM.activeForum && discussionVM.openForums.length === 0 && !showPastForumPosts;

  return (
    <SafeAreaView style={styles.container}>
      {discussionVM.toast?.message ? (
        <Animated.View
          style={[
            styles.toastTop,
            (discussionVM.toast?.type === 'report' || discussionVM.toast?.type === 'danger') && styles.toastTopReport,
            { opacity: toastOpacity },
          ]}
        >
          <Text style={styles.toastTopText}>{discussionVM.toast.message}</Text>
        </Animated.View>
      ) : null}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowSideMenu(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity onPress={goHome}>
          <Text style={styles.headerTitle}>GeekCollab</Text>
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.forumBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.forumTitle}>Current Forum</Text>
          <Text style={styles.forumTitleValue}>{discussionVM.activeForum?.title || 'No forum selected'}</Text>
        </View>
        <View style={styles.forumBannerActions}>
          <TouchableOpacity style={styles.secondaryForumButton} onPress={() => setShowPastForums(true)}>
            <Text style={styles.secondaryForumButtonText}>Past</Text>
          </TouchableOpacity>
          {permissions.canCreateForums && (
            <TouchableOpacity style={styles.createForumButton} onPress={() => setShowNewForumModal(true)}>
              <Text style={styles.createForumButtonText}>Create</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {shouldShowNoForumsState ? (
        <View style={styles.noForumsContent}>
          <Text style={styles.noForumsContentText}>No forums are currently open</Text>
          <TouchableOpacity onPress={() => setShowPastForums(true)}>
            <Text style={styles.noOpenForumsLink}>View past forums</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={discussionVM.filteredDiscussions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DiscussionCard
              discussion={item}
              viewModel={discussionVM}
              currentUser={currentUser}
              onOpenProfile={openProfile}
              confirmAction={confirmAction}
              onOpenMuteModal={openMuteModal}
              openMenu={(discussion, x, y) => {
                setOverlayMenu({ visible: true, x, y, discussion });
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {overlayMenu.visible && (
        <View style={styles.overlayContainer}>
          <TouchableOpacity style={styles.overlayBackdrop} onPress={() => setOverlayMenu({ visible: false })} />
          <View
            style={[
              styles.moreMenu,
              { position: 'absolute', left: Math.max(8, overlayMenu.x - 160), top: overlayMenu.y + 8 },
            ]}
          >
            <TouchableOpacity
              style={styles.moreMenuItem}
              onPress={() => {
                setQuickReportTarget(overlayMenu.discussion);
                setShowQuickReportModal(true);
                setOverlayMenu({ visible: false });
              }}
            >
              <Text style={styles.moreMenuItemText}>Report Post ({overlayMenu.discussion.reports.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, (!permissions.canPostOrComment || discussionVM.forumIsReadOnly) && styles.fabDisabled]}
        onPress={() => setShowNewDiscussion(true)}
        disabled={!permissions.canPostOrComment || discussionVM.forumIsReadOnly}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      <Modal visible={showNewDiscussion} animationType="slide" presentationStyle="pageSheet">
        <NewDiscussionView
          viewModel={discussionVM}
          currentUser={currentUser}
          onDismiss={() => setShowNewDiscussion(false)}
        />
      </Modal>

      <Modal visible={showFAQ} animationType="slide" presentationStyle="pageSheet">
        <FAQView onClose={() => setShowFAQ(false)} />
      </Modal>

      <Modal visible={showQuickReportModal} animationType="slide" transparent>
        <View style={styles.reportModalBackdrop}>
          <View style={styles.reportModalCard}>
            <Text style={styles.reportModalTitle}>Report Post</Text>
            <Text style={styles.reportModalSubtitle}>Select a reason</Text>

            <View style={styles.reasonChipsRow}>
              {REPORT_REASON_OPTIONS.map((option) => {
                const isActive = quickReportReason === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.reasonChip, isActive && styles.reasonChipActive]}
                    onPress={() => setQuickReportReason(option)}
                  >
                    <Text style={[styles.reasonChipText, isActive && styles.reasonChipTextActive]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.reportCustomLabel}>Custom details (optional)</Text>
            <TextInput
              style={styles.reportCustomInput}
              placeholder={quickReportReason === 'Other' ? 'Required for Other reason' : 'Add extra context'}
              placeholderTextColor="#B6BFCC"
              value={quickReportCustomText}
              onChangeText={setQuickReportCustomText}
              multiline
              textAlignVertical="top"
            />

            {quickReportReason === 'Other' && !quickReportCustomText.trim() ? (
              <Text style={styles.validationText}>Please provide a custom reason for Other.</Text>
            ) : null}

            <View style={styles.reportActionsRow}>
              <TouchableOpacity
                style={styles.reportCancelButton}
                onPress={() => {
                  setShowQuickReportModal(false);
                  setQuickReportReason(REPORT_REASON_OPTIONS[0]);
                  setQuickReportCustomText('');
                  setQuickReportTarget(null);
                }}
              >
                <Text style={styles.reportCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportSubmitButton, !canSubmitQuickReport && styles.reportSubmitButtonDisabled]}
                onPress={submitQuickReport}
                disabled={!canSubmitQuickReport}
              >
                <Text style={styles.reportSubmitButtonText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPastForums} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => setShowPastForums(false)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>Past Forums</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {discussionVM.pastForums.length === 0 ? (
              <Text style={styles.emptyStateText}>No past forums yet - History will appear here! 📚</Text>
            ) : (
              discussionVM.pastForums.map((forum) => (
                <View key={forum.id} style={styles.panelCard}>
                  <Text style={styles.panelTitle}>{forum.title}</Text>
                  <Text style={styles.panelMeta}>Closed · {discussionVM.getForumPostCount(forum.id)} post(s)</Text>
                  <View style={styles.panelActionRow}>
                    <TouchableOpacity
                      style={styles.panelButton}
                      onPress={() => {
                        discussionVM.selectForum(forum.id);
                        setShowPastForumPosts(true);
                        setShowPastForums(false);
                      }}
                    >
                      <Text style={styles.panelButtonText}>View</Text>
                    </TouchableOpacity>
                    {permissions.canModerate && (
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() => discussionVM.openForum(forum.id, currentUser)}
                      >
                        <Text style={styles.panelButtonText}>Reopen</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                ))
              )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showModPanel} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => setShowModPanel(false)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>{permissions.isAdmin ? 'Admin Panel' : 'Moderator Panel'}</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={[styles.modalContent, styles.adminPanelContainer]}>
            <View style={styles.panelHeaderCard}>
              <Text style={styles.panelHeaderTitle}>
                {permissions.isAdmin ? 'Admin Control Center' : 'Moderator Control Center'}
              </Text>
              <Text style={styles.panelHeaderSubtitle}>
                {permissions.isAdmin
                  ? 'Quickly access forums, users, reports, and controls from the top of this panel.'
                  : 'Quickly access reports and moderation tools from the top of this panel.'}
              </Text>

              <View style={styles.summaryStatsRow}>
                <View style={styles.statBadge}>
                  <Text style={styles.statLabel}>Reported Posts</Text>
                  <Text style={styles.statValue}>{reportedPosts.length}</Text>
                </View>
                <View style={styles.statBadge}>
                  <Text style={styles.statLabel}>Forums</Text>
                  <Text style={styles.statValue}>{discussionVM.forums.length}</Text>
                </View>
                <View style={styles.statBadge}>
                  <Text style={styles.statLabel}>Users</Text>
                  <Text style={styles.statValue}>{registeredUsers.length}</Text>
                </View>
              </View>

              <View style={styles.panelHeaderActions}>
                {permissions.isAdmin && (
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={() => setShowNewForumModal(true)}
                  >
                    <Text style={styles.primaryActionButtonText}>Create Forum</Text>
                  </TouchableOpacity>
                )}
                {permissions.isAdmin && (
                  <TouchableOpacity
                    style={styles.secondaryActionButton}
                    onPress={() =>
                      confirmAction(
                        'Restore Default Content',
                        'This will replace the current feed with sample posts.',
                        () => discussionVM.restoreSamplePosts(currentUser)
                      )
                    }
                  >
                    <Text style={styles.secondaryActionButtonText}>Restore Default Content</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.quickActionsBar}>
              {permissions.isAdmin && (
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => setShowNewForumModal(true)}
                >
                  <Ionicons name="add-circle" size={16} color="#fff" />
                  <Text style={styles.quickActionButtonText}>Create Forum</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setModTab('reports')}
              >
                <Ionicons name="flag" size={16} color="#fff" />
                <Text style={styles.quickActionButtonText}>Reports ({reportedPosts.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setModTab('users')}
              >
                <Ionicons name="people" size={16} color="#fff" />
                <Text style={styles.quickActionButtonText}>Users ({registeredUsers.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setModTab('activity')}
              >
                <Ionicons name="time" size={16} color="#fff" />
                <Text style={styles.quickActionButtonText}>Activity</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.globalSearchContainer}>
              <TextInput
                style={styles.input}
                placeholder="Global search across all sections"
                placeholderTextColor="#B6BFCC"
                value={globalSearchQuery}
                onChangeText={setGlobalSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.adminTabBarContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adminTabsRow}>
                {[
                  { key: 'dashboard', label: 'Dashboard' },
                  { key: 'reports', label: 'Reports' },
                  { key: 'deleted', label: 'Deleted' },
                  { key: 'forums', label: 'Forums' },
                  { key: 'users', label: 'Users' },
                  { key: 'filters', label: 'Filters' },
                  { key: 'safety', label: 'Safety' },
                  { key: 'activity', label: 'Activity' },
                ].map((tab) => {
                  const isActive = modTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.adminTabChip, isActive && styles.adminTabChipActive]}
                      onPress={() => setModTab(tab.key)}
                    >
                      <Text style={[styles.adminTabChipText, isActive && styles.adminTabChipTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <ScrollView style={styles.adminPanelBody} contentContainerStyle={styles.adminPanelBodyContent}>
              {modTab === 'dashboard' && (
              <>
            <Text style={styles.panelSectionTitle}>Admin Dashboard</Text>
            <View style={styles.dashboardStatsRow}>
              <View style={styles.statCard}>
                <Ionicons name="flag" size={24} color="#DC2626" />
                <Text style={styles.statNumber}>{reportedPosts.length}</Text>
                <Text style={styles.statLabel}>Pending Reports</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="chatbubbles" size={24} color="#2563EB" />
                <Text style={styles.statNumber}>{discussionVM.discussions.length}</Text>
                <Text style={styles.statLabel}>Total Posts</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="people" size={24} color="#059669" />
                <Text style={styles.statNumber}>{registeredUsers.length}</Text>
                <Text style={styles.statLabel}>Registered Users</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="folder" size={24} color="#7C3AED" />
                <Text style={styles.statNumber}>{discussionVM.forums.length}</Text>
                <Text style={styles.statLabel}>Active Forums</Text>
              </View>
            </View>
            <View style={styles.dashboardQuickLinks}>
              <TouchableOpacity
                style={styles.quickLinkCard}
                onPress={() => setModTab('reports')}
              >
                <Ionicons name="flag" size={20} color="#DC2626" />
                <Text style={styles.quickLinkText}>Review Reports</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLinkCard}
                onPress={() => setModTab('users')}
              >
                <Ionicons name="people" size={20} color="#2563EB" />
                <Text style={styles.quickLinkText}>Manage Users</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLinkCard}
                onPress={() => setModTab('forums')}
              >
                <Ionicons name="folder" size={20} color="#059669" />
                <Text style={styles.quickLinkText}>Forum Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickLinkCard}
                onPress={() => setModTab('activity')}
              >
                <Ionicons name="time" size={20} color="#7C3AED" />
                <Text style={styles.quickLinkText}>View Activity</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Recent Activity</Text>
              {discussionVM.auditLog.slice(0, 5).map((entry) => (
                <Text key={entry.id} style={styles.recentActivityItem}>
                  {entry.action} by {entry.actorName} · {new Date(entry.createdAt).toLocaleString()}
                </Text>
              ))}
              {discussionVM.auditLog.length === 0 && (
                <Text style={styles.emptyStateText}>No recent activity.</Text>
              )}
            </View>
              </>
            )}
              {modTab === 'reports' && (
              <>
            <Text style={styles.panelSectionTitle}>Reported Posts ({filteredReportedPosts.length})</Text>
            {filteredReportedPosts.length > 0 && (
              <View style={styles.bulkActionsRow}>
                <TouchableOpacity
                  style={styles.bulkActionButton}
                  onPress={() => setSelectedReports(new Set(filteredReportedPosts.map(item => item.id)))}
                >
                  <Text style={styles.bulkActionButtonText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bulkActionButton}
                  onPress={() => setSelectedReports(new Set())}
                >
                  <Text style={styles.bulkActionButtonText}>Deselect All</Text>
                </TouchableOpacity>
                {selectedReports.size > 0 && (
                  <TouchableOpacity
                    style={[styles.bulkActionButton, styles.bulkDangerButton]}
                    onPress={() =>
                      confirmAction(
                        'Bulk Dismiss Reports',
                        `Dismiss reports for ${selectedReports.size} post(s)?`,
                        () => {
                          selectedReports.forEach(id => discussionVM.dismissReportsForDiscussion(id, currentUser));
                          setSelectedReports(new Set());
                        }
                      )
                    }
                  >
                    <Text style={styles.bulkActionButtonText}>Dismiss Selected</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Search by title or author"
              placeholderTextColor="#B6BFCC"
              value={reportsSearchQuery}
              onChangeText={setReportsSearchQuery}
              autoCapitalize="none"
            />
            {filteredReportedPosts.length === 0 ? (
              <Text style={styles.emptyStateText}>No reported posts match your search.</Text>
            ) : (
              <>
                {filteredReportedPosts.slice(0, reportsLimit).map((item) => (
                  <View key={item.id} style={styles.panelCard}>
                    <View style={styles.reportItemHeader}>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => {
                          const newSelected = new Set(selectedReports);
                          if (newSelected.has(item.id)) {
                            newSelected.delete(item.id);
                          } else {
                            newSelected.add(item.id);
                          }
                          setSelectedReports(newSelected);
                        }}
                      >
                        <Text style={styles.checkboxText}>{selectedReports.has(item.id) ? '☑' : '☐'}</Text>
                      </TouchableOpacity>
                      <Text style={styles.panelTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.panelMeta}>Author: {item.authorName} · Reports: {item.reports.length}</Text>
                    <View style={styles.panelActionRow}>
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() => setReportedPostToView(item)}
                      >
                        <Text style={styles.panelButtonText}>View Post</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() =>
                          confirmAction(
                            'Dismiss Reports',
                            'Clear all reports on this post without deleting it?',
                            () => discussionVM.dismissReportsForDiscussion(item.id, currentUser)
                          )
                        }
                      >
                        <Text style={styles.panelButtonText}>Dismiss Reports</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() =>
                          confirmAction(
                            'Delete Post',
                            'This will permanently remove this post.',
                            () => discussionVM.deleteDiscussion(item.id, currentUser)
                          )
                        }
                      >
                        <Text style={styles.panelButtonText}>Delete Post</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() => openMuteModal(item.authorID, item.authorName || item.authorID)}
                      >
                        <Text style={styles.panelButtonText}>Mute User</Text>
                      </TouchableOpacity>
                      {permissions.isAdmin && (
                        <TouchableOpacity
                          style={[styles.panelButton, styles.panelDangerButton]}
                          onPress={() =>
                            confirmAction(
                              'Ban User',
                              'Ban this user and remove all their posts?',
                              () => discussionVM.banUser(item.authorID, currentUser)
                            )
                          }
                        >
                          <Text style={styles.panelButtonText}>Ban User</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
                {filteredReportedPosts.length > reportsLimit && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => setReportsLimit(prev => prev + 10)}
                  >
                    <Text style={styles.loadMoreButtonText}>Load More ({filteredReportedPosts.length - reportsLimit} remaining)</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
              </>
            )}

            {modTab === 'deleted' && (
              <>
            <Text style={styles.panelSectionTitle}>Deleted Posts ({filteredDeletedDiscussions.length})</Text>
            <TextInput
              style={styles.input}
              placeholder="Search by title or author"
              placeholderTextColor="#B6BFCC"
              value={deletedSearchQuery}
              onChangeText={setDeletedSearchQuery}
              autoCapitalize="none"
            />
            <View style={{ marginBottom: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
                <View style={styles.forumSelectRow}>
                  {discussionVM.forums.map((forum) => (
                    <TouchableOpacity
                      key={forum.id}
                      style={[styles.forumSelectChip, deletedForumID === forum.id && styles.forumSelectChipActive]}
                      onPress={() => setDeletedForumID((prev) => (prev === forum.id ? null : forum.id))}
                    >
                      <Text style={[styles.forumSelectText, deletedForumID === forum.id && styles.forumSelectTextActive]}>
                        {forum.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            {(() => {
              const items = deletedForumID
                ? filteredDeletedDiscussions.filter((item) => item.forumID === deletedForumID)
                : filteredDeletedDiscussions;
              return items.length === 0 ? (
                <Text style={styles.emptyStateText}>No deleted posts match your search.</Text>
              ) : (
                <>
                  {items.slice(0, deletedLimit).map((item) => (
                    <View key={item.id} style={styles.panelCard}>
                      <Text style={styles.panelTitle}>{item.title}</Text>
                      <Text style={styles.panelMeta}>By {item.authorName} · Deleted {item.deletedAt ? item.deletedAt : ''}</Text>
                      <View style={styles.panelActionRow}>
                        <TouchableOpacity
                          style={styles.panelButton}
                          onPress={() => discussionVM.restoreDeletedDiscussion(item.id, currentUser)}
                        >
                          <Text style={styles.panelButtonText}>Restore</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.panelButton, styles.panelDangerButton]}
                          onPress={() => confirmAction('Purge Deleted Post', 'Permanently delete this post?', () => discussionVM.purgeDeletedDiscussion(item.id, currentUser))}
                        >
                          <Text style={styles.panelButtonText}>Purge</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {items.length > deletedLimit && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => setDeletedLimit(prev => prev + 10)}
                    >
                      <Text style={styles.loadMoreButtonText}>Load More ({items.length - deletedLimit} remaining)</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
              </>
            )}

            {modTab === 'forums' && (
              <>
            <Text style={styles.panelSectionTitle}>Forum Management ({filteredForums.length})</Text>
            <TextInput
              style={styles.input}
              placeholder="Search forums by title"
              placeholderTextColor="#B6BFCC"
              value={forumsSearchQuery}
              onChangeText={setForumsSearchQuery}
              autoCapitalize="none"
            />
            {filteredForums.map((forum) => (
              <View key={forum.id} style={styles.panelCard}>
                <Text style={styles.panelTitle}>{forum.title}</Text>
                <Text style={styles.panelMeta}>
                  {forum.isReadOnly ? 'Read-only' : 'Open'} · {discussionVM.getForumPostCount(forum.id)} post(s)
                </Text>
                {permissions.isAdmin && (
                  <View style={styles.panelSubSection}>
                    <Text style={styles.panelSubTitle}>Moderators ({forum.moderators?.length || 0})</Text>
                    {forum.moderators?.length > 0 && (
                      <View style={styles.panelActionRow}>
                        {forum.moderators.map((modID) => {
                          const modName = discussionVM.knownUsers[modID] || modID;
                          return (
                            <View key={modID} style={styles.modChip}>
                              <Text style={styles.modChipText}>{modName}</Text>
                              <TouchableOpacity
                                onPress={() =>
                                  confirmAction(
                                    'Remove Moderator',
                                    `Remove ${modName} as moderator from this forum?`,
                                    () => discussionVM.demoteModeratorFromForum(modID, forum.id, currentUser)
                                  )
                                }
                              >
                                <Text style={styles.modChipRemove}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    <View style={styles.panelActionRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                        placeholder="Add moderator by username"
                        placeholderTextColor="#B6BFCC"
                        value={forumModInput}
                        onChangeText={setForumModInput}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() => {
                          const username = forumModInput.trim();
                          if (!username) return;
                          const userID = Object.keys(discussionVM.knownUsers).find(
                            (id) => discussionVM.knownUsers[id].toLowerCase() === username.toLowerCase()
                          );
                          if (!userID) {
                            confirmAction('User Not Found', `No user found with username "${username}".`, null);
                            return;
                          }
                          confirmAction(
                            'Add Moderator',
                            `Make ${username} a moderator for this forum?`,
                            () => {
                              discussionVM.promoteUserToModeratorForForum(userID, forum.id, currentUser);
                              setForumModInput('');
                            }
                          );
                        }}
                      >
                        <Text style={styles.panelButtonText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={styles.panelActionRow}>
                  <TouchableOpacity
                    style={styles.panelButton}
                    onPress={() => {
                      discussionVM.selectForum(forum.id);
                      setShowPastForumPosts(true);
                    }}
                  >
                    <Text style={styles.panelButtonText}>View Forum</Text>
                  </TouchableOpacity>
                  {permissions.canModerate && (
                    <>
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() => {
                          const isClosed = forum.isReadOnly;
                          const title = isClosed ? 'Reopen Forum' : 'Close Forum';
                          const message = isClosed
                            ? 'Reopen this forum for posting?'
                            : 'Close this forum and switch it to read-only?';
                          const action = isClosed
                            ? () => discussionVM.openForum(forum.id, currentUser)
                            : () => discussionVM.closeForum(forum.id, currentUser);
                          confirmAction(title, message, action);
                        }}
                      >
                        <Text style={styles.panelButtonText}>
                          {forum.isReadOnly ? 'Reopen Forum' : 'Close Forum'}
                        </Text>
                      </TouchableOpacity>
                      {permissions.isAdmin && (
                        <TouchableOpacity
                          style={[styles.panelButton, styles.panelDangerButton]}
                          onPress={() =>
                            confirmAction(
                              'Delete Forum',
                              'Delete this forum and all posts inside it?',
                              () => discussionVM.deleteForum(forum.id, currentUser)
                            )
                          }
                        >
                          <Text style={styles.panelButtonText}>Delete Forum</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            ))}
              </>
            )}

            {modTab === 'users' && (
              <>
            <Text style={styles.panelSectionTitle}>User Management ({filteredUserSummaries.length})</Text>
            <TextInput
              style={styles.input}
              placeholder="Search username (or role:admin, id:xxxxx)"
              placeholderTextColor="#B6BFCC"
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
              autoCapitalize="none"
            />
            {filteredUserSummaries.map((userItem) => (
              <View key={userItem.id} style={styles.panelCard}>
                <View style={styles.userTitleRow}>
                  <Text style={styles.panelTitle}>{userItem.name}</Text>
                  <View style={styles.userStatusRow}>
                    {userItem.isBanned && (
                      <View style={[styles.userStatusChip, styles.userStatusChipBanned]}>
                        <Text style={[styles.userStatusChipText, styles.userStatusChipTextBanned]}>BANNED</Text>
                      </View>
                    )}
                    {!userItem.isBanned && userItem.isMuted && (
                      <View style={[styles.userStatusChip, styles.userStatusChipMuted]}>
                        <Text style={[styles.userStatusChipText, styles.userStatusChipTextMuted]}>
                          {formatMutedTime(userItem.mutedUntil) || 'MUTED'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.panelMeta}>{userItem.posts} post(s) · role: {userItem.role || 'user'}</Text>
                {userActivity[userItem.id] && (
                  <Text style={styles.panelMeta}>
                    Last active: {userActivity[userItem.id].lastActivity} · 
                    Recent: {userActivity[userItem.id].recentPosts} posts, {userActivity[userItem.id].recentComments} comments
                  </Text>
                )}
                <View style={styles.panelActionRow}>
                  {(() => {
                    const targetUserIDs = (userItem.allIDs && userItem.allIDs.length > 0)
                      ? userItem.allIDs
                      : [userItem.id];
                    return (
                      <>
                  <TouchableOpacity
                    style={styles.panelButton}
                    onPress={() => openProfile(userItem.id, userItem.name)}
                  >
                    <Text style={styles.panelButtonText}>Open Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.panelButton}
                    onPress={() =>
                      confirmAction(
                        'Delete User Posts',
                        'Delete all posts by this user?',
                        () => discussionVM.deletePostsByAuthor(userItem.id, currentUser, {
                          authorName: userItem.name,
                          additionalAuthorIDs: targetUserIDs,
                        })
                      )
                    }
                  >
                    <Text style={styles.panelButtonText}>Delete User Posts</Text>
                  </TouchableOpacity>

                  {!userItem.isBanned && permissions.canModerate && (
                    <TouchableOpacity
                      style={styles.panelButton}
                      onPress={() => openMuteModal(userItem.id, userItem.name)}
                    >
                      <Text style={styles.panelButtonText}>Mute User</Text>
                    </TouchableOpacity>
                  )}

                  {userItem.isMuted && permissions.canModerate && (
                    <TouchableOpacity
                      style={styles.panelButton}
                      onPress={() =>
                        confirmAction(
                          'Unmute User',
                          'Remove mute for this user?',
                          async () => {
                            const results = await Promise.all(
                              targetUserIDs.map((userID) => discussionVM.unmuteUser(userID, currentUser))
                            );
                            return results.some(Boolean);
                          }
                        )
                      }
                    >
                      <Text style={styles.panelButtonText}>Unmute User</Text>
                    </TouchableOpacity>
                  )}

                  {permissions.isAdmin && !userItem.isBanned && (
                    <TouchableOpacity
                      style={[styles.panelButton, styles.panelDangerButton]}
                      onPress={() =>
                        confirmAction(
                          'Ban User',
                          'Ban this user and remove all their posts?',
                          async () => {
                            const results = await Promise.all(
                              targetUserIDs.map((userID) => discussionVM.banUser(userID, currentUser))
                            );
                            return results.some(Boolean);
                          }
                        )
                      }
                    >
                      <Text style={styles.panelButtonText}>Ban User</Text>
                    </TouchableOpacity>
                  )}

                  {permissions.isAdmin && userItem.isBanned && (
                    <TouchableOpacity
                      style={styles.panelButton}
                      onPress={() =>
                        confirmAction(
                          'Unban User',
                          'Remove ban for this user?',
                          async () => {
                            const results = await Promise.all(
                              targetUserIDs.map((userID) => discussionVM.unbanUser(userID, currentUser))
                            );
                            return results.some(Boolean);
                          }
                        )
                      }
                    >
                      <Text style={styles.panelButtonText}>Unban User</Text>
                    </TouchableOpacity>
                  )}

                  {permissions.isAdmin && (
                    <>
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() => {
                          if (!discussionVM.selectedForumID) {
                            confirmAction(
                              'Select Forum First',
                              'Please select a forum from the forums tab to manage mods.',
                              null
                            );
                            return;
                          }
                          confirmAction(
                            'Make Moderator',
                            `Make this user a moderator for the current forum?`,
                            () => discussionVM.promoteUserToModeratorForForum(
                              userItem.id,
                              discussionVM.selectedForumID,
                              currentUser
                            )
                          );
                        }}
                      >
                        <Text style={styles.panelButtonText}>Make Mod for Forum</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() => {
                          if (!discussionVM.selectedForumID) {
                            confirmAction(
                              'Select Forum First',
                              'Please select a forum from the forums tab to manage mods.',
                              null
                            );
                            return;
                          }
                          confirmAction(
                            'Remove from Mod',
                            `Remove this user as a moderator from the current forum?`,
                            () => discussionVM.demoteModeratorFromForum(
                              userItem.id,
                              discussionVM.selectedForumID,
                              currentUser
                            )
                          );
                        }}
                      >
                        <Text style={styles.panelButtonText}>Remove as Mod from Forum</Text>
                      </TouchableOpacity>
                    </>
                  )}
                      </>
                    );
                  })()}
                </View>
              </View>
            ))}
            {filteredUserSummaries.length === 0 ? (
              <Text style={styles.emptyStateText}>No users matched your search.</Text>
            ) : null}
              </>
            )}

            {modTab === 'users' && filteredUserSummaries.length > 0 && filteredUserSummaries.length >= usersLimit && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => setUsersLimit(prev => prev + 20)}
              >
                <Text style={styles.loadMoreText}>Load More Users</Text>
              </TouchableOpacity>
            )}

            {modTab === 'activity' && (
              <>
            <Text style={styles.panelSectionTitle}>Moderator Activity Log</Text>
            {discussionVM.auditLog.length === 0 ? (
              <Text style={styles.emptyStateText}>No moderation actions have been recorded yet.</Text>
            ) : (
              discussionVM.auditLog.map((entry) => (
                <View key={entry.id} style={styles.panelCard}>
                  <Text style={styles.panelTitle}>{entry.action}</Text>
                  <Text style={styles.panelMeta}>{entry.target || 'General'} · {new Date(entry.createdAt).toLocaleString()}</Text>
                  <Text style={styles.panelDescription}>{entry.details || 'No additional details.'}</Text>
                  <Text style={styles.panelMeta}>By {entry.actorName || 'system'}</Text>
                </View>
              ))
            )}
              </>
            )}
            {modTab === 'safety' && (
              <>
            <Text style={styles.panelSectionTitle}>Safety & Moderation Tools</Text>
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Quarantine ({quarantinedPosts.length})</Text>
              <Text style={styles.panelMeta}>Posts held for review (auto-flagged for blocked content)</Text>
              {quarantinedPosts.length === 0 ? (
                <Text style={styles.emptyStateText}>No quarantined posts at this time.</Text>
              ) : (
                quarantinedPosts.slice(0, 5).map((post) => (
                  <View key={post.id} style={styles.quarantineItem}>
                    <Text style={styles.panelTitle}>{post.title}</Text>
                    <Text style={styles.panelMeta}>By {post.authorName} · {new Date(post.createdAt).toLocaleDateString()}</Text>
                    <View style={styles.panelActionRow}>
                      <TouchableOpacity
                        style={styles.panelButton}
                        onPress={() => openDiscussion(post.id)}
                      >
                        <Text style={styles.panelButtonText}>Review</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.panelButton, styles.panelButtonDanger]}
                        onPress={() => {
                          confirmAction(
                            'Delete Quarantined Post',
                            'Permanently delete this quarantined post?',
                            () => discussionVM.deleteDiscussion(post.id, currentUser)
                          );
                        }}
                      >
                        <Text style={styles.panelButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Auto-Moderation Settings</Text>
              <Text style={styles.panelMeta}>Configure automatic content filtering</Text>
              <Text style={styles.emptyStateText}>Settings coming soon.</Text>
            </View>
              </>
            )}
            {modTab === 'filters' && (
              <>
            <Text style={styles.panelSectionTitle}>Content Filter ({discussionVM.blockedWords.length})</Text>
            <View style={styles.panelCard}>
              <Text style={styles.panelMeta}>By default, swearing is blocked automatically. Add extra custom words below if needed.</Text>
              <View style={styles.filterManageRow}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Add custom blocked word"
                  placeholderTextColor="#B6BFCC"
                  value={filterWordInput}
                  onChangeText={setFilterWordInput}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.panelButton}
                  onPress={() => {
                    discussionVM.addBlockedWord(filterWordInput, currentUser);
                    setFilterWordInput('');
                  }}
                >
                  <Text style={styles.panelButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.panelActionRow}>
                {discussionVM.blockedWords.map((word) => (
                  <View key={word} style={styles.wordChip}>
                    <Text style={styles.wordChipText}>{word}</Text>
                    <TouchableOpacity onPress={() => discussionVM.removeBlockedWord(word, currentUser)}>
                      <Text style={styles.wordChipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
              </>
            )}
          </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={showProfile} animationType="slide" presentationStyle="pageSheet">
        <UserProfileView
          userID={selectedProfile.id}
          userName={selectedProfile.name}
          viewModel={discussionVM}
          onClose={() => setShowProfile(false)}
        />
      </Modal>

      <Modal visible={showProfileEdit} animationType="slide" presentationStyle="pageSheet">
        <ProfileEditView
          currentUser={currentUser}
          authVM={authVM}
          onClose={() => setShowProfileEdit(false)}
          onSaveProfile={() => {
            // Profile saved, can refresh if needed
          }}
        />
      </Modal>

      <SideMenuDrawer
        visible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        currentUser={currentUser}
        forums={discussionVM.openForums}
        activeForum={discussionVM.activeForum}
        onSelectForum={(forumID) => discussionVM.selectForum(forumID)}
        onEditProfile={() => {
          setShowSideMenu(false);
          setShowProfileEdit(true);
        }}
        onLogout={onLogout}
        permissions={permissions}
        onAdminPanel={() => setShowModPanel(true)}
      />

      <Modal visible={showNewForumModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => setShowNewForumModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>New Forum</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.label}>Forum title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Workshop"
              placeholderTextColor="#B6BFCC"
              value={forumTitle}
              onChangeText={setForumTitle}
            />
            {forumTitleHasBlockedLanguage ? (
              <Text style={styles.validationText}>Blocked language detected in forum title.</Text>
            ) : null}

            <Text style={styles.label}>End date</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                ref={webDateInputRef}
                value={forumEndDate}
                onChange={(event) => setForumEndDate(event.target.value)}
                onClick={() => webDateInputRef.current?.showPicker?.()}
                onFocus={() => webDateInputRef.current?.showPicker?.()}
                style={webPickerInputStyle}
              />
            ) : (
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowEndDatePicker(true)}>
                <Text style={styles.pickerButtonText}>{parsedForumEnd ? formatDisplayDate(parsedForumEnd) : 'Select end date'}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>End time (24h)</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                ref={webTimeInputRef}
                value={forumEndTime}
                onChange={(event) => setForumEndTime(event.target.value)}
                onClick={() => webTimeInputRef.current?.showPicker?.()}
                onFocus={() => webTimeInputRef.current?.showPicker?.()}
                style={webPickerInputStyle}
              />
            ) : (
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowEndTimePicker(true)}>
                <Text style={styles.pickerButtonText}>{parsedForumEnd ? formatDisplayTime(parsedForumEnd) : 'Select end time'}</Text>
              </TouchableOpacity>
            )}
            {!isForumEndFuture ? (
              <Text style={styles.validationText}>End date/time must be in the future.</Text>
            ) : null}

            <Text style={styles.label}>Forum Moderators (Optional)</Text>
            <Text style={styles.labelHint}>Select users to be moderators for this forum</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moderatorSelectRow}>
              {registeredUsers.map((user) => {
                const isSelected = selectedForumModerators.includes(user.id);
                const isSelf = user.id === currentUser?.id;
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.moderatorSelectChip,
                      isSelected && styles.moderatorSelectChipActive,
                      isSelf && styles.moderatorSelectChipDisabled,
                    ]}
                    onPress={() => {
                      if (isSelf) return;
                      setSelectedForumModerators((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== user.id)
                          : [...prev, user.id]
                      );
                    }}
                    disabled={isSelf}
                  >
                    <Text
                      style={[
                        styles.moderatorSelectChipText,
                        isSelected && styles.moderatorSelectChipTextActive,
                      ]}
                    >
                      {user.username}{isSelected ? ' ✓' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {Platform.OS !== 'web' && showEndDatePicker ? (
              <DateTimePicker
                value={parsedForumEnd || new Date()}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    applyPickedDate(selectedDate);
                  }
                }}
              />
            ) : null}

            {Platform.OS !== 'web' && showEndTimePicker ? (
              <DateTimePicker
                value={parsedForumEnd || new Date()}
                mode="time"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowEndTimePicker(false);
                  if (selectedDate) {
                    applyPickedTime(selectedDate);
                  }
                }}
              />
            ) : null}

            <TouchableOpacity
              style={[styles.createButton, !canCreateForum && styles.createButtonDisabled]}
              onPress={submitForumCreation}
              disabled={!canCreateForum}
            >
              <Text style={styles.createButtonText}>Create Forum</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={showMuteModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={closeMuteModal}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>Mute User</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.label}>User</Text>
            <Text style={styles.panelMeta}>{muteTargetName || 'Unknown user'}</Text>
            <Text style={styles.label}>Mute duration</Text>
            <View style={styles.durationPresetsRow}>
              {[15, 30, 60, 120].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.durationPreset,
                    muteDurationMinutes === value && styles.durationPresetActive,
                  ]}
                  onPress={() => setMuteDurationMinutes(value)}
                >
                  <Text
                    style={[
                      styles.durationPresetText,
                      muteDurationMinutes === value && styles.durationPresetTextActive,
                    ]}
                  >
                    {value} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Custom duration in minutes"
              placeholderTextColor="#B6BFCC"
              value={String(muteDurationMinutes)}
              keyboardType="numeric"
              onChangeText={(value) => setMuteDurationMinutes(Number(value) || 0)}
            />
            {muteError ? <Text style={styles.validationText}>{muteError}</Text> : null}
            <TouchableOpacity style={styles.createButton} onPress={confirmMute}>
              <Text style={styles.createButtonText}>Apply Mute</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(reportedPostToView)} animationType="slide" presentationStyle="pageSheet">
        {reportedPostToView ? (
          <DiscussionDetailView
            discussion={reportedPostToView}
            viewModel={discussionVM}
            currentUser={currentUser}
            onOpenProfile={openProfile}
            onBack={() => setReportedPostToView(null)}
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  forumBanner: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forumTitle: { fontWeight: '600', color: '#6B7280', fontSize: 12 },
  forumTitleValue: { fontWeight: '700', color: '#111827', fontSize: 15, marginTop: 2 },
  noOpenForumsLink: { color: '#2563EB', fontSize: 18, fontWeight: '700', marginTop: 10 },
  noForumsContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  noForumsContentText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  forumBannerActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  secondaryForumButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryForumButtonText: { color: '#1D4ED8', fontWeight: '600', fontSize: 11 },
  createForumButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createForumButtonText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  listContent: { padding: 12, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    position: 'relative',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.06)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        }),
    elevation: 2,
  },
  cardAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  cardAuthorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAuthorAvatarText: { color: '#2563EB', fontWeight: '700', fontSize: 15 },
  cardAuthorName: { fontWeight: '600', fontSize: 14 },
  cardAuthorDate: { fontSize: 11, color: '#9CA3AF' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  cardDescription: { fontSize: 13, color: '#6B7280' },
  reportedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reportedBadgeText: { fontSize: 11, color: '#92400E', fontWeight: '700' },
  cardImage: {
    width: '100%',
    maxHeight: 260,
    minHeight: 140,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tagsRow: { marginTop: 2 },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
  },
  tagText: { fontSize: 11, color: '#2563EB' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: '#6B7280' },
  moreMenuWrapper: { position: 'absolute', top: 12, right: 12, zIndex: 50, elevation: 8 },
  moreButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  moreMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 160,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 4,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.10)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }),
    elevation: 4,
    zIndex: 120,
  },
  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 },
  overlayBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  moreMenuItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  moreMenuItemText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  reportModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  reportModalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  reportModalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  reportModalSubtitle: { fontSize: 12, color: '#6B7280' },
  reasonChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
  },
  reasonChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  reasonChipText: { fontSize: 12, color: '#374151' },
  reasonChipTextActive: { color: '#1D4ED8', fontWeight: '700' },
  reportCustomLabel: { fontSize: 12, color: '#6B7280' },
  reportCustomInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  reportActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  reportCancelButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reportCancelButtonText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  reportSubmitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reportSubmitButtonDisabled: { backgroundColor: '#93C5FD' },
  reportSubmitButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  viewLink: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  deleteLink: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  moderationRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  moderationButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  banButton: { backgroundColor: '#FECACA' },
  moderationButtonText: { fontSize: 11, color: '#374151', fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(37, 99, 235, 0.35)' }
      : {
          shadowColor: '#2563EB',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        }),
    elevation: 6,
  },
  fabDisabled: { backgroundColor: '#93C5FD' },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: { color: '#2563EB', fontSize: 16 },
  navTitle: { fontWeight: '600', fontSize: 16 },
  modalContent: { flex: 1, padding: 16, gap: 12 },
  adminPanelContainer: { flex: 1 },
  adminTabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
    marginBottom: 12,
  },
  globalSearchContainer: {
    marginBottom: 12,
  },
  bulkActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  bulkActionButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bulkActionButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  bulkDangerButton: {
    backgroundColor: '#FECACA',
  },
  reportItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxText: {
    fontSize: 16,
  },
  adminPanelBody: { flex: 1 },
  adminPanelBodyContent: { gap: 14, paddingBottom: 32 },
  label: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  pickerButtonText: { fontSize: 15, color: '#111827' },
  createButton: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: { backgroundColor: '#93C5FD' },
  createButtonText: { color: '#fff', fontWeight: '600' },
  validationText: { fontSize: 12, color: '#DC2626' },
  panelHeaderCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0EA5E9',
    padding: 16,
    gap: 4,
  },
  panelHeaderTitle: { color: '#0369A1', fontWeight: '700', fontSize: 16 },
  panelHeaderSubtitle: { color: '#4B5563', fontSize: 13, marginBottom: 8 },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 8,
  },
  statBadge: {
    flex: 1,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  statLabel: { fontSize: 10, color: '#0369A1', fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#0EA5E9', marginTop: 4 },
  adminTabsRow: { paddingVertical: 2, gap: 8 },
  adminTabChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  adminTabChipActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#0EA5E9',
  },
  adminTabChipText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  adminTabChipTextActive: { color: '#FFF', fontWeight: '700' },
  restorePostsButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  restorePostsButtonText: { color: '#1E40AF', fontSize: 12, fontWeight: '700' },
  panelHeaderActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 14,
  },
  primaryActionButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryActionButtonText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  durationPresetsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  durationPreset: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  durationPresetActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  durationPresetText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  durationPresetTextActive: {
    color: '#1D4ED8',
  },
  panelSectionTitle: { fontSize: 13, color: '#374151', fontWeight: '700', marginTop: 2 },
  panelCard: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  userTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userStatusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  userStatusChipBanned: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  userStatusChipMuted: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  userStatusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  userStatusChipTextBanned: {
    color: '#B91C1C',
  },
  userStatusChipTextMuted: {
    color: '#92400E',
  },
  panelTitle: { color: '#111827', fontWeight: '700' },
  panelMeta: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  panelDescription: { color: '#4B5563', fontSize: 13, lineHeight: 18, marginTop: 6 },
  panelActionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  forumSelectRow: { flexDirection: 'row', gap: 8 },
  forumSelectChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  forumSelectChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  forumSelectText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  forumSelectTextActive: { color: '#1D4ED8' },
  moderatorSelectRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  moderatorSelectChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  moderatorSelectChipActive: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  moderatorSelectChipDisabled: {
    opacity: 0.5,
  },
  moderatorSelectChipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  moderatorSelectChipTextActive: { color: '#059669' },
  labelHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -4,
    marginBottom: 8,
  },
  panelSubSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  panelSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  modChipText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
    marginRight: 4,
  },
  modChipRemove: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  filterManageRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  panelButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  panelDangerButton: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  panelButtonText: { fontSize: 12, color: '#1F2937', fontWeight: '600' },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  wordChipText: { color: '#991B1B', fontSize: 12, fontWeight: '700' },
  wordChipRemove: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
  emptyStateText: { color: '#9CA3AF', fontSize: 13 },
  quarantineItem: {
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  loadMoreButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  loadMoreText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  toastTop: {
    position: 'absolute',
    top: 72,
    alignSelf: 'center',
    zIndex: 20,
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 18,
    minWidth: 260,
    alignItems: 'center',
  },
  toastTopReport: {
    backgroundColor: '#DC2626',
  },
  toastTopText: { color: '#F9FAFB', fontWeight: '800', fontSize: 19, textAlign: 'center' },
});

// Re-export with authVM prop passed from parent
export const ForumHomeViewWithAuth = (props) => <ForumHomeView {...props} />;
export default ForumHomeView;

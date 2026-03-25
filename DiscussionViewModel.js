// DiscussionViewModel.js - Discussion state & logic (converted from DiscussionViewModel.swift)
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createDiscussion, createComment, createForumConfig } from './Models';
import { getForumState, saveForumState } from './StorageExtension';
import { updateUserBanStatus, updateUserMuteStatus } from './StorageExtension';
import uuid from 'react-native-uuid';

const FILTERS = ['Latest', 'Popular', 'Trending', 'Reported'];
const DEFAULT_DICTIONARY_FILTER = ['spam', 'scam', 'hate'];
const SAMPLE_USER_IDS = {
  varun: 'sample-user-varun',
  ekansh_mishra: 'sample-user-ekansh_mishra',
  si_yuan: 'sample-user-si_yuan',
  zwe: 'sample-user-zwe',
  paul: 'sample-user-paul',
};

const nowIso = () => new Date().toISOString();
const isForumExpired = (forum) => new Date(forum.expiresAt).getTime() <= Date.now();

const applyFilter = (discussions, filter) => {
  switch (filter) {
    case 'Latest':
      return [...discussions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'Popular':
      return [...discussions].sort((a, b) => b.likes - a.likes);
    case 'Trending':
      return [...discussions].sort(
        (a, b) => (b.likes + b.comments.length) - (a.likes + a.comments.length)
      );
    case 'Reported':
      return [...discussions]
        .filter((discussion) => discussion.reports.length > 0)
        .sort((a, b) => b.reports.length - a.reports.length);
    default:
      return discussions;
  }
};

const sanitizeText = (text, blockedWords) => {
  let blockedCount = 0;
  const sanitized = text.replace(/\b([a-zA-Z]+)\b/g, (token) => {
    const shouldBlock = blockedWords.includes(token.toLowerCase());
    if (shouldBlock) {
      blockedCount += 1;
      return '*'.repeat(token.length);
    }
    return token;
  });
  return { sanitized, blockedCount };
};

const loadMockDiscussions = () => [
  createDiscussion({
    id: uuid.v4(),
    authorID: SAMPLE_USER_IDS.varun,
    authorName: 'varun',
    title: 'Geekshacking is awesome!',
    description: 'My opinion about Geekshacking',
    content:
      'Geekshacking is such a cool and amazing company with volunteers that are true to themselves and dedicated to serving and assisting the global community through their inspirations and passion in technology. After attending their hackomania 2026 pre-event I got to learn so much about them and their work. It is truly admiring to see such a positive and inspiring company that is working towards making a difference in people\'s lives rather than just for the money. I would highly recommend volunteering for anyone looking to learn more about Geekshacking and the geeky stuff they do.',
    tags: ['GeeksHacking', 'Hackomania2026', 'Technology'],
    comments: [
      createComment({
        id: uuid.v4(),
        authorID: SAMPLE_USER_IDS.zwe,
        authorName: 'zwe',
        text: 'This company is gold!',
        createdAt: new Date(Date.now() - 900_000).toISOString(),
      }),
    ],
    likes: 67,
    createdAt: new Date(Date.now() - 7_200_000).toISOString(),
    updatedAt: new Date(Date.now() - 1_800_000).toISOString(),
  }),
  createDiscussion({
    id: uuid.v4(),
    authorID: SAMPLE_USER_IDS.ekansh_mishra,
    authorName: 'ekansh_mishra',
    title: 'All about The Something Company',
    description: 'cool beans stuff',
    content:
      "The Something Company is so awesome sauce and I'm so proud to be the team's COO. We're building the future of work and I can't wait to see all the amazing things we'll achieve together.",
    tags: ['TheSomethingCompany', 'beourclientpls'],
    comments: [
      createComment({
        id: uuid.v4(),
        authorID: SAMPLE_USER_IDS.paul,
        authorName: 'paul',
        text: 'I love working here, everyone should totally give us all their money.',
        createdAt: new Date(Date.now() - 900_000).toISOString(),
      }),
      createComment({
        id: uuid.v4(),
        authorID: SAMPLE_USER_IDS.si_yuan,
        authorName: 'si_yuan',
        text: 'As CEO of TSC, I am very proud that our team is comfortable with their work here.',
        createdAt: new Date(Date.now() - 900_000).toISOString(),
      }),
    ],
    likes: 41,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
  }),
  createDiscussion({
    id: uuid.v4(),
    authorID: SAMPLE_USER_IDS.si_yuan,
    authorName: 'si_yuan',
    title: 'check out my vibecoded website its so cool',
    description: 'visit at localhost:8000',
    content: 'built using claude, chatgpt, gemini and everything but my brain',
    tags: ['AI'],
    comments: [],
    likes: 3,
    createdAt: new Date(Date.now() - 10_800_000).toISOString(),
    updatedAt: new Date(Date.now() - 900_000).toISOString(),
  }),
];

export const useDiscussionViewModel = () => {
  const [discussions, setDiscussions] = useState(loadMockDiscussions);
  const [selectedFilter, setSelectedFilter] = useState('Latest');
  const [notifications, setNotifications] = useState([]);
  const [knownUsers, setKnownUsers] = useState({});
  const [postHistoryCounts, setPostHistoryCounts] = useState({});
  const [mutedUsers, setMutedUsers] = useState({});
  const [bannedUsers, setBannedUsers] = useState({});
  const [blockedWords, setBlockedWords] = useState(DEFAULT_DICTIONARY_FILTER);
  const [clockTick, setClockTick] = useState(Date.now());
  const [forums, setForums] = useState(() => {
    const initialForum = createForumConfig({
      id: uuid.v4(),
      title: 'General Discussion',
      createdByID: 'system',
      createdByName: 'system',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });
    return [initialForum];
  });
  const [selectedForumID, setSelectedForumID] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const selectedForum = useMemo(() => {
    if (!forums.length) return null;
    const match = forums.find((forum) => forum.id === selectedForumID);
    return match || forums[0];
  }, [forums, selectedForumID]);

  const pastForums = useMemo(
    () => forums.filter((forum) => forum.isReadOnly || isForumExpired(forum)),
    [forums]
  );

  const openForums = useMemo(
    () => forums.filter((forum) => !forum.isReadOnly && !isForumExpired(forum)),
    [forums]
  );

  useEffect(() => {
    const hydrate = async () => {
      const stored = await getForumState();
      if (stored) {
        if (Array.isArray(stored.discussions)) {
          setDiscussions(stored.discussions);
        }
        if (Array.isArray(stored.forums) && stored.forums.length > 0) {
          setForums(stored.forums);
          setSelectedForumID(stored.selectedForumID || stored.forums[0].id);
        } else if (stored.activeForum) {
          setForums([stored.activeForum]);
          setSelectedForumID(stored.activeForum.id);
        }
        if (stored.mutedUsers && typeof stored.mutedUsers === 'object') {
          setMutedUsers(stored.mutedUsers);
        }
        if (stored.bannedUsers && typeof stored.bannedUsers === 'object') {
          setBannedUsers(stored.bannedUsers);
        }
        if (Array.isArray(stored.blockedWords)) {
          setBlockedWords(stored.blockedWords);
        }
        if (Array.isArray(stored.notifications)) {
          setNotifications(stored.notifications);
        }
        if (stored.knownUsers && typeof stored.knownUsers === 'object') {
          setKnownUsers(stored.knownUsers);
        }
        if (stored.postHistoryCounts && typeof stored.postHistoryCounts === 'object') {
          setPostHistoryCounts(stored.postHistoryCounts);
        }
      }
      setIsHydrated(true);
    };
    hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveForumState({
      discussions,
      forums,
      selectedForumID,
      mutedUsers,
      bannedUsers,
      blockedWords,
      notifications,
      knownUsers,
      postHistoryCounts,
    });
  }, [isHydrated, discussions, forums, selectedForumID, mutedUsers, bannedUsers, blockedWords, notifications, knownUsers, postHistoryCounts]);

  useEffect(() => {
    const interval = setInterval(() => {
      setClockTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const enqueueNotification = useCallback((message, type = 'info') => {
    const notification = { id: uuid.v4(), message, type, createdAt: nowIso() };
    setNotifications((prev) => [
      notification,
      ...prev,
    ].slice(0, 12));
    setToast(notification);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2300);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const dismissNotification = useCallback((notificationID) => {
    setNotifications((prev) => prev.filter((note) => note.id !== notificationID));
  }, []);

  useEffect(() => {
    if (!forums.length) return;
    setForums((prev) => {
      let changed = false;
      const next = prev.map((forum) => {
        const expired = new Date(forum.expiresAt).getTime() <= clockTick;
        if (expired && !forum.isReadOnly) {
          changed = true;
          enqueueNotification(`Forum \"${forum.title}\" is now closed and read-only.`);
          return { ...forum, isReadOnly: true };
        }
        return forum;
      });
      return changed ? next : prev;
    });
  }, [forums.length, clockTick, enqueueNotification]);

  const forumIsReadOnly = useMemo(() => {
    if (!selectedForum) return true;
    if (selectedForum.isReadOnly) return true;
    return new Date(selectedForum.expiresAt).getTime() <= clockTick;
  }, [selectedForum, clockTick]);

  const filteredDiscussions = useMemo(() => {
    const list = applyFilter(discussions, selectedFilter);
    if (!selectedForum) return [];
    return list.filter((discussion) => discussion.forumID === selectedForum.id);
  }, [discussions, selectedFilter, selectedForum]);

  useEffect(() => {
    if (!selectedForum?.id) return;
    setDiscussions((prev) => {
      let changed = false;
      const next = prev.map((discussion) => {
        if (!discussion.forumID) {
          changed = true;
          return { ...discussion, forumID: selectedForum.id };
        }
        return discussion;
      });
      return changed ? next : prev;
    });
  }, [selectedForum?.id]);

  useEffect(() => {
    setKnownUsers((prev) => {
      let changed = false;
      const next = { ...prev };

      discussions.forEach((discussion) => {
        if (discussion.authorID && discussion.authorName && !next[discussion.authorID]) {
          next[discussion.authorID] = discussion.authorName;
          changed = true;
        }
        (discussion.comments || []).forEach((comment) => {
          if (comment.authorID && comment.authorName && !next[comment.authorID]) {
            next[comment.authorID] = comment.authorName;
            changed = true;
          }
        });
      });

      return changed ? next : prev;
    });
  }, [discussions]);

  useEffect(() => {
    const currentCounts = discussions.reduce((acc, discussion) => {
      const authorID = discussion.authorID;
      if (!authorID) return acc;
      acc[authorID] = (acc[authorID] || 0) + 1;
      return acc;
    }, {});

    setPostHistoryCounts((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.entries(currentCounts).forEach(([authorID, count]) => {
        const existing = next[authorID] || 0;
        if (count > existing) {
          next[authorID] = count;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [discussions]);

  const getPermissionSummary = useCallback((user) => {
    if (!user) {
      return {
        role: 'guest',
        isAdmin: false,
        isModerator: false,
        canCreateForums: false,
        canModerate: false,
        canPostOrComment: false,
        isMuted: true,
        isBanned: true,
      };
    }
    const role = String(user?.role || 'user').trim().toLowerCase();
    const isAdmin = role === 'admin';
    const isModerator = role === 'moderator';
    const persistedMutedUntil = user?.mutedUntil || null;
    const inMemoryMutedUntil = user?.id ? mutedUsers[user.id] : null;
    const effectiveMutedUntil = inMemoryMutedUntil || persistedMutedUntil;
    const isMuted = Boolean(
      effectiveMutedUntil && new Date(effectiveMutedUntil).getTime() > Date.now()
    );
    const isBanned = Boolean(user?.id && bannedUsers[user.id]);
    return {
      role,
      isAdmin,
      isModerator,
      canCreateForums: isAdmin,
      canModerate: isAdmin || isModerator,
      canPostOrComment: !forumIsReadOnly && !isMuted && !isBanned,
      isMuted,
      isBanned,
    };
  }, [bannedUsers, mutedUsers, forumIsReadOnly]);

  const createForum = useCallback((title, durationMinutes, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canCreateForums) {
      enqueueNotification('Only admins can create forums.');
      return false;
    }
    if (!title.trim() || durationMinutes <= 0) {
      enqueueNotification('Forum title and duration are required.');
      return false;
    }
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const newForum = createForumConfig({
      id: uuid.v4(),
      title: title.trim(),
      createdByID: actor.id,
      createdByName: actor.username,
      expiresAt,
      isReadOnly: false,
    });
    setForums((prev) => [newForum, ...prev]);
    setSelectedForumID(newForum.id);
    enqueueNotification(`New forum \"${title.trim()}\" is live for ${durationMinutes} minute(s).`);
    return true;
  }, [enqueueNotification, getPermissionSummary]);

  const selectForum = useCallback((forumID) => {
    setSelectedForumID(forumID);
  }, []);

  const createDiscussionPost = useCallback((title, description, content, image, tags, author, forumID) => {
    const permissions = getPermissionSummary(author);
    if (!permissions.canPostOrComment) {
      enqueueNotification(
        permissions.isBanned
          ? 'Banned users cannot post.'
          : permissions.isMuted
            ? 'You are temporarily muted and cannot post right now.'
            : 'This forum is read-only.'
        ,
        permissions.isBanned || permissions.isMuted ? 'danger' : 'info'
      );
      return;
    }
    const titleResult = sanitizeText(title.trim(), blockedWords);
    const descriptionResult = sanitizeText((description || '').trim(), blockedWords);
    const contentResult = sanitizeText(content.trim(), blockedWords);

    const newDiscussion = createDiscussion({
      id: uuid.v4(),
      authorID: author.id,
      authorName: author.username,
      title: titleResult.sanitized,
      description: descriptionResult.sanitized,
      content: contentResult.sanitized,
      image: image || null,
      tags,
      forumID: forumID || selectedForum?.id || null,
    });
    setDiscussions((prev) => [newDiscussion, ...prev]);
    setPostHistoryCounts((prev) => ({
      ...prev,
      [author.id]: (prev[author.id] || 0) + 1,
    }));
    const blocked = titleResult.blockedCount + descriptionResult.blockedCount + contentResult.blockedCount;
    if (blocked > 0) {
      enqueueNotification(`Word filter replaced ${blocked} blocked word(s) in your post.`);
    }
  }, [enqueueNotification, getPermissionSummary, selectedForum?.id, blockedWords]);

  const addComment = useCallback((discussionID, comment, author) => {
    const permissions = getPermissionSummary(author);
    if (!permissions.canPostOrComment) {
      enqueueNotification(
        permissions.isBanned
          ? 'Banned users cannot comment.'
          : permissions.isMuted
            ? 'You are temporarily muted and cannot comment right now.'
            : 'This forum is read-only.'
        ,
        permissions.isBanned || permissions.isMuted ? 'danger' : 'info'
      );
      return;
    }
    const textResult = sanitizeText(comment.text, blockedWords);
    const safeComment = {
      ...comment,
      text: textResult.sanitized,
    };

    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === discussionID
          ? { ...d, comments: [...d.comments, safeComment], updatedAt: nowIso() }
          : d
      )
    );
    if (textResult.blockedCount > 0) {
      enqueueNotification(`Word filter replaced ${textResult.blockedCount} blocked word(s) in comment.`);
    }
  }, [enqueueNotification, getPermissionSummary, blockedWords]);

  const likeDiscussion = useCallback((discussionID) => {
    setDiscussions((prev) =>
      prev.map((d) => (d.id === discussionID ? { ...d, likes: d.likes + 1 } : d))
    );
  }, []);

  const filterDiscussions = useCallback((filter) => {
    setSelectedFilter(filter);
  }, []);

  const reportDiscussion = useCallback((discussionID, reporterID, reason = 'Inappropriate content') => {
    setDiscussions((prev) =>
      prev.map((discussion) =>
        discussion.id === discussionID
          ? {
            ...discussion,
            reports: [
              ...discussion.reports,
              { reporterID, reason, createdAt: nowIso() },
            ],
          }
          : discussion
      )
    );
    enqueueNotification('Post reported to moderators.', 'report');
  }, [enqueueNotification]);

  const deleteDiscussion = useCallback((discussionID, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canModerate) {
      enqueueNotification('Only moderators/admins can delete posts.', 'danger');
      return false;
    }
    setDiscussions((prev) => {
      return prev.filter((discussion) => discussion.id !== discussionID);
    });
    enqueueNotification('Post deleted by moderation team.', 'danger');
    return true;
  }, [enqueueNotification, getPermissionSummary]);

  const muteUser = useCallback(async (userID, minutes, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canModerate) {
      enqueueNotification('Only moderators/admins can mute users.', 'danger');
      return false;
    }
    if (!userID || !Number.isFinite(minutes) || minutes <= 0) {
      enqueueNotification('Invalid mute request.', 'danger');
      return false;
    }

    const mutedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    setMutedUsers((prev) => ({ ...prev, [userID]: mutedUntil }));

    try {
      await updateUserMuteStatus(userID, mutedUntil);
    } catch {
      enqueueNotification('Failed to persist mute to storage.', 'danger');
      return false;
    }

    enqueueNotification(`User muted for ${minutes} minute(s).`, 'danger');
    return true;
  }, [enqueueNotification, getPermissionSummary]);

  const unmuteUser = useCallback(async (userID, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canModerate) {
      enqueueNotification('Only moderators/admins can unmute users.', 'danger');
      return false;
    }
    if (!userID) {
      enqueueNotification('Invalid unmute request.', 'danger');
      return false;
    }

    setMutedUsers((prev) => {
      if (!prev[userID]) return prev;
      const next = { ...prev };
      delete next[userID];
      return next;
    });

    try {
      await updateUserMuteStatus(userID, null);
    } catch {
      enqueueNotification('Failed to persist unmute to storage.', 'danger');
      return false;
    }

    enqueueNotification('User unmuted.');
    return true;
  }, [enqueueNotification, getPermissionSummary]);

  const banUser = useCallback(async (userID, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.isAdmin) {
      enqueueNotification('Only admins can ban users.', 'danger');
      return false;
    }
    setBannedUsers((prev) => ({ ...prev, [userID]: true }));

    try {
      await updateUserBanStatus(userID, true);
    } catch (error) {
      enqueueNotification('Failed to persist ban to storage.', 'danger');
      return false;
    }

    setDiscussions((prev) => {
      const removedCount = prev.filter((discussion) => discussion.authorID === userID).length;
      enqueueNotification(
        removedCount > 0
          ? `User banned and ${removedCount} post(s) removed.`
          : 'User banned by admin.',
        'danger'
      );
      return prev.filter((discussion) => discussion.authorID !== userID);
    });
    return true;
  }, [enqueueNotification, getPermissionSummary]);

  const unbanUser = useCallback(async (userID, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.isAdmin) {
      enqueueNotification('Only admins can unban users.', 'danger');
      return false;
    }
    if (!userID) {
      enqueueNotification('Invalid unban request.', 'danger');
      return false;
    }

    setBannedUsers((prev) => {
      if (!prev[userID]) return prev;
      const next = { ...prev };
      delete next[userID];
      return next;
    });

    try {
      await updateUserBanStatus(userID, false);
    } catch {
      enqueueNotification('Failed to persist unban to storage.', 'danger');
      return false;
    }

    enqueueNotification('User unbanned.');
    return true;
  }, [enqueueNotification, getPermissionSummary]);

  const addBlockedWord = useCallback((word, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canModerate) {
      enqueueNotification('Only moderators/admins can manage content filters.', 'danger');
      return;
    }
    const normalized = (word || '').trim().toLowerCase();
    if (!normalized) return;
    setBlockedWords((prev) => {
      if (prev.includes(normalized)) return prev;
      enqueueNotification(`Added \"${normalized}\" to filter dictionary.`);
      return [...prev, normalized];
    });
  }, [enqueueNotification, getPermissionSummary]);

  const removeBlockedWord = useCallback((word, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canModerate) {
      enqueueNotification('Only moderators/admins can manage content filters.', 'danger');
      return;
    }
    const normalized = (word || '').trim().toLowerCase();
    setBlockedWords((prev) => {
      if (!prev.includes(normalized)) return prev;
      enqueueNotification(`Removed \"${normalized}\" from filter dictionary.`);
      return prev.filter((item) => item !== normalized);
    });
  }, [enqueueNotification, getPermissionSummary]);

  const restoreSamplePosts = useCallback((actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canModerate) {
      enqueueNotification('Only moderators/admins can restore posts.', 'danger');
      return;
    }
    setDiscussions(loadMockDiscussions());
    enqueueNotification('Sample posts restored.');
  }, [enqueueNotification, getPermissionSummary]);

  const getPostsByAuthor = useCallback((authorID) => {
    return discussions
      .filter((discussion) => discussion.authorID === authorID)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [discussions]);

  const getForumPostCount = useCallback((forumID) => {
    return discussions.filter((discussion) => discussion.forumID === forumID).length;
  }, [discussions]);

  const deletePostsByAuthor = useCallback((authorID, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canModerate) {
      enqueueNotification('Only moderators/admins can delete user posts.', 'danger');
      return;
    }
    setDiscussions((prev) => {
      const removedCount = prev.filter((discussion) => discussion.authorID === authorID).length;
      enqueueNotification(
        removedCount > 0
          ? `${removedCount} post(s) removed for this user.`
          : 'No posts found for this user.'
      );
      return prev.filter((discussion) => discussion.authorID !== authorID);
    });
  }, [enqueueNotification, getPermissionSummary]);

  const closeForum = useCallback((forumID, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canModerate) {
      enqueueNotification('Only moderators/admins can close forums.', 'danger');
      return false;
    }

    const targetForum = forums.find((forum) => forum.id === forumID);
    if (!targetForum) {
      enqueueNotification('Forum not found.', 'danger');
      return false;
    }
    if (targetForum.isReadOnly) {
      enqueueNotification('Forum is already read-only.');
      return false;
    }

    setForums((prev) =>
      prev.map((forum) => (forum.id === forumID ? { ...forum, isReadOnly: true } : forum))
    );
    enqueueNotification('Forum has been closed (read-only).');
    return true;
  }, [enqueueNotification, getPermissionSummary, forums]);

  const openForum = useCallback((forumID, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.canModerate) {
      enqueueNotification('Only moderators/admins can reopen forums.', 'danger');
      return false;
    }

    const targetForum = forums.find((forum) => forum.id === forumID);
    if (!targetForum) {
      enqueueNotification('Forum not found.', 'danger');
      return false;
    }

    setForums((prev) =>
      prev.map((forum) => {
        if (forum.id !== forumID) return forum;
        const nextExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        return {
          ...forum,
          isReadOnly: false,
          expiresAt: nextExpiresAt,
        };
      })
    );
    enqueueNotification('Forum reopened.');
    return true;
  }, [enqueueNotification, getPermissionSummary, forums]);

  const deleteForum = useCallback((forumID, actor) => {
    const permissions = getPermissionSummary(actor);
    if (!permissions.isAdmin) {
      enqueueNotification('Only admins can delete forums.', 'danger');
      return false;
    }

    const targetForum = forums.find((forum) => forum.id === forumID);
    if (!targetForum) {
      enqueueNotification('Forum not found.', 'danger');
      return false;
    }

    const remaining = forums.filter((forum) => forum.id !== forumID);
    setForums(remaining);

    if (selectedForumID === forumID) {
      setSelectedForumID(remaining[0]?.id || null);
    }

    setDiscussions((prev) => prev.filter((discussion) => discussion.forumID !== forumID));
    enqueueNotification('Forum deleted with all its posts.', 'danger');
    return true;
  }, [enqueueNotification, getPermissionSummary, forums, selectedForumID]);

  const forumCountdown = useMemo(() => {
    if (!selectedForum) return 'No active forum';
    const ms = new Date(selectedForum.expiresAt).getTime() - clockTick;
    if (ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const seconds = (totalSec % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [selectedForum, clockTick]);

  return {
    discussions,
    filteredDiscussions,
    selectedFilter,
    filters: FILTERS,
    forums,
    openForums,
    pastForums,
    activeForum: selectedForum,
    selectedForumID: selectedForum?.id || null,
    forumIsReadOnly,
    forumCountdown,
    notifications,
    knownUsers,
    postHistoryCounts,
    mutedUsers,
    bannedUsers,
    blockedWords,
    toast,
    createDiscussion: createDiscussionPost,
    addComment,
    likeDiscussion,
    filterDiscussions,
    createForum,
    selectForum,
    reportDiscussion,
    deleteDiscussion,
    muteUser,
    unmuteUser,
    banUser,
    unbanUser,
    restoreSamplePosts,
    getPostsByAuthor,
    getForumPostCount,
    deletePostsByAuthor,
    closeForum,
    openForum,
    deleteForum,
    addBlockedWord,
    removeBlockedWord,
    getPermissionSummary,
    dismissNotification,
  };
};

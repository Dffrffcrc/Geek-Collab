 

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 * @property {string} displayName
 * @property {string} password
 * @property {'admin'|'user'} role
 * @property {string} displayName - Display name for user
 * @property {string} bio
 * @property {string|null} profileImage - base64 encoded image
 * @property {boolean} isBanned
 * @property {string|null} mutedUntil - ISO date string
 * @property {string[]} forumModerators - Array of forum IDs where user is a moderator
 * @property {string} createdAt - ISO date string
 */
export const createUser = ({
  id,
  username,
  displayName = '',
  password,
  role = 'user',
  bio = '',
  profileImage = null,
  isBanned = false,
  mutedUntil = null,
  forumModerators = [],
  createdAt,
}) => ({
  id,
  username,
  displayName,
  password,
  role,
  displayName: displayName || username,
  bio,
  profileImage,
  isBanned,
  mutedUntil,
  forumModerators: Array.isArray(forumModerators) ? forumModerators : [],
  createdAt: createdAt || new Date().toISOString(),
});

/**
 * @typedef {Object} DiscussionComment
 * @property {string} id
 * @property {string} authorID
 * @property {string} authorName
 * @property {string} authorDisplayName
 * @property {string} authorUsername
 * @property {string|null} authorProfileImage
 * @property {string} text
 * @property {string} createdAt - ISO date string
 */
export const createComment = ({
  id,
  authorID,
  authorName,
  authorDisplayName = authorName,
  authorUsername = authorName,
  authorProfileImage = null,
  text,
  createdAt,
}) => ({
  id,
  authorID,
  authorName,
  authorDisplayName,
  authorUsername,
  authorProfileImage,
  text,
  createdAt: createdAt || new Date().toISOString(),
});

/**
 * @typedef {Object} ForumDiscussion
 * @property {string} id
 * @property {string} authorID
 * @property {string} authorName
 * @property {string} authorDisplayName
 * @property {string} authorUsername
 * @property {string|null} authorProfileImage
 * @property {string} title
 * @property {string} description
 * @property {string} content
 * @property {string|null} forumID
 * @property {string|{base64: string, width?: number, height?: number}|null} image - uploaded image
 * @property {string|null} videoURL
 * @property {string[]} tags
 * @property {DiscussionComment[]} comments
 * @property {{reporterID: string, reason: string, createdAt: string}[]} reports
 * @property {number} likes
 * @property {string[]} likesBy
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 */
export const createDiscussion = ({
  id,
  authorID,
  authorName,
  authorDisplayName = authorName,
  authorUsername = authorName,
  authorProfileImage = null,
  title,
  description,
  content,
  forumID = null,
  image = null,
  videoURL = null,
  tags = [],
  comments = [],
  reports = [],
  likes = 0,
  likesBy = [],
  createdAt,
  updatedAt,
}) => ({
  id,
  authorID,
  authorName,
  authorDisplayName,
  authorUsername,
  authorProfileImage,
  title,
  description,
  content,
  forumID,
  image,
  videoURL,
  tags,
  comments,
  reports,
  likes,
  likesBy,
  createdAt: createdAt || new Date().toISOString(),
  updatedAt: updatedAt || new Date().toISOString(),
});

/**
 * @typedef {Object} ForumConfig
 * @property {string} id
 * @property {string} title
 * @property {string} createdByID
 * @property {string} createdByName
 * @property {string} createdByDisplayName
 * @property {string} createdByUsername
 * @property {string|null} createdByProfileImage
 * @property {string} createdAt
 * @property {string} expiresAt
 * @property {boolean} isReadOnly
 */
export const createForumConfig = ({
  id,
  title,
  createdByID,
  createdByName,
  createdByDisplayName = createdByName,
  createdByUsername = createdByName,
  createdByProfileImage = null,
  createdAt,
  expiresAt,
  isReadOnly = false,
}) => ({
  id,
  title,
  createdByID,
  createdByName,
  createdByDisplayName,
  createdByUsername,
  createdByProfileImage,
  createdAt: createdAt || new Date().toISOString(),
  expiresAt,
  isReadOnly,
});

 

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 * @property {string} password
 * @property {'admin'|'moderator'|'user'} role
 * @property {string} bio
 * @property {string|null} profileImage - base64 encoded image
 * @property {boolean} isBanned
 * @property {string|null} mutedUntil - ISO date string
 * @property {string} createdAt - ISO date string
 */
export const createUser = ({
  id,
  username,
  password,
  role = 'user',
  bio = '',
  profileImage = null,
  isBanned = false,
  mutedUntil = null,
  createdAt,
}) => ({
  id,
  username,
  password,
  role,
  bio,
  profileImage,
  isBanned,
  mutedUntil,
  createdAt: createdAt || new Date().toISOString(),
});

/**
 * @typedef {Object} DiscussionComment
 * @property {string} id
 * @property {string} authorID
 * @property {string} authorName
 * @property {string} text
 * @property {string} createdAt - ISO date string
 */
export const createComment = ({ id, authorID, authorName, text, createdAt }) => ({
  id,
  authorID,
  authorName,
  text,
  createdAt: createdAt || new Date().toISOString(),
});

/**
 * @typedef {Object} ForumDiscussion
 * @property {string} id
 * @property {string} authorID
 * @property {string} authorName
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
 * @property {string} createdAt
 * @property {string} expiresAt
 * @property {boolean} isReadOnly
 */
export const createForumConfig = ({
  id,
  title,
  createdByID,
  createdByName,
  createdAt,
  expiresAt,
  isReadOnly = false,
}) => ({
  id,
  title,
  createdByID,
  createdByName,
  createdAt: createdAt || new Date().toISOString(),
  expiresAt,
  isReadOnly,
});

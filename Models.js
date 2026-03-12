// Models.js - Data model definitions (converted from Models.swift)

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 * @property {string} password
 * @property {string} bio
 * @property {string|null} profileImage - base64 encoded image
 * @property {string} createdAt - ISO date string
 */
export const createUser = ({ id, username, password, bio = '', profileImage = null, createdAt }) => ({
  id,
  username,
  password,
  bio,
  profileImage,
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
 * @property {string|null} image - base64 encoded image
 * @property {string|null} videoURL
 * @property {string[]} tags
 * @property {DiscussionComment[]} comments
 * @property {number} likes
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
  image = null,
  videoURL = null,
  tags = [],
  comments = [],
  likes = 0,
  createdAt,
  updatedAt,
}) => ({
  id,
  authorID,
  authorName,
  title,
  description,
  content,
  image,
  videoURL,
  tags,
  comments,
  likes,
  createdAt: createdAt || new Date().toISOString(),
  updatedAt: updatedAt || new Date().toISOString(),
});

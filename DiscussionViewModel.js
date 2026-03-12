// DiscussionViewModel.js - Discussion state & logic (converted from DiscussionViewModel.swift)
import { useState, useCallback } from 'react';
import { createDiscussion, createComment } from '../models/Models';
import uuid from 'react-native-uuid';

const FILTERS = ['Latest', 'Popular', 'Trending'];

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
    default:
      return discussions;
  }
};

const loadMockDiscussions = () => [
  createDiscussion({
    id: uuid.v4(),
    authorID: uuid.v4(),
    authorName: 'varun',
    title: 'Geekshacking is awesome!',
    description: 'My opinion about Geekshacking',
    content:
      'Geekshacking is such a cool and amazing company with volunteers that are true to themselves and dedicated to serving and assisting the global community through their inspirations and passion in technology. After attending their hackomania 2026 pre-event I got to learn so much about them and their work. It is truly admiring to see such a positive and inspiring company that is working towards making a difference in people\'s lives rather than just for the money. I would highly recommend volunteering for anyone looking to learn more about Geekshacking and the geeky stuff they do.',
    tags: ['GeeksHacking', 'Hackomania2026', 'Technology'],
    comments: [
      createComment({
        id: uuid.v4(),
        authorID: uuid.v4(),
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
    authorID: uuid.v4(),
    authorName: 'ekansh_mishra',
    title: 'All about The Something Company',
    description: 'cool beans stuff',
    content:
      "The Something Company is so awesome sauce and I'm so proud to be the team's COO. We're building the future of work and I can't wait to see all the amazing things we'll achieve together.",
    tags: ['TheSomethingCompany', 'beourclientpls'],
    comments: [
      createComment({
        id: uuid.v4(),
        authorID: uuid.v4(),
        authorName: 'paul',
        text: 'I love working here, everyone should totally give us all their money.',
        createdAt: new Date(Date.now() - 900_000).toISOString(),
      }),
      createComment({
        id: uuid.v4(),
        authorID: uuid.v4(),
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
    authorID: uuid.v4(),
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

  const filteredDiscussions = applyFilter(discussions, selectedFilter);

  const createDiscussionPost = useCallback((title, description, content, image, tags, author) => {
    const newDiscussion = createDiscussion({
      id: uuid.v4(),
      authorID: author.id,
      authorName: author.username,
      title,
      description,
      content,
      image: image || null,
      tags,
    });
    setDiscussions((prev) => [newDiscussion, ...prev]);
  }, []);

  const addComment = useCallback((discussionID, comment) => {
    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === discussionID
          ? { ...d, comments: [...d.comments, comment], updatedAt: new Date().toISOString() }
          : d
      )
    );
  }, []);

  const likeDiscussion = useCallback((discussionID) => {
    setDiscussions((prev) =>
      prev.map((d) => (d.id === discussionID ? { ...d, likes: d.likes + 1 } : d))
    );
  }, []);

  const filterDiscussions = useCallback((filter) => {
    setSelectedFilter(filter);
  }, []);

  return {
    discussions,
    filteredDiscussions,
    selectedFilter,
    filters: FILTERS,
    createDiscussion: createDiscussionPost,
    addComment,
    likeDiscussion,
    filterDiscussions,
  };
};

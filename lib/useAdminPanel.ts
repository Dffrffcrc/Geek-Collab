import { useEffect, useState, useCallback } from 'react';
import {
  adminService,
  ModerationAction,
  ContentReport,
  UserStats,
  ContentFilterRule,
  QuarantinedContent,
} from './adminService';

export interface AdminDashboardStats {
  totalUsers: number;
  bannedUsers: number;
  mutedUsers: number;
  pendingReports: number;
  quarantinedContent: number;
  totalModerationActions: number;
}

interface AdminPanelState {
  // Dashboard
  stats: AdminDashboardStats;
  statsLoading: boolean;

  // Moderation queue
  pendingReports: ContentReport[];
  reportsLoading: boolean;

  // Users
  allUsers: UserStats[];
  usersLoading: boolean;

  // Moderation actions
  recentActions: ModerationAction[];
  actionsLoading: boolean;

  // Content filters
  filterRules: ContentFilterRule[];
  filtersLoading: boolean;

  // Quarantined content
  quarantinedContent: QuarantinedContent[];
  quarantineLoading: boolean;
}

const initialState: AdminPanelState = {
  stats: {
    totalUsers: 0,
    bannedUsers: 0,
    mutedUsers: 0,
    pendingReports: 0,
    quarantinedContent: 0,
    totalModerationActions: 0,
  },
  statsLoading: false,
  pendingReports: [],
  reportsLoading: false,
  allUsers: [],
  usersLoading: false,
  recentActions: [],
  actionsLoading: false,
  filterRules: [],
  filtersLoading: false,
  quarantinedContent: [],
  quarantineLoading: false,
};

export function useAdminPanel() {
  const [state, setState] = useState<AdminPanelState>(initialState);

  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    setState((s) => ({ ...s, statsLoading: true }));
    try {
      const stats = await adminService.getDashboardStats();
      setState((s) => ({ ...s, stats, statsLoading: false }));
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setState((s) => ({ ...s, statsLoading: false }));
    }
  }, []);

  // Fetch pending reports
  const fetchPendingReports = useCallback(async () => {
    setState((s) => ({ ...s, reportsLoading: true }));
    try {
      const reports = await adminService.getReportedPosts();
      setState((s) => ({ ...s, pendingReports: reports, reportsLoading: false }));
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setState((s) => ({ ...s, reportsLoading: false }));
    }
  }, []);

  // Fetch all users
  const fetchAllUsers = useCallback(async () => {
    setState((s) => ({ ...s, usersLoading: true }));
    try {
      const users = await adminService.getAllUsers();
      setState((s) => ({ ...s, allUsers: users, usersLoading: false }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setState((s) => ({ ...s, usersLoading: false }));
    }
  }, []);

  // Fetch recent moderation actions
  const fetchRecentActions = useCallback(async () => {
    setState((s) => ({ ...s, actionsLoading: true }));
    try {
      const actions = await adminService.getRecentModerationActions(50);
      setState((s) => ({ ...s, recentActions: actions, actionsLoading: false }));
    } catch (error) {
      console.error('Failed to fetch actions:', error);
      setState((s) => ({ ...s, actionsLoading: false }));
    }
  }, []);

  // Fetch content filter rules
  const fetchFilterRules = useCallback(async () => {
    setState((s) => ({ ...s, filtersLoading: true }));
    try {
      const rules = await adminService.getContentFilterRules();
      setState((s) => ({ ...s, filterRules: rules, filtersLoading: false }));
    } catch (error) {
      console.error('Failed to fetch filter rules:', error);
      setState((s) => ({ ...s, filtersLoading: false }));
    }
  }, []);

  // Fetch quarantined content
  const fetchQuarantinedContent = useCallback(async () => {
    setState((s) => ({ ...s, quarantineLoading: true }));
    try {
      const content = await adminService.getQuarantinedContent();
      setState((s) => ({ ...s, quarantinedContent: content, quarantineLoading: false }));
    } catch (error) {
      console.error('Failed to fetch quarantined content:', error);
      setState((s) => ({ ...s, quarantineLoading: false }));
    }
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchDashboardStats(),
      fetchPendingReports(),
      fetchAllUsers(),
      fetchRecentActions(),
      fetchFilterRules(),
      fetchQuarantinedContent(),
    ]);
  }, [fetchDashboardStats, fetchPendingReports, fetchAllUsers, fetchRecentActions, fetchFilterRules, fetchQuarantinedContent]);

  // Initial load on mount
  useEffect(() => {
    refreshAll();
  }, []);

  return {
    ...state,
    fetchDashboardStats,
    fetchPendingReports,
    fetchAllUsers,
    fetchRecentActions,
    fetchFilterRules,
    fetchQuarantinedContent,
    refreshAll,
  };
}

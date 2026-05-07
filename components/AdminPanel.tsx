import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  SafeAreaView,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminPanel } from '../lib/useAdminPanel';
import { adminService } from '../lib/adminService';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import AdminDashboard from './AdminDashboard';
import ContentModerationQueue from './ContentModerationQueue';
import UserActivityMonitor from './UserActivityMonitor';
import ContentQuarantine from './ContentQuarantine';
import RecentModerationActions from './RecentModerationActions';
import ForumManagement from './ForumManagement';
import UserManagement from './UserManagement';
import ContentFiltering from './ContentFiltering';
import ModeratorActivityLog from './ModeratorActivityLog';

export interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface AdminPanelProps {
  userId: string;
  username: string;
  onClose: () => void;
  visible: boolean;
}

const ADMIN_TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'queue', label: 'Moderation Queue', icon: 'document-lock' },
  { id: 'users', label: 'User Management', icon: 'people' },
  { id: 'activity', label: 'User Activity', icon: 'analytics' },
  { id: 'quarantine', label: 'Quarantine', icon: 'alert-circle' },
  { id: 'recent', label: 'Recent Actions', icon: 'time' },
  { id: 'forums', label: 'Forum Management', icon: 'chatbubbles' },
  { id: 'filters', label: 'Content Filters', icon: 'filter' },
  { id: 'modlog', label: 'Mod Activity Log', icon: 'list' },
];

const AdminPanel: React.FC<AdminPanelProps> = ({ userId, username, onClose, visible }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const adminPanelState = useAdminPanel();

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await adminPanelState.refreshAll();
    setRefreshing(false);
  }, [adminPanelState]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <AdminDashboard
            stats={adminPanelState.stats}
            loading={adminPanelState.statsLoading}
          />
        );
      case 'queue':
        return (
          <ContentModerationQueue
            reports={adminPanelState.pendingReports}
            loading={adminPanelState.reportsLoading}
            adminId={userId}
            adminUsername={username}
          />
        );
      case 'users':
        return (
          <UserManagement
            users={adminPanelState.allUsers}
            loading={adminPanelState.usersLoading}
            adminId={userId}
            adminUsername={username}
          />
        );
      case 'activity':
        return (
          <UserActivityMonitor
            users={adminPanelState.allUsers}
            loading={adminPanelState.usersLoading}
          />
        );
      case 'quarantine':
        return (
          <ContentQuarantine
            content={adminPanelState.quarantinedContent}
            loading={adminPanelState.quarantineLoading}
            adminId={userId}
          />
        );
      case 'recent':
        return (
          <RecentModerationActions
            actions={adminPanelState.recentActions}
            loading={adminPanelState.actionsLoading}
          />
        );
      case 'forums':
        return (
          <ForumManagement
            adminId={userId}
            adminUsername={username}
          />
        );
      case 'filters':
        return (
          <ContentFiltering
            rules={adminPanelState.filterRules}
            loading={adminPanelState.filtersLoading}
            adminId={userId}
            onRulesUpdated={() => adminPanelState.fetchFilterRules()}
          />
        );
      case 'modlog':
        return (
          <ModeratorActivityLog
            actions={adminPanelState.recentActions}
            loading={adminPanelState.actionsLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="shield" size={28} color={COLORS.yellow} />
            <Text style={styles.headerTitle}>Admin Panel</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {ADMIN_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.id ? COLORS.yellow : COLORS.textSecondary}
                style={styles.tabIcon}
              />
              <Text
                style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.yellow} />}
        >
          {renderTabContent()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: HEADING_FONT,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.bgLight,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.yellow,
  },
  tabIcon: {
    marginRight: 2,
  },
  tabLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#000',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
});

export default AdminPanel;

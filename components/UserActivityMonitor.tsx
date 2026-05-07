import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import type { UserStats } from '../lib/adminService';

interface UserActivityMonitorProps {
  users: UserStats[];
  loading: boolean;
}

const UserActivityMonitor: React.FC<UserActivityMonitorProps> = ({ users, loading }) => {
  const [sortBy, setSortBy] = useState<'lastActive' | 'postCount' | 'reportCount'>('lastActive');

  const sortedUsers = [...users].sort((a, b) => {
    switch (sortBy) {
      case 'lastActive':
        return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      case 'postCount':
        return b.postCount - a.postCount;
      case 'reportCount':
        return b.reportCount - a.reportCount;
      default:
        return 0;
    }
  });

  const renderUserActivityItem = ({ item }: { item: UserStats }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>{item.username.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.lastActive}>
              Last active: {new Date(item.lastActive).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {item.isBanned && (
          <View style={styles.bannedBadge}>
            <Ionicons name="ban" size={14} color={COLORS.danger} />
          </View>
        )}
      </View>

      <View style={styles.activityStats}>
        <View style={styles.activityStatItem}>
          <Ionicons name="chatbubble" size={16} color={COLORS.primary} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{item.postCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </View>

        <View style={styles.activityStatItem}>
          <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{item.reportCount}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
        </View>

        <View style={styles.activityStatItem}>
          <Ionicons name="warning" size={16} color={COLORS.danger} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{item.warningCount}</Text>
            <Text style={styles.statLabel}>Warnings</Text>
          </View>
        </View>

        <View style={styles.activityStatItem}>
          <Ionicons name="calendar" size={16} color={COLORS.textMuted} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>
              {Math.floor((Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
            </Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading user activity...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Activity Monitor</Text>
      <Text style={styles.subtitle}>Track user engagement and behavior</Text>

      <View style={styles.sortControls}>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'lastActive' && styles.sortBtnActive]}
          onPress={() => setSortBy('lastActive')}
        >
          <Text style={[styles.sortBtnText, sortBy === 'lastActive' && styles.sortBtnTextActive]}>
            Last Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'postCount' && styles.sortBtnActive]}
          onPress={() => setSortBy('postCount')}
        >
          <Text style={[styles.sortBtnText, sortBy === 'postCount' && styles.sortBtnTextActive]}>
            Most Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortBy === 'reportCount' && styles.sortBtnActive]}
          onPress={() => setSortBy('reportCount')}
        >
          <Text style={[styles.sortBtnText, sortBy === 'reportCount' && styles.sortBtnTextActive]}>
            Most Reported
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedUsers}
        renderItem={renderUserActivityItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: BODY_FONT,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    fontFamily: HEADING_FONT,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    fontFamily: BODY_FONT,
  },
  sortControls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sortBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortBtnActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: BODY_FONT,
    textAlign: 'center',
  },
  sortBtnTextActive: {
    color: '#000',
  },
  activityCard: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  userMeta: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
  },
  lastActive: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
    marginTop: 2,
  },
  bannedBadge: {
    backgroundColor: COLORS.dangerLight,
    padding: 6,
    borderRadius: 6,
  },
  activityStats: {
    flexDirection: 'row',
    gap: 10,
  },
  activityStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgDark,
    borderRadius: 8,
    padding: 8,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: HEADING_FONT,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
  },
  separator: {
    height: 8,
  },
});

export default UserActivityMonitor;

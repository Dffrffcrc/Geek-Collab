import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import type { AdminDashboardStats } from '../lib/useAdminPanel';

interface AdminDashboardProps {
  stats: AdminDashboardStats;
  loading: boolean;
}

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats, loading }) => {
  const statCards: StatCard[] = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: 'people',
      color: COLORS.primary,
      bgColor: COLORS.primaryLight,
    },
    {
      label: 'Banned Users',
      value: stats.bannedUsers,
      icon: 'ban',
      color: COLORS.danger,
      bgColor: COLORS.dangerLight,
    },
    {
      label: 'Muted Users',
      value: stats.mutedUsers,
      icon: 'mic-off',
      color: COLORS.warning,
      bgColor: COLORS.warningLight,
    },
    {
      label: 'Pending Reports',
      value: stats.pendingReports,
      icon: 'alert',
      color: COLORS.warning,
      bgColor: COLORS.warningLight,
    },
    {
      label: 'Quarantined Content',
      value: stats.quarantinedContent,
      icon: 'lock-closed',
      color: COLORS.primary,
      bgColor: COLORS.primaryLight,
    },
    {
      label: 'Moderation Actions',
      value: stats.totalModerationActions,
      icon: 'shield',
      color: COLORS.success,
      bgColor: COLORS.successLight,
    },
  ];

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <View style={styles.statCardContainer}>
      <View style={[styles.statCard, { backgroundColor: item.bgColor }]}>
        <View style={styles.statHeader}>
          <Ionicons name={item.icon as any} size={28} color={item.color} />
          <Text style={styles.statValue}>{item.value}</Text>
        </View>
        <Text style={styles.statLabel}>{item.label}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard Overview</Text>
      <Text style={styles.subtitle}>System statistics and key metrics</Text>

      <FlatList
        data={statCards}
        renderItem={renderStatCard}
        keyExtractor={(item) => item.label}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        scrollEnabled={false}
        style={styles.grid}
      />

      {/* Quick Stats Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <View style={styles.summaryItem}>
          <View style={styles.summaryDot} />
          <Text style={styles.summaryText}>
            {stats.bannedUsers} users currently banned from the platform
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.summaryText}>
            {stats.pendingReports} reports waiting for review
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.summaryText}>
            {stats.quarantinedContent} posts in quarantine awaiting action
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.summaryText}>
            {stats.totalModerationActions} moderation actions performed
          </Text>
        </View>
      </View>

      {/* Health Indicators */}
      <View style={styles.healthSection}>
        <Text style={styles.healthTitle}>Platform Health</Text>
        <View style={styles.healthBar}>
          <Text style={styles.healthLabel}>User Safety</Text>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.min((stats.bannedUsers / Math.max(stats.totalUsers, 1)) * 100 + 30, 100)}%`,
                  backgroundColor: COLORS.success,
                },
              ]}
            />
          </View>
          <Text style={styles.healthValue}>Good</Text>
        </View>
        <View style={styles.healthBar}>
          <Text style={styles.healthLabel}>Content Moderation</Text>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.max(100 - (stats.pendingReports / Math.max(stats.totalModerationActions, 1)) * 100, 0)}%`,
                  backgroundColor: stats.pendingReports > 10 ? COLORS.danger : COLORS.success,
                },
              ]}
            />
          </View>
          <Text style={styles.healthValue}>{stats.pendingReports > 10 ? 'Needs Review' : 'On Track'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
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
  grid: {
    marginBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCardContainer: {
    width: '48%',
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: HEADING_FONT,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontFamily: BODY_FONT,
  },
  summarySection: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
    fontFamily: HEADING_FONT,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    fontFamily: BODY_FONT,
  },
  healthSection: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 16,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
    fontFamily: HEADING_FONT,
  },
  healthBar: {
    marginBottom: 16,
  },
  healthLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontFamily: BODY_FONT,
    fontWeight: '500',
  },
  barContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  healthValue: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
  },
});

export default AdminDashboard;

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BODY_FONT, HEADING_FONT } from '../lib/theme';
import type { ModerationAction } from '../lib/adminService';

interface ModeratorActivityLogProps {
  actions: ModerationAction[];
  loading: boolean;
}

const getActionIcon = (type: string): string => {
  switch (type) {
    case 'ban':
      return 'ban';
    case 'mute':
      return 'mic-off';
    case 'warn':
      return 'warning';
    case 'delete_post':
      return 'trash';
    case 'promote_mod':
      return 'arrow-up-circle';
    case 'demote_mod':
      return 'arrow-down-circle';
    default:
      return 'shield';
  }
};

const getActionColor = (type: string): string => {
  switch (type) {
    case 'ban':
      return COLORS.danger;
    case 'mute':
      return COLORS.warning;
    case 'warn':
      return COLORS.warning;
    case 'delete_post':
      return COLORS.danger;
    case 'promote_mod':
      return COLORS.success;
    case 'demote_mod':
      return COLORS.warning;
    default:
      return COLORS.primary;
  }
};

const formatTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return timestamp.toLocaleDateString();
};

const ModeratorActivityLog: React.FC<ModeratorActivityLogProps> = ({ actions, loading }) => {
  const sortedActions = [...actions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const renderLogEntry = ({ item }: { item: ModerationAction }) => {
    const actionColor = getActionColor(item.type);
    const actionIcon = getActionIcon(item.type);

    return (
      <View style={styles.logEntry}>
        <View style={[styles.iconContainer, { backgroundColor: actionColor + '20' }]}>
          <Ionicons name={actionIcon as any} size={18} color={actionColor} />
        </View>

        <View style={styles.entryContent}>
          <View style={styles.entryHeader}>
            <Text style={styles.actionType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(item.timestamp)}</Text>
          </View>

          <View style={styles.entryDetails}>
            <Text style={styles.detailRow}>
              <Text style={styles.label}>Admin:</Text>
              <Text style={styles.value}> {item.adminUsername}</Text>
            </Text>
            <Text style={styles.detailRow}>
              <Text style={styles.label}>Target:</Text>
              <Text style={styles.value}> {item.targetUsername}</Text>
            </Text>
            {item.reason && (
              <Text style={styles.detailRow}>
                <Text style={styles.label}>Reason:</Text>
                <Text style={styles.value}> {item.reason}</Text>
              </Text>
            )}
            {item.duration && (
              <Text style={styles.detailRow}>
                <Text style={styles.label}>Duration:</Text>
                <Text style={styles.value}> {Math.round(item.duration / 3600000)} hours</Text>
              </Text>
            )}
          </View>

          <View style={styles.entryFooter}>
            <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
          </View>
        </View>

        <View style={[styles.actionIndicator, { backgroundColor: actionColor + '30' }]}>
          <View style={[styles.actionDot, { backgroundColor: actionColor }]} />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading activity log...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Moderator Activity Log</Text>
      <Text style={styles.subtitle}>Complete history of moderation actions</Text>

      {actions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done" size={48} color={COLORS.success} />
          <Text style={styles.emptyStateTitle}>No Activity</Text>
          <Text style={styles.emptyStateText}>No moderation actions have been taken</Text>
        </View>
      ) : (
        <>
          <Text style={styles.activityCount}>{actions.length} total actions</Text>

          <FlatList
            data={sortedActions}
            renderItem={renderLogEntry}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          {/* Summary Statistics */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Ionicons name="ban" size={16} color={COLORS.danger} />
                <Text style={styles.summaryStatCount}>
                  {actions.filter((a) => a.type === 'ban').length}
                </Text>
                <Text style={styles.summaryStatLabel}>Bans</Text>
              </View>
              <View style={styles.summaryStat}>
                <Ionicons name="mic-off" size={16} color={COLORS.warning} />
                <Text style={styles.summaryStatCount}>
                  {actions.filter((a) => a.type === 'mute').length}
                </Text>
                <Text style={styles.summaryStatLabel}>Mutes</Text>
              </View>
              <View style={styles.summaryStat}>
                <Ionicons name="trash" size={16} color={COLORS.danger} />
                <Text style={styles.summaryStatCount}>
                  {actions.filter((a) => a.type === 'delete_post').length}
                </Text>
                <Text style={styles.summaryStatLabel}>Deleted</Text>
              </View>
              <View style={styles.summaryStat}>
                <Ionicons name="shield" size={16} color={COLORS.success} />
                <Text style={styles.summaryStatCount}>
                  {actions.filter((a) => a.type === 'promote_mod').length}
                </Text>
                <Text style={styles.summaryStatLabel}>Promoted</Text>
              </View>
            </View>
          </View>
        </>
      )}
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
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
    fontFamily: HEADING_FONT,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    fontFamily: BODY_FONT,
  },
  activityCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    fontFamily: BODY_FONT,
  },
  logEntry: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionType: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
  },
  timeAgo: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
  },
  entryDetails: {
    gap: 4,
    marginBottom: 8,
  },
  detailRow: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
  },
  label: {
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  value: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  entryFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
  },
  actionIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionDot: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  separator: {
    height: 8,
  },
  summarySection: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
    fontFamily: HEADING_FONT,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatCount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 6,
    fontFamily: HEADING_FONT,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: BODY_FONT,
  },
});

export default ModeratorActivityLog;

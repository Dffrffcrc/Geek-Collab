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

interface RecentModerationActionsProps {
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

const getActionLabel = (type: string): string => {
  switch (type) {
    case 'ban':
      return 'Banned';
    case 'mute':
      return 'Muted';
    case 'warn':
      return 'Warned';
    case 'delete_post':
      return 'Post Deleted';
    case 'promote_mod':
      return 'Promoted to Moderator';
    case 'demote_mod':
      return 'Removed as Moderator';
    default:
      return 'Action';
  }
};

const RecentModerationActions: React.FC<RecentModerationActionsProps> = ({ actions, loading }) => {
  const sortedActions = [...actions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const renderActionItem = ({ item }: { item: ModerationAction }) => {
    const actionColor = getActionColor(item.type);
    const actionIcon = getActionIcon(item.type);
    const actionLabel = getActionLabel(item.type);

    return (
      <View style={styles.actionCard}>
        <View style={[styles.iconContainer, { backgroundColor: actionColor + '20' }]}>
          <Ionicons name={actionIcon as any} size={20} color={actionColor} />
        </View>

        <View style={styles.actionContent}>
          <View style={styles.actionHeader}>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
            <Text style={styles.actionTime}>{new Date(item.timestamp).toLocaleDateString()}</Text>
          </View>

          <View style={styles.actionDetails}>
            <Text style={styles.detailText}>
              Target: <Text style={styles.detailBold}>{item.targetUsername}</Text>
            </Text>
            <Text style={styles.detailText}>
              Admin: <Text style={styles.detailBold}>{item.adminUsername}</Text>
            </Text>
            {item.reason && <Text style={styles.detailText}>Reason: {item.reason}</Text>}
            {item.duration && (
              <Text style={styles.detailText}>
                Duration: {Math.round(item.duration / 3600000)} hours
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.actionBadge, { backgroundColor: actionColor + '20' }]}>
          <Text style={[styles.badgeText, { color: actionColor }]}>Done</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading actions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Moderation Actions</Text>
      <Text style={styles.subtitle}>{actions.length} total actions</Text>

      {actions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done" size={48} color={COLORS.success} />
          <Text style={styles.emptyStateTitle}>No Recent Actions</Text>
          <Text style={styles.emptyStateText}>The platform is running smoothly</Text>
        </View>
      ) : (
        <FlatList
          data={sortedActions}
          renderItem={renderActionItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
  actionCard: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: BODY_FONT,
  },
  actionTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
  },
  actionDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: BODY_FONT,
  },
  detailBold: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: BODY_FONT,
  },
  separator: {
    height: 8,
  },
});

export default RecentModerationActions;

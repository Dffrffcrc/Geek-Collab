import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// =============================================================================
// Color Palette - Reddit-inspired, minimal, clean
// =============================================================================
const Colors = {
  // Primary
  primary: '#2563EB', // Reddit blue
  primaryHover: '#1D4ED8',
  primaryLight: '#DBEAFE',

  // Neutral
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceHover: '#F3F4F6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',

  // Border
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Status
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#EFF6FF',

  // Card
  cardBorder: '#E5E7EB',
  cardBackground: '#FFFFFF',
};

// =============================================================================
// Spacing Tokens (4px base)
// =============================================================================
const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

// =============================================================================
// Border Radius
// =============================================================================
const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

// =============================================================================
// Standardized Button Component
// =============================================================================
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  style,
  icon,
  iconRight,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: Colors.primary },
          text: { color: '#FFFFFF', fontWeight: '600' },
        };
      case 'secondary':
        return {
          container: { backgroundColor: Colors.surface, borderColor: Colors.border },
          text: { color: Colors.textSecondary },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: Colors.textSecondary },
        };
      case 'danger':
        return {
          container: { backgroundColor: Colors.danger },
          text: { color: '#FFFFFF' },
        };
      case 'outline':
        return {
          container: { backgroundColor: 'transparent', borderColor: Colors.border },
          text: { color: Colors.primary, fontWeight: '600' },
        };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 6, paddingHorizontal: 12, minHeight: 36 };
      case 'md':
        return { paddingVertical: 8, paddingHorizontal: 16, minHeight: 40 };
      case 'lg':
        return { paddingVertical: 12, paddingHorizontal: 24, minHeight: 48 };
      default:
        return { paddingVertical: 8, paddingHorizontal: 16, minHeight: 40 };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const isDisabled = disabled || (!onClick && props.onPress === undefined);

  return (
    <TouchableOpacity
      disabled={isDisabled}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: Radius.md,
          gap: 8,
        },
        variantStyles.container,
        sizeStyles,
        fullWidth && { width: '100%' },
        Platform.OS === 'web' && !isDisabled && { cursor: 'pointer' },
        style,
      ]}
      activeOpacity={0.8}
      onClick={(e) => !isDisabled && onClick && onClick(e)}
      {...props}
    >
      {icon && <Ionicons name={icon} size={16} color={variantStyles.text.color} />}
      {typeof children === 'string' ? (
        <Text style={[variantStyles.text, { fontSize: size === 'sm' ? 13 : 15 }]}>{children}</Text>
      ) : (
        children
      )}
      {iconRight && (
        <Ionicons name={iconRight} size={16} color={variantStyles.text.color} />
      )}
    </TouchableOpacity>
  );
};

// =============================================================================
// Standardized Input Field
// =============================================================================
export const Input = ({
  label,
  error,
  helperText,
  icon,
  style,
  rightElement,
  containerStyle,
  ...props
}) => {
  return (
    <View style={[styles.inputGroup, containerStyle]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError, style]}>
        {icon && (
          <View style={styles.inputIcon}>
            <Ionicons name={icon} size={18} color={error ? Colors.danger : Colors.textMuted} />
          </View>
        )}
        <View style={flex: 1}>
          <TextInput
            style={[
              styles.input,
              icon && styles.inputWithIcon,
              rightElement && styles.inputWithRightElement,
              error && styles.inputErrorText,
            ]}
            error={error ? 'true' : undefined}
            {...props}
          />
        </View>
        {rightElement && (
          <View style={styles.inputRightElement}>{rightElement}</View>
        )}
      </View>
      {(error || helperText) && (
        <Text style={[styles.inputHelper, error && styles.inputHelperError]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

// =============================================================================
// Standardized Card Component
// =============================================================================
export const Card = ({
  children,
  style,
  interactive = false,
  onClick,
  padding = 'md',
  ...props
}) => {
  return (
    <TouchableOpacity
      disabled={!interactive}
      style={[
        {
          backgroundColor: Colors.surface,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: Colors.border,
          padding: Spacing[padding],
        },
        interactive && { cursor: 'pointer' },
        style,
      ]}
      onPress={onClick}
      activeOpacity={0.9}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

// =============================================================================
// Standardized Section Header
// =============================================================================
export const SectionHeader = ({ title, action, rightElement }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <View style={styles.sectionHeaderActions}>
        {action && action}
        {rightElement && rightElement}
      </View>
    </View>
  );
};

// =============================================================================
// Standardized Badge
// =============================================================================
export const Badge = ({ type = 'neutral', children, size = 'md' }) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: Colors.successLight, color: Colors.success };
      case 'warning':
        return { backgroundColor: Colors.warningLight, color: Colors.warning };
      case 'danger':
        return { backgroundColor: Colors.dangerLight, color: Colors.danger };
      case 'info':
        return { backgroundColor: Colors.infoLight, color: Colors.primary };
      default:
        return { backgroundColor: Colors.borderLight, color: Colors.textMuted };
    }
  };

  const sizeStyles = size === 'sm' ? { paddingHorizontal: 8, paddingVertical: 4 } : {};

  return (
    <View
      style={[
        {
          backgroundColor: getStyles().backgroundColor,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: Radius.full,
        },
        sizeStyles,
      ]}
    >
      <Text
        style={[
          { fontSize: size === 'sm' ? 11 : 12, fontWeight: '600', color: getStyles().color },
          size === 'sm' && { fontSize: 11 },
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

// =============================================================================
// Standardized Divider
// =============================================================================
export const Divider = ({ style }) => {
  return <View style={[styles.divider, style]} />;
};

// =============================================================================
// Standardized Avatar
// =============================================================================
export const Avatar = ({
  src,
  alt,
  size = 'md',
  name,
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: { width: 32, height: 32, fontSize: 14 },
    md: { width: 40, height: 40, fontSize: 16 },
    lg: { width: 56, height: 56, fontSize: 20 },
    xl: { width: 80, height: 80, fontSize: 28 },
  }[size] || { width: 40, height: 40, fontSize: 16 };

  const getInitials = (name) => {
    if (!name) return '';
    const parts = String(name).trim().split(' ');
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = name ? getInitials(name) : '';

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[{ borderRadius: sizeStyles.width / 2, backgroundColor: Colors.border }, sizeStyles, style]}
        resizeMode="cover"
        alt={alt}
        {...props}
      />
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: sizeStyles.width / 2,
          backgroundColor: Colors.border,
          justifyContent: 'center',
          alignItems: 'center',
        },
        sizeStyles,
        style,
      ]}
      {...props}
    >
      <Text style={{ fontSize: sizeStyles.fontSize / 2, fontWeight: '600', color: Colors.textMuted }}>
        {initials}
      </Text>
    </View>
  );
};

// =============================================================================
// Standardized Action Bar (like Reddit's vote buttons)
// =============================================================================
export const ActionBar = ({ style, children }) => {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

// =============================================================================
// Standardized Vote Button (upvote/downvote)
// =============================================================================
export const VoteButton = ({
  active,
  type = 'upvote',
  onClick,
  count,
  size = 'md',
}) => {
  const isUpvote = type === 'upvote';
  const icon = isUpvote ? 'chevron-up' : 'chevron-down';
  const activeColor = isUpvote ? Colors.success : Colors.danger;
  const inactiveColor = Colors.textMuted;

  const sizeStyles = {
    sm: { width: 24, height: 24, borderRadius: 4 },
    md: { width: 32, height: 32, borderRadius: 6 },
    lg: { width: 40, height: 40, borderRadius: 8 },
  }[size] || { width: 32, height: 32, borderRadius: 6 };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? activeColor : Colors.border,
        },
        sizeStyles,
      ]}
    >
      <TouchableOpacity
        onPress={onClick}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={icon}
          size={size === 'sm' ? 14 : size === 'md' ? 20 : 24}
          color={active ? Colors.surface : inactiveColor}
        />
      </TouchableOpacity>
    </View>
  );
};

// =============================================================================
// Standardized Pagination
// =============================================================================
export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] < i - 1) {
        pages.push('...');
        pages.push(i);
      }
    }
    return pages;
  };

  return (
    <View style={styles.pagination}>
      <TouchableOpacity
        disabled={currentPage === 1}
        onPress={() => onPageChange(currentPage - 1)}
        style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
      >
        <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? Colors.textMuted : Colors.primary} />
      </TouchableOpacity>

      {getPageNumbers().map((page, index) => (
        <TouchableOpacity
          key={index}
          disabled={page === '...'}
          onPress={() => typeof page === 'number' && onPageChange(page)}
          style={[
            styles.paginationButton,
            page === '...' ? { backgroundColor: 'transparent' } : {},
            page === currentPage && styles.paginationButtonActive,
          ]}
        >
          {page === '...' ? (
            <Text style={styles.paginationEllipsis}>...</Text>
          ) : (
            <Text
              style={[
                styles.paginationButtonText,
                page === currentPage && styles.paginationButtonTextActive,
              ]}
            >
              {page}
            </Text>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        disabled={currentPage === totalPages}
        onPress={() => onPageChange(currentPage + 1)}
        style={[
          styles.paginationButton,
          currentPage === totalPages && styles.paginationButtonDisabled,
        ]}
      >
        <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? Colors.textMuted : Colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

// =============================================================================
// Standardized Empty State
// =============================================================================
export const EmptyState = ({ icon, title, description, action }) => {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name={icon} size={48} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {description && <Text style={styles.emptyStateDescription}>{description}</Text>}
      {action && <View style={styles.emptyStateAction}>{action}</View>}
    </View>
  );
};

// =============================================================================
// Reddit-style Navigation Item
// =============================================================================
export const NavItem = ({
  label,
  active,
  icon,
  count,
  onClick,
}) => {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onClick}
      activeOpacity={0.7}
    >
      <View style={styles.navItemContent}>
        {icon && (
          <Ionicons
            name={active ? icon : `${icon}-outline`}
            size={18}
            color={active ? Colors.primary : Colors.textSecondary}
          />
        )}
        <Text
          style={[
            styles.navItemLabel,
            active && styles.navItemLabelActive,
          ]}
        >
          {label}
        </Text>
      </View>
      {count !== undefined && (
        <Text style={[styles.navItemCount, active && styles.navItemCountActive]}>
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// =============================================================================
// Reddit-style Post Card Header
// =============================================================================
export const PostHeader = ({
  author,
  authorLink,
  timestamp,
  forum,
  forumLink,
  actions,
}) => {
  return (
    <View style={styles.postHeader}>
      <View style={styles.postHeaderLeft}>
        {authorLink ? (
          <TouchableOpacity onPress={authorLink.onPress} style={styles.authorLink}>
            <Text style={styles.authorName}>{author}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.authorName}>{author}</Text>
        )}
        <Text style={styles.postMeta}>
          {timestamp} {forum && (
            <>
              <Text style={styles.postMetaSeparator}> in </Text>
              {forumLink ? (
                <TouchableOpacity onPress={forumLink.onPress}>
                  <Text style={styles.forumLink}>{forum}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.forumText}>{forum}</Text>
              )}
            </>
          )}
        </Text>
      </View>
      {actions && <View style={styles.postHeaderActions}>{actions}</View>}
    </View>
  );
};

// =============================================================================
// Reddit-style Post Card Footer Actions
// =============================================================================
export const PostFooterActions = ({ likeCount, commentCount, onLike, onComment, ...props }) => {
  return (
    <View style={styles.postFooter}>
      <TouchableOpacity
        style={styles.postAction}
        onPress={onLike}
        activeOpacity={0.7}
      >
        <Ionicons name="heart-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.postActionText}>{likeCount}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.postAction}
        onPress={onComment}
        activeOpacity={0.7}
      >
        <Ionicons name="chatbubble-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.postActionText}>{commentCount}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.postAction} activeOpacity={0.7}>
        <Ionicons name="share-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.postActionText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
};

// =============================================================================
// Standardized Modal Overlay
// =============================================================================
export const ModalOverlay = ({
  visible,
  onClose,
  children,
  title,
  action,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {title && (
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            {action && <View style={styles.modalAction}>{action}</View>}
          </View>
        )}
        <View style={styles.modalBody}>{children}</View>
      </View>
      <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
    </View>
  );
};

// =============================================================================
// Standardized Toast Notification
// =============================================================================
export const Toast = ({ message, type = 'info', duration = 3000, visible, onClose }) => {
  React.useEffect(() => {
    if (visible && duration) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return Colors.success;
      case 'error':
      case 'danger':
        return Colors.danger;
      case 'warning':
        return Colors.warning;
      default:
        return Colors.textPrimary;
    }
  };

  return (
    <View style={styles.toastContainer}>
      <View style={[styles.toast, { backgroundColor: getBackgroundColor() }]}>
        <Text style={styles.toastMessage}>{message}</Text>
        <TouchableOpacity onPress={onClose} style={styles.toastClose}>
          <Ionicons name="close" size={16} color={Colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================
const styles = StyleSheet.create({
  // Input Group
  inputGroup: { gap: 6 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  inputWithRightElement: {
    paddingRight: 40,
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    pointerEvents: 'none',
  },
  inputRightElement: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    pointerEvents: 'none',
  },
  inputError: {
    borderColor: Colors.danger,
  },
  inputErrorText: {
    color: Colors.danger,
  },
  inputHelper: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  inputHelperError: {
    color: Colors.danger,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
  },
  emptyStateIcon: {
    marginBottom: Spacing.lg,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 300,
    lineHeight: 20,
  },
  emptyStateAction: {
    maxWidth: 200,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xxl,
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  paginationButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  paginationButtonTextActive: {
    color: Colors.surface,
  },
  paginationEllipsis: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Nav Item
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: Colors.infoLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  navItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  navItemLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  navItemCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  navItemCountActive: {
    color: Colors.primary,
  },

  // Post Header
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postHeaderLeft: {
    flex: 1,
  },
  authorLink: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  postMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  postMetaSeparator: {
    color: Colors.textMuted,
  },
  forumLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  forumText: {
    color: Colors.textSecondary,
  },
  postHeaderActions: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Post Footer
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    minWidth: Platform.OS === 'web' ? 300 : '80%',
    maxWidth: 500,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)' } : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalAction: {},
  modalBody: {
    padding: 16,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Toast
  toastContainer: {
    position: 'fixed',
    top: 80,
    left: '50%',
    transform: [{ translateX: -150 }],
    zIndex: 2000,
    minWidth: 300,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  toastMessage: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  toastClose: {
    padding: 4,
  },
});

export default {
  Button,
  Input,
  Card,
  SectionHeader,
  Badge,
  Divider,
  Avatar,
  ActionBar,
  VoteButton,
  Pagination,
  EmptyState,
  NavItem,
  PostHeader,
  PostFooterActions,
  ModalOverlay,
  Toast,
  Colors,
  Spacing,
  Radius,
};

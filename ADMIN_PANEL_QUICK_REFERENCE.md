# Admin Panel - Quick Reference Guide

## Features at a Glance

### 1. Dashboard 📊
**Location:** First tab
- 6 stat cards showing key metrics
- Total users, banned users, muted users
- Pending reports and quarantined content count
- Health indicators for platform safety
- Summary of key statistics

### 2. Moderation Queue 🔍
**Location:** Second tab
- List of pending content reports
- Report reason and reporter info
- Three action options:
  - **Approve Report** - Keep content, mark as reviewed
  - **Quarantine Content** - Hold for further review
  - **Delete Content** - Permanently remove
- Modal interface for detailed review

### 3. User Management 👥
**Location:** Third tab
- Search users by username
- View user statistics (posts, reports, warnings)
- User role badges (admin, moderator)
- Actions available:
  - **Ban User** - Block from platform
  - **Unban User** - Restore access
  - **Mute User** - Temporarily silence (select duration)
  - **Unmute User** - Restore posting rights
  - **View Profile** - See detailed info
  - **Delete Posts** - Remove all user posts
- Mute durations: 1h, 6h, 24h, 72h

### 4. User Activity 📈
**Location:** Fourth tab
- Real-time user activity tracking
- Sort by:
  - Last Active
  - Most Active (post count)
  - Most Reported
- Shows posts, reports, warnings, days as member
- Visual indicators for banned/muted status

### 5. Content Quarantine 🔒
**Location:** Fifth tab
- All content flagged by content filters
- Shows:
  - Content preview
  - Author and forum info
  - Flagged words that triggered quarantine
  - Reason for quarantine
- Actions:
  - **Approve & Restore** - Allow content back online
  - **Delete Permanently** - Remove forever

### 6. Recent Actions ⏰
**Location:** Sixth tab
- Chronological log of all moderation actions
- Colored by action type:
  - 🔴 Red: Bans, deletions
  - 🟡 Yellow: Mutes, warnings
  - 🟢 Green: Promotions
- Shows admin, target user, reason, and timestamp
- Aggregated action type summary

### 7. Forum Management 🗂️
**Location:** Seventh tab
- List of all forums
- Shows member count, post count, moderator count
- Click forum to see details:
  - Forum name and description
  - Member statistics
  - Current moderators
- Actions:
  - **Open Forum** - Navigate to forum
  - **Add Moderator** - Promote user to moderator
  - **Delete Forum** - Remove forum

### 8. Content Filters ✂️
**Location:** Eighth tab
- All active content filter rules
- Each rule shows:
  - Forbidden word/phrase
  - Severity level (Low/Medium/High)
  - Action when triggered (Warn/Quarantine/Delete)
  - Creator info
- **Add New Filter** button to create rules:
  - Enter word to filter
  - Set severity
  - Choose action
- Delete rules with close button

### 9. Moderator Activity 📋
**Location:** Ninth tab
- Complete audit trail of all actions
- Grouped by action type with color coding
- Details for each action:
  - Admin who performed action
  - Target user
  - Reason
  - Duration (for mutes)
- Summary statistics:
  - Total bans, mutes, deletions, promotions
- Time indicator (just now, minutes ago, etc.)

## Color Coding System

- 🟢 **Green** - Success, approved, restore, promote
- 🔴 **Red** - Danger, ban, delete, severe
- 🟡 **Yellow** - Warning, mute, quarantine, moderate
- 🔵 **Blue** - Info, promote, primary action

## Quick Actions

| Action | Path | Steps |
|--------|------|-------|
| Ban a user | User Management | Search → Card → Ban User |
| Mute a user | User Management | Search → Card → Mute User → Select duration |
| Delete a post | Content Moderation Queue | Click report → Delete Content |
| Add filter word | Content Filters | Add New Filter → Enter word → Set severity → Confirm |
| View forum stats | Forum Management | Click forum card |
| See all actions | Recent Actions or Mod Activity | View history |

## Keyboard Shortcuts

- **Search** - Available in User Management (type to filter)
- **Pull Refresh** - Pull down on any list to refresh data

## Permission Requirements

- **Admin Panel Access** - Requires Firebase admin custom claim
- **All Features** - Full admin access required
- **View Only** - No view-only mode (admin has all permissions)

## Stats Dashboard Interpretation

| Metric | Meaning | Action If High |
|--------|---------|----------------|
| Total Users | Platform size | - |
| Banned Users | Enforcement level | Review ban reasons |
| Muted Users | Temporary restrictions | Monitor mute expirations |
| Pending Reports | Workload | Increase mod team |
| Quarantined Content | Filter accuracy | Tune content filters |
| Moderation Actions | Activity level | - |

## Tips & Best Practices

✅ **DO:**
- Use mute before ban to warn users
- Add reasons for all actions for audit trail
- Review filter rules regularly for false positives
- Monitor quarantined content closely
- Check moderator activity log for patterns

❌ **DON'T:**
- Ban without warning for minor violations
- Delete content without review
- Create overly broad filter rules
- Share admin access
- Ignore moderation appeals

## Firebase Collections Needed

For full functionality, ensure these Firestore collections exist:
- `users/` - User data
- `forums/` - Forum information
- `moderation_actions/` - Action audit trail
- `reports/` - Content reports
- `content_filters/` - Filter rules
- `quarantined_content/` - Flagged content
- `user_activity/` - Activity logs

See ADMIN_PANEL.md for detailed schema.

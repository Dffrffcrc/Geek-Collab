# Admin Panel Documentation

A comprehensive administration and moderation system for managing users, content, and forums in the Geek-Collab application.

## Features

The Admin Panel provides complete control over the platform with the following capabilities:

### 1. **Dashboard**
- Overview of platform statistics
- Real-time metrics on users, bans, and mutes
- Content moderation queue status
- Platform health indicators
- Visual summaries of key metrics

### 2. **Content Moderation Queue**
- Review pending content reports
- Take actions on reported content (approve, delete, quarantine)
- View report details and flagged content
- Track reporter information

### 3. **User Management**
- Search and filter users
- View user profiles and statistics
- Ban users with optional notes
- Mute users for specified durations (1h, 6h, 24h, 72h)
- Delete user posts in bulk
- View user report history and warnings

### 4. **User Activity Monitor**
- Track user engagement metrics
- Sort by last active, most active, or most reported
- View post counts and warning history
- Monitor platform activity trends

### 5. **Content Quarantine**
- Review quarantined content awaiting approval
- View flagged words that triggered quarantine
- Approve and restore content
- Permanently delete problematic content

### 6. **Recent Moderation Actions**
- Complete history of all moderation activities
- Filter by action type (bans, mutes, deletions, etc.)
- View admin and target information
- Track action reasons and timestamps

### 7. **Forum Management**
- View all forums and their statistics
- Manage forum moderators
- Open forums for review
- Delete forums if needed
- Monitor forum activity

### 8. **User Management Deep Dive**
- View all platform users with detailed stats
- Profile viewing and editing
- User role management (promote/demote moderators)
- Post deletion for individual users
- Mute/ban management

### 9. **Content Filtering**
- Create and manage content filter rules
- Set severity levels (low, medium, high)
- Configure automatic actions (warn, quarantine, delete)
- View all active filters
- Edit and delete filter rules

### 10. **Moderator Activity Log**
- Complete audit trail of all moderation actions
- Timestamp and admin information for each action
- Summary statistics of actions by type
- Historical data for compliance and reporting

## Architecture

### Components

- **AdminPanel.tsx** - Main container with tab navigation
- **AdminDashboard.tsx** - Statistics and overview
- **ContentModerationQueue.tsx** - Report handling
- **UserManagement.tsx** - User administration
- **UserActivityMonitor.tsx** - Activity tracking
- **ContentQuarantine.tsx** - Quarantine management
- **RecentModerationActions.tsx** - Action history
- **ForumManagement.tsx** - Forum administration
- **ContentFiltering.tsx** - Content filter rules
- **ModeratorActivityLog.tsx** - Audit logging

### Services

**adminService.ts** - Firebase backend integration
- All moderation operations
- User management
- Content filtering
- Activity logging
- Statistics aggregation

**useAdminPanel.ts** - State management hook
- Data fetching and caching
- Loading states
- Refresh functionality
- Error handling

## Firebase Setup

### Required Collections

Create the following Firestore collections:

```
users/
├── [userId]
│   ├── username: string
│   ├── email: string
│   ├── isBanned: boolean
│   ├── isMuted: boolean
│   ├── mutedUntil: Timestamp
│   ├── role: string (user|moderator|admin)
│   ├── postCount: number
│   ├── reportCount: number
│   ├── warningCount: number
│   ├── createdAt: Timestamp
│   └── lastActive: Timestamp

forums/
├── [forumId]
│   ├── name: string
│   ├── description: string
│   ├── moderators: array
│   ├── postCount: number
│   ├── memberCount: number
│   ├── isActive: boolean
│   ├── createdAt: Timestamp
│   └── isDeleted: boolean

moderation_actions/
├── [actionId]
│   ├── type: string (ban|mute|warn|delete_post|promote_mod|demote_mod)
│   ├── targetUserId: string
│   ├── targetUsername: string
│   ├── adminId: string
│   ├── adminUsername: string
│   ├── reason: string
│   ├── duration: number (for mutes, in ms)
│   ├── timestamp: Timestamp
│   └── forumId: string (optional)

reports/
├── [reportId]
│   ├── postId: string
│   ├── authorId: string
│   ├── authorUsername: string
│   ├── forumId: string
│   ├── forumName: string
│   ├── reportedBy: string
│   ├── reason: string
│   ├── content: string
│   ├── timestamp: Timestamp
│   ├── status: string (pending|reviewed|dismissed|actioned)
│   └── action: object (optional)

content_filters/
├── [ruleId]
│   ├── word: string
│   ├── severity: string (low|medium|high)
│   ├── action: string (warn|quarantine|delete)
│   ├── createdAt: Timestamp
│   ├── createdBy: string
│   └── isActive: boolean

quarantined_content/
├── [contentId]
│   ├── type: string (post|comment)
│   ├── authorId: string
│   ├── authorUsername: string
│   ├── content: string
│   ├── reason: string
│   ├── flaggedWords: array
│   ├── timestamp: Timestamp
│   ├── status: string (quarantined|approved|deleted)
│   └── reviewedBy: string (optional)

user_activity/
├── [activityId]
│   ├── userId: string
│   ├── action: string
│   ├── details: object
│   └── timestamp: Timestamp
```

### Firestore Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Only admins can access admin collections
    match /moderation_actions/{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
    
    match /content_filters/{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
    
    match /quarantined_content/{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
    
    match /reports/{document=**} {
      allow read, write: if request.auth.token.admin == true || request.auth.token.moderator == true;
    }
    
    match /users/{userId} {
      // Users can read own data
      allow read: if request.auth.uid == userId;
      // Admins can read all
      allow read: if request.auth.token.admin == true;
      // Admins can write all
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

## Setting Up Admin Access

### Method 1: Firebase Custom Claims (Recommended)

Use Firebase Admin SDK to set custom claims:

```javascript
const admin = require('firebase-admin');

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('Custom claims set for user');
  })
  .catch(error => {
    console.log('Error setting custom claims:', error);
  });
```

### Method 2: User Document Field

Set `role: 'admin'` in the user's Firestore document.

## Usage

### Accessing the Admin Panel

1. The admin button appears in the top-right corner of the home screen
2. Only users with `admin` custom claim can see and access the button
3. Tap the shield icon to open the admin panel
4. Navigate between different admin features using the tab bar

### Common Tasks

#### Banning a User
1. Go to User Management
2. Search for the user
3. Tap their card
4. Select "Ban User"
5. Confirm the action

#### Adding Content Filter
1. Go to Content Filters
2. Tap "Add New Filter"
3. Enter the word to filter
4. Select severity level
5. Choose action (warn/quarantine/delete)
6. Tap "Add Filter"

#### Viewing Reports
1. Go to Content Moderation Queue
2. Review pending reports
3. Tap a report to see details
4. Choose action (approve, delete, or quarantine)
5. Optionally add reason/notes

#### Creating Moderators
1. Go to Forum Management
2. Select a forum
3. Tap "Add Moderator"
4. Search for user
5. Confirm promotion

## Security Considerations

1. **Admin Verification**: Always verify user has admin custom claims before showing panel
2. **Firestore Rules**: Strict security rules ensure only authorized users can access
3. **Activity Logging**: All actions are logged for audit purposes
4. **Rate Limiting**: Consider implementing rate limiting for bulk operations
5. **Two-Factor Auth**: Recommend 2FA for admin accounts

## Performance Tips

1. **Pagination**: Large lists are scrollable and loaded efficiently
2. **Caching**: Hook manages data caching to reduce API calls
3. **Lazy Loading**: Content loads on-demand in modals
4. **Refresh**: Pull-to-refresh functionality available
5. **Search**: Client-side filtering for instant results

## Styling

The admin panel uses the theme system defined in `lib/theme.ts`:
- Dark theme with light accents
- Color-coded actions (green for success, red for danger, yellow for warnings)
- Responsive layout for different screen sizes
- Consistent spacing and typography

## Future Enhancements

- [ ] Bulk user operations
- [ ] Advanced reporting and analytics
- [ ] Automated moderation rules
- [ ] Two-factor authentication for admins
- [ ] Moderation appeals system
- [ ] Forum-specific admin roles
- [ ] Content preview with media support
- [ ] Scheduled actions (auto-ban after N reports)
- [ ] Moderation stats and trends
- [ ] Integration with external services

## Troubleshooting

### Admin Panel Not Appearing
- Verify user has `admin: true` in custom claims
- Check Firestore rules allow admin access
- Ensure user is logged in

### Actions Not Working
- Check Firestore collection exists
- Verify security rules are properly configured
- Check browser console for errors
- Ensure user has admin permissions

### Data Not Loading
- Check internet connection
- Verify collections exist in Firestore
- Check custom claims token is valid
- Refresh the app

## Support

For issues or feature requests, contact the development team or create an issue in the project repository.

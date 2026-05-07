import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  setDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export interface ModerationAction {
  id: string;
  type: 'ban' | 'mute' | 'warn' | 'delete_post' | 'delete_account' | 'promote_mod' | 'demote_mod';
  targetUserId: string;
  targetUsername: string;
  adminId: string;
  adminUsername: string;
  reason: string;
  duration?: number; // in milliseconds
  timestamp: Date;
  forumId?: string;
}

export interface ContentReport {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  forumId: string;
  forumName: string;
  reportedBy: string;
  reason: string;
  content: string;
  timestamp: Date;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  action?: ModerationAction;
}

export interface UserStats {
  id: string;
  username: string;
  email: string;
  isBanned: boolean;
  isMuted: boolean;
  mutedUntil?: Date;
  role: 'user' | 'moderator' | 'admin';
  createdAt: Date;
  lastActive: Date;
  postCount: number;
  reportCount: number;
  warningCount: number;
}

export interface ContentFilterRule {
  id: string;
  word: string;
  severity: 'low' | 'medium' | 'high';
  action: 'warn' | 'quarantine' | 'delete';
  createdAt: Date;
  createdBy: string;
}

export interface QuarantinedContent {
  id: string;
  type: 'post' | 'comment';
  authorId: string;
  authorUsername: string;
  content: string;
  reason: string;
  flaggedWords: string[];
  timestamp: Date;
  status: 'quarantined' | 'approved' | 'deleted';
  reviewedBy?: string;
}

class AdminService {
  /**
   * Log a moderation action
   */
  async logModerationAction(
    action: Omit<ModerationAction, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const modActionsRef = collection(db, 'moderation_actions');
      await setDoc(doc(modActionsRef), {
        ...action,
        timestamp: serverTimestamp(),
      });

      // Update user's warning/moderation count
      const userRef = doc(db, 'users', action.targetUserId);
      if (action.type === 'warn') {
        await updateDoc(userRef, { warningCount: increment(1) });
      }
    } catch (error) {
      console.error('Error logging moderation action:', error);
      throw error;
    }
  }

  /**
   * Get recent moderation actions
   */
  async getRecentModerationActions(limit: number = 50): Promise<ModerationAction[]> {
    try {
      const q = query(
        collection(db, 'moderation_actions'),
        // Firestore query would order by timestamp here if implemented
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as ModerationAction[];
    } catch (error) {
      console.error('Error fetching moderation actions:', error);
      return [];
    }
  }

  /**
   * Ban a user
   */
  async banUser(userId: string, username: string, reason: string, adminId: string, adminUsername: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isBanned: true,
        bannedReason: reason,
        bannedAt: serverTimestamp(),
        bannedBy: adminId,
      });

      await this.logModerationAction({
        type: 'ban',
        targetUserId: userId,
        targetUsername: username,
        adminId,
        adminUsername,
        reason,
      });
    } catch (error) {
      console.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Unban a user
   */
  async unbanUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isBanned: false,
        bannedReason: null,
        bannedAt: null,
        bannedBy: null,
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      throw error;
    }
  }

  /**
   * Mute a user for a specific duration
   */
  async muteUser(
    userId: string,
    username: string,
    durationMs: number,
    reason: string,
    adminId: string,
    adminUsername: string
  ): Promise<void> {
    try {
      const mutedUntil = new Date(Date.now() + durationMs);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isMuted: true,
        mutedUntil: Timestamp.fromDate(mutedUntil),
        muteReason: reason,
        mutedBy: adminId,
      });

      await this.logModerationAction({
        type: 'mute',
        targetUserId: userId,
        targetUsername: username,
        adminId,
        adminUsername,
        reason,
        duration: durationMs,
      });
    } catch (error) {
      console.error('Error muting user:', error);
      throw error;
    }
  }

  /**
   * Unmute a user
   */
  async unmuteUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isMuted: false,
        mutedUntil: null,
        muteReason: null,
        mutedBy: null,
      });
    } catch (error) {
      console.error('Error unmuting user:', error);
      throw error;
    }
  }

  /**
   * Delete a post
   */
  async deletePost(
    postId: string,
    reason: string,
    adminId: string,
    adminUsername: string
  ): Promise<void> {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        isDeleted: true,
        deleteReason: reason,
        deletedBy: adminId,
        deletedAt: serverTimestamp(),
      });

      await this.logModerationAction({
        type: 'delete_post',
        targetUserId: '', // Would need to fetch this
        targetUsername: '',
        adminId,
        adminUsername,
        reason,
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Add content filter rule
   */
  async addContentFilterRule(
    word: string,
    severity: 'low' | 'medium' | 'high',
    action: 'warn' | 'quarantine' | 'delete',
    adminId: string
  ): Promise<void> {
    try {
      await setDoc(doc(collection(db, 'content_filters')), {
        word: word.toLowerCase(),
        severity,
        action,
        createdAt: serverTimestamp(),
        createdBy: adminId,
        isActive: true,
      });
    } catch (error) {
      console.error('Error adding filter rule:', error);
      throw error;
    }
  }

  /**
   * Get all content filter rules
   */
  async getContentFilterRules(): Promise<ContentFilterRule[]> {
    try {
      const snapshot = await getDocs(collection(db, 'content_filters'));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as ContentFilterRule[];
    } catch (error) {
      console.error('Error fetching filter rules:', error);
      return [];
    }
  }

  /**
   * Delete content filter rule
   */
  async deleteContentFilterRule(ruleId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'content_filters', ruleId), {
        isActive: false,
      });
    } catch (error) {
      console.error('Error deleting filter rule:', error);
      throw error;
    }
  }

  /**
   * Get all users for admin view
   */
  async getAllUsers(): Promise<UserStats[]> {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastActive: doc.data().lastActive?.toDate() || new Date(),
      })) as UserStats[];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Get user details
   */
  async getUserDetails(userId: string): Promise<UserStats | null> {
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      if (!docSnap.exists()) return null;
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        lastActive: docSnap.data().lastActive?.toDate() || new Date(),
      } as UserStats;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  }

  /**
   * Promote user to moderator for a forum
   */
  async promoteToModeratorForForum(
    userId: string,
    forumId: string,
    adminId: string,
    adminUsername: string,
    username: string
  ): Promise<void> {
    try {
      const forumRef = doc(db, 'forums', forumId);
      await updateDoc(forumRef, {
        moderators: arrayUnion(userId),
      });

      await this.logModerationAction({
        type: 'promote_mod',
        targetUserId: userId,
        targetUsername: username,
        adminId,
        adminUsername,
        reason: `Promoted to moderator for forum ${forumId}`,
        forumId,
      });
    } catch (error) {
      console.error('Error promoting moderator:', error);
      throw error;
    }
  }

  /**
   * Demote moderator from a forum
   */
  async demoteModeratorFromForum(
    userId: string,
    forumId: string,
    adminId: string,
    adminUsername: string,
    username: string
  ): Promise<void> {
    try {
      const forumRef = doc(db, 'forums', forumId);
      await updateDoc(forumRef, {
        moderators: arrayRemove(userId),
      });

      await this.logModerationAction({
        type: 'demote_mod',
        targetUserId: userId,
        targetUsername: username,
        adminId,
        adminUsername,
        reason: `Demoted from moderator for forum ${forumId}`,
        forumId,
      });
    } catch (error) {
      console.error('Error demoting moderator:', error);
      throw error;
    }
  }

  /**
   * Get all forums for admin management
   */
  async getAllForums() {
    try {
      const snapshot = await getDocs(collection(db, 'forums'));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
    } catch (error) {
      console.error('Error fetching forums:', error);
      return [];
    }
  }

  /**
   * Delete a forum
   */
  async deleteForum(forumId: string): Promise<void> {
    try {
      const forumRef = doc(db, 'forums', forumId);
      await updateDoc(forumRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error deleting forum:', error);
      throw error;
    }
  }

  /**
   * Get reported posts
   */
  async getReportedPosts(): Promise<ContentReport[]> {
    try {
      const q = query(collection(db, 'reports'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as ContentReport[];
    } catch (error) {
      console.error('Error fetching reported posts:', error);
      return [];
    }
  }

  /**
   * Get quarantined content
   */
  async getQuarantinedContent(): Promise<QuarantinedContent[]> {
    try {
      const q = query(collection(db, 'quarantined_content'), where('status', '==', 'quarantined'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as QuarantinedContent[];
    } catch (error) {
      console.error('Error fetching quarantined content:', error);
      return [];
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(userId: string, limit: number = 100) {
    try {
      const q = query(collection(db, 'user_activity'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      }));
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      return [];
    }
  }

  /**
   * Get moderator activity logs
   */
  async getModeratorActivityLogs(limit: number = 100): Promise<ModerationAction[]> {
    try {
      const snapshot = await getDocs(collection(db, 'moderation_actions'));
      return snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit) as ModerationAction[];
    } catch (error) {
      console.error('Error fetching moderator activity logs:', error);
      return [];
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const [users, reports, quarantined, modActions] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'reports'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'quarantined_content'), where('status', '==', 'quarantined'))),
        getDocs(collection(db, 'moderation_actions')),
      ]);

      return {
        totalUsers: users.size,
        bannedUsers: users.docs.filter((d) => d.data().isBanned).length,
        mutedUsers: users.docs.filter((d) => d.data().isMuted).length,
        pendingReports: reports.size,
        quarantinedContent: quarantined.size,
        totalModerationActions: modActions.size,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalUsers: 0,
        bannedUsers: 0,
        mutedUsers: 0,
        pendingReports: 0,
        quarantinedContent: 0,
        totalModerationActions: 0,
      };
    }
  }
}

export const adminService = new AdminService();

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';

export type NotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'like'
  | 'comment'
  | 'mention'
  | 'story_reaction';

export interface AppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorAvatar?: string | null;
  text: string;
  postId?: string | null;
  read: boolean;
  createdAt?: any;
}

/**
 * Writes a single notification document for `recipientId`. Never
 * notifies a user about their own action, and swallows errors so a
 * failed notification write never blocks the action that triggered it
 * (liking/commenting/etc. should still succeed).
 */
export const createNotification = async (data: {
  recipientId: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorAvatar?: string | null;
  text: string;
  postId?: string | null;
}) => {
  if (!data.recipientId || data.recipientId === data.actorId) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      recipientId: data.recipientId,
      type: data.type,
      actorId: data.actorId,
      actorName: data.actorName || 'Someone',
      actorAvatar: data.actorAvatar || null,
      text: data.text,
      postId: data.postId || null,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

/** Streams the latest notifications for `userId`, newest first. */
export const subscribeToNotifications = (
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void
) => {
  if (!userId) return () => {};
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AppNotification[];
        onUpdate(notifs);
      },
      (err) => {
        console.error('Error listening to notifications:', err);
        onUpdate([]);
      }
    );
  } catch (err) {
    console.error('Failed to subscribe to notifications:', err);
    return () => {};
  }
};

/** Marks every currently-unread notification as read. */
export const markAllNotificationsRead = async (notifications: AppNotification[]) => {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error marking notifications read:', err);
  }
};

export const markNotificationRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
  }
};

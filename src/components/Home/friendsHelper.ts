import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { createNotification } from './notificationsService';

export interface FriendSummary {
  uid: string;
  firstName: string;
  lastName?: string;
  profileImage?: string;
}

export async function fetchAcceptedFriendIds(userId: string): Promise<string[]> {
  const q1 = query(
    collection(db, 'friendRequests'),
    where('senderId', '==', userId),
    where('status', '==', 'accepted')
  );
  const q2 = query(
    collection(db, 'friendRequests'),
    where('receiverId', '==', userId),
    where('status', '==', 'accepted')
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const ids = new Set<string>();
  snap1.docs.forEach((d) => ids.add(d.data().receiverId));
  snap2.docs.forEach((d) => ids.add(d.data().senderId));
  return Array.from(ids);
}

export async function fetchAcceptedFriends(userId: string): Promise<FriendSummary[]> {
  const ids = await fetchAcceptedFriendIds(userId);
  const friends = await Promise.all(
    ids.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        const data: any = snap.exists() ? snap.data() : {};
        return {
          uid,
          firstName: data.firstName || data.name || 'Facebook User',
          lastName: data.lastName || '',
          profileImage: data.profileImage,
        } as FriendSummary;
      } catch {
        return { uid, firstName: 'Facebook User' } as FriendSummary;
      }
    })
  );
  return friends;
}

/**
 * Sends a friend request from `senderId` to `receiverId` and notifies
 * the receiver. Shared by every "Add friend" button in the app (search
 * results, profile modal, etc.) so the behavior stays consistent.
 */
export async function sendFriendRequest(
  senderId: string,
  senderName: string,
  senderAvatar: string | null | undefined,
  receiverId: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'friendRequests'), {
    senderId,
    receiverId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  await createNotification({
    recipientId: receiverId,
    type: 'friend_request',
    actorId: senderId,
    actorName: senderName,
    actorAvatar: senderAvatar,
    text: `${senderName} sent you a friend request.`,
  });

  return docRef.id;
}
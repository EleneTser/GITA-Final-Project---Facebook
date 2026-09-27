import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import staticData from '../../data.json';

export interface SearchUser {
  uid: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  email?: string;
  mutual?: string;
}

/** Looks up every user (real + demo) whose name/email matches `term`. */
export const searchUsers = async (term: string): Promise<SearchUser[]> => {
  const q = term.trim().toLowerCase();
  if (!q) return [];

  let firestoreUsers: SearchUser[] = [];
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    firestoreUsers = snapshot.docs.map((d) => {
      const data = d.data() as any;
      return {
        uid: d.id,
        firstName: data.firstName || (data.name || '').split(' ')[0] || 'Facebook',
        lastName: data.lastName || (data.name || '').split(' ').slice(1).join(' '),
        profileImage: data.profileImage,
        email: data.email,
      };
    });
  } catch (err) {
    console.error('Error fetching users for search:', err);
  }

  const staticUsers: SearchUser[] = ((staticData.users || []) as any[]).map((u) => ({
    uid: u.id,
    firstName: (u.name || '').split(' ')[0] || u.name,
    lastName: (u.name || '').split(' ').slice(1).join(' '),
    profileImage: u.profileImage,
  }));

  const all = [...firestoreUsers, ...staticUsers];
  return all.filter((u) => {
    const first = (u.firstName || '').toLowerCase();
    const last = (u.lastName || '').toLowerCase();
    const full = `${first} ${last}`.trim();
    const email = (u.email || '').toLowerCase();
    return first.includes(q) || last.includes(q) || full.includes(q) || email.includes(q);
  });
};

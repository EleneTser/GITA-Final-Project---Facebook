import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { searchUsers, type SearchUser } from './searchService';
import { sendFriendRequest } from './friendsHelper';
import { useUserAvatar, DEFAULT_AVATAR } from './useUserAvatar';

interface SearchResultsPageProps {
  currentUserId: string;
  userDisplayName: string;
  onProfileClick: (userId: string) => void;
}

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  currentUserId,
  userDisplayName,
  onProfileClick,
}) => {
  const [searchParams] = useSearchParams();
  const term = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchUsers(term)
      .then((users) => {
        if (!cancelled) setResults(users.filter((u) => u.uid !== currentUserId));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [term, currentUserId]);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Left filter rail (simplified) */}
        <div className="w-full sm:w-52 shrink-0">
          <h1 className="text-xl font-bold text-[#1c1e21] mb-3">Search results</h1>
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e7f3ff] text-[#1877f2] font-semibold text-sm cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">group</span>
              People
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#65676b] font-semibold text-sm cursor-not-allowed opacity-60">
              <span className="material-symbols-outlined text-[20px]">dynamic_feed</span>
              Posts
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#65676b] font-semibold text-sm cursor-not-allowed opacity-60">
              <span className="material-symbols-outlined text-[20px]">photo_library</span>
              Photos
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0 pb-10">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-[#1c1e21] mb-4">
              {loading ? 'Searching…' : `People matching "${term}"`}
            </h2>

            {!loading && results.length === 0 && (
              <p className="text-gray-500 text-sm py-6 text-center">No people found for "{term}".</p>
            )}

            <div className="space-y-1">
              {results.map((user) => (
                <PersonRow
                  key={user.uid}
                  user={user}
                  currentUserId={currentUserId}
                  userDisplayName={userDisplayName}
                  onProfileClick={onProfileClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PersonRow: React.FC<{
  user: SearchUser;
  currentUserId: string;
  userDisplayName: string;
  onProfileClick: (userId: string) => void;
}> = ({ user, currentUserId, userDisplayName, onProfileClick }) => {
  const avatar = useUserAvatar(user.uid, user.profileImage);
  const [status, setStatus] = useState<'none' | 'pending' | 'friends' | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const q1 = query(
          collection(db, 'friendRequests'),
          where('senderId', '==', currentUserId),
          where('receiverId', '==', user.uid)
        );
        const q2 = query(
          collection(db, 'friendRequests'),
          where('senderId', '==', user.uid),
          where('receiverId', '==', currentUserId)
        );
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const match = snap1.docs[0] || snap2.docs[0];
        if (cancelled) return;
        if (!match) {
          setStatus('none');
        } else {
          const data = match.data();
          setStatus(data.status === 'accepted' ? 'friends' : 'pending');
        }
      } catch (err) {
        console.error('Error checking friend status:', err);
        if (!cancelled) setStatus('none');
      }
    };
    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, user.uid]);

  const handleAddFriend = async () => {
    if (status !== 'none') return;
    setStatus('pending');
    try {
      await sendFriendRequest(
        currentUserId,
        userDisplayName || auth.currentUser?.displayName || 'Someone',
        auth.currentUser?.photoURL,
        user.uid
      );
    } catch (err) {
      console.error('Error sending friend request:', err);
      setStatus('none');
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-1 sm:px-2 rounded-lg hover:bg-gray-50 transition">
      <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => onProfileClick(user.uid)}>
        <div className="w-12 h-12 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0 overflow-hidden">
          {avatar && avatar !== DEFAULT_AVATAR ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            user.firstName?.[0]?.toUpperCase() || 'U'
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[#1c1e21] text-sm truncate hover:underline">
            {user.firstName} {user.lastName}
          </p>
          {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
        </div>
      </div>

      {status === 'friends' ? (
        <span className="px-4 py-1.5 rounded-lg bg-[#e4e6eb] text-[#050505] font-semibold text-sm shrink-0">Friends</span>
      ) : status === 'pending' ? (
        <span className="px-4 py-1.5 rounded-lg bg-[#e4e6eb] text-[#65676b] font-semibold text-sm shrink-0">Pending</span>
      ) : status === 'loading' ? (
        <span className="px-4 py-1.5 rounded-lg text-transparent text-sm shrink-0">Add friend</span>
      ) : (
        <button
          onClick={handleAddFriend}
          className="px-4 py-1.5 rounded-lg bg-[#1877f2] hover:bg-[#166fe5] text-white font-semibold text-sm shrink-0 transition cursor-pointer"
        >
          Add friend
        </button>
      )}
    </div>
  );
};

export default SearchResultsPage;

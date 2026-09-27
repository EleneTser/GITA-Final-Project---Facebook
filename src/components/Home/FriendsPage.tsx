import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import mockData from '../../data.json';
import { useUserAvatar, DEFAULT_AVATAR } from './useUserAvatar';
import { createNotification } from './notificationsService';
import { fetchAcceptedFriends, type FriendSummary } from './friendsHelper';

interface FriendsPageProps {
  currentUserId: string;
  onProfileClick: (friendId: string) => void;
}

type FriendsView = 'home' | 'requests' | 'suggestions' | 'all' | 'birthdays' | 'lists';

const mutualFriendsFor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 47;
  return hash + 1;
};

export const FriendsPage: React.FC<FriendsPageProps> = ({ currentUserId, onProfileClick }) => {
  const [view, setView] = useState<FriendsView>('home');
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [allFriends, setAllFriends] = useState<FriendSummary[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const fetchIncomingRequests = async () => {
    if (!currentUserId) return;

    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('receiverId', '==', currentUserId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      const requestsData = await Promise.all(
        snapshot.docs.map(async (requestDoc) => {
          const data = requestDoc.data();
          const userDocRef = doc(db, 'users', data.senderId);
          const userDoc = await getDoc(userDocRef);

          return {
            id: requestDoc.id,
            ...data,
            sender: userDoc.exists() ? userDoc.data() : { firstName: 'Facebook', lastName: 'User', email: '' },
          };
        })
      );

      setIncomingRequests(requestsData);

      setSuggestions(mockData.users);
    } catch (err) {
      console.error('Error fetching incoming requests & suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomingRequests();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    setLoadingFriends(true);
    fetchAcceptedFriends(currentUserId)
      .then((friends) => {
        if (!cancelled) setAllFriends(friends);
      })
      .catch((err) => console.error('Error loading friends list:', err))
      .finally(() => {
        if (!cancelled) setLoadingFriends(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const handleAccept = async (requestId: string) => {
    try {
      const req = incomingRequests.find((r) => r.id === requestId);
      await updateDoc(doc(db, 'friendRequests', requestId), { status: 'accepted' });
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));

      if (req) {
        const accepterName = auth.currentUser?.displayName || 'Someone';
        await createNotification({
          recipientId: req.senderId,
          type: 'friend_accept',
          actorId: currentUserId,
          actorName: accepterName,
          actorAvatar: auth.currentUser?.photoURL,
          text: `${accepterName} accepted your friend request.`,
        });
      }
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
      setIncomingRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const handleAddSuggestion = (userId: string) => {
    setSentRequests((prev) => [...prev, userId]);
  };

  const handleRemoveSuggestion = (userId: string) => {
    setSuggestions((prev) => prev.filter((user) => user.id !== userId));
  };

  const navItems: { id: FriendsView; label: string; icon: string; count?: number }[] = [
    { id: 'home', label: 'Home', icon: 'group' },
    { id: 'requests', label: 'Friend requests', icon: 'person_add', count: incomingRequests.length || undefined },
    { id: 'suggestions', label: 'Suggestions', icon: 'diversity_3' },
    { id: 'all', label: 'All friends', icon: 'people' },
    { id: 'birthdays', label: 'Birthdays', icon: 'cake' },
    { id: 'lists', label: 'Custom lists', icon: 'list_alt' },
  ];

  const suggestionsGrid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {suggestions.map((user) => {
        const isRequestSent = sentRequests.includes(user.id);
        return (
          <SuggestionCard
            key={user.id}
            user={user}
            mutualCount={mutualFriendsFor(user.id)}
            isRequestSent={isRequestSent}
            onProfileClick={onProfileClick}
            onAdd={() => handleAddSuggestion(user.id)}
            onRemove={() => handleRemoveSuggestion(user.id)}
          />
        );
      })}
    </div>
  );

  const requestsGrid = loading ? (
    <p className="text-gray-500">Loading requests...</p>
  ) : incomingRequests.length === 0 ? (
    <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-200">
      <p className="text-gray-500 text-sm">No pending friend requests.</p>
    </div>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {incomingRequests.map((req) => (
        <IncomingRequestCard
          key={req.id}
          req={req}
          onProfileClick={onProfileClick}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      ))}
    </div>
  );

  const allFriendsGrid = loadingFriends ? (
    <p className="text-gray-500">Loading friends...</p>
  ) : allFriends.length === 0 ? (
    <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-200">
      <p className="text-gray-500 text-sm">You haven't added any friends yet.</p>
    </div>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {allFriends.map((f) => (
        <FriendCard key={f.uid} friend={f} onProfileClick={onProfileClick} />
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 pb-10">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Left nav */}
        <div className="w-full sm:w-64 shrink-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <h1 className="text-2xl font-bold text-[#1c1e21]">Friends</h1>
          </div>
          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition text-left cursor-pointer ${
                  view === item.id ? 'bg-[#e7f3ff] text-[#1877f2]' : 'text-[#050505] hover:bg-[#e4e6eb]'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    view === item.id ? 'bg-[#1877f2] text-white' : 'bg-[#e4e6eb] text-[#050505]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                </span>
                <span className={`flex-1 text-sm truncate ${view === item.id ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {!!item.count && (
                  <span className="text-xs font-bold bg-[#e41e3f] text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {item.count}
                  </span>
                )}
                {item.id !== 'home' && item.id !== 'birthdays' && (
                  <span className="material-symbols-outlined text-[16px] text-gray-400 shrink-0">chevron_right</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6 sm:space-y-8 pt-1">
          {view === 'home' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-[#1c1e21]">Friend Requests</h2>
                  {incomingRequests.length > 0 && (
                    <button onClick={() => setView('requests')} className="text-[#1877f2] font-semibold text-sm hover:underline cursor-pointer">
                      See all
                    </button>
                  )}
                </div>
                {requestsGrid}
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-[#1c1e21]">People You May Know</h2>
                  <button onClick={() => setView('suggestions')} className="text-[#1877f2] font-semibold text-sm hover:underline cursor-pointer">
                    See all
                  </button>
                </div>
                {suggestionsGrid}
              </div>
            </>
          )}

          {view === 'requests' && (
            <div>
              <h2 className="text-xl font-bold text-[#1c1e21] mb-3">Friend Requests</h2>
              {requestsGrid}
            </div>
          )}

          {view === 'suggestions' && (
            <div>
              <h2 className="text-xl font-bold text-[#1c1e21] mb-3">People You May Know</h2>
              {suggestionsGrid}
            </div>
          )}

          {view === 'all' && (
            <div>
              <h2 className="text-xl font-bold text-[#1c1e21] mb-3">All Friends</h2>
              {allFriendsGrid}
            </div>
          )}

          {view === 'birthdays' && (
            <div>
              <h2 className="text-xl font-bold text-[#1c1e21] mb-3">Birthdays</h2>
              <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-200">
                <span className="material-symbols-outlined text-[32px] text-gray-300 mb-1 block">cake</span>
                <p className="text-gray-500 text-sm">No birthdays today.</p>
              </div>
            </div>
          )}

          {view === 'lists' && (
            <div>
              <h2 className="text-xl font-bold text-[#1c1e21] mb-3">Custom Lists</h2>
              <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-200">
                <span className="material-symbols-outlined text-[32px] text-gray-300 mb-1 block">list_alt</span>
                <p className="text-gray-500 text-sm">You haven't created any custom lists yet.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IncomingRequestCard: React.FC<{
  req: any;
  onProfileClick: (id: string) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ req, onProfileClick, onAccept, onReject }) => {
  const avatar = useUserAvatar(req.senderId, req.sender?.profileImage);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <div
        onClick={() => onProfileClick(req.senderId)}
        className="h-36 sm:h-40 bg-blue-500 flex items-center justify-center text-white text-3xl font-bold cursor-pointer overflow-hidden"
      >
        {avatar && avatar !== DEFAULT_AVATAR ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          req.sender.firstName?.[0]?.toUpperCase()
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h3
            onClick={() => onProfileClick(req.senderId)}
            className="font-bold text-[#1c1e21] text-sm truncate cursor-pointer hover:underline"
          >
            {req.sender.firstName} {req.sender.lastName}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{mutualFriendsFor(req.senderId)} mutual friends</p>
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          <button
            onClick={() => onAccept(req.id)}
            className="w-full py-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white text-sm font-semibold rounded-lg cursor-pointer transition text-center"
          >
            Confirm
          </button>
          <button
            onClick={() => onReject(req.id)}
            className="w-full py-1.5 bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] text-sm font-semibold rounded-lg cursor-pointer transition text-center"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const SuggestionCard: React.FC<{
  user: any;
  mutualCount: number;
  isRequestSent: boolean;
  onProfileClick: (id: string) => void;
  onAdd: () => void;
  onRemove: () => void;
}> = ({ user, mutualCount, isRequestSent, onProfileClick, onAdd, onRemove }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
    <div
      onClick={() => onProfileClick(user.id)}
      className="h-32 sm:h-40 w-full bg-gray-200 overflow-hidden cursor-pointer"
    >
      <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
    </div>

    <div className="p-3 flex flex-col flex-1 justify-between">
      <div onClick={() => onProfileClick(user.id)} className="cursor-pointer">
        <h3 className="font-bold text-[#1c1e21] text-sm truncate hover:underline">{user.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{mutualCount} mutual friends</p>
      </div>

      <div className="flex flex-col gap-1.5 mt-3">
        <button
          onClick={onAdd}
          disabled={isRequestSent}
          className={`w-full py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
            isRequestSent
              ? 'bg-gray-200 text-gray-600 cursor-default'
              : 'bg-[#e7f3ff] text-[#1877f2] hover:bg-[#dbe7f2]'
          }`}
        >
          {isRequestSent ? 'Request Sent' : 'Add Friend'}
        </button>
        <button
          onClick={onRemove}
          className="w-full py-1.5 rounded-lg text-sm font-semibold bg-[#e4e6eb] text-[#050505] hover:bg-[#d8dadf] transition cursor-pointer"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
);

const FriendCard: React.FC<{ friend: FriendSummary; onProfileClick: (id: string) => void }> = ({ friend, onProfileClick }) => {
  const avatar = useUserAvatar(friend.uid, friend.profileImage);
  return (
    <div
      onClick={() => onProfileClick(friend.uid)}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col cursor-pointer group"
    >
      <div className="h-32 sm:h-40 w-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
        {avatar && avatar !== DEFAULT_AVATAR ? (
          <img src={avatar} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          friend.firstName?.[0]?.toUpperCase()
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-[#1c1e21] text-sm truncate group-hover:underline">
          {friend.firstName} {friend.lastName}
        </h3>
      </div>
    </div>
  );
};

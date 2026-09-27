import React, { useEffect, useState } from 'react';
import { fetchAcceptedFriends, type FriendSummary } from './friendsHelper';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <circle cx="11" cy="11" r="7" stroke="#050505" strokeWidth="2" />
    <path d="M21 21l-4-4" stroke="#050505" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const DotsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#050505">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

interface RightSidebarProps {
  currentUserId: string;
  onOpenChat?: (friend: FriendSummary) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ currentUserId, onOpenChat }) => {
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    setLoading(true);
    fetchAcceptedFriends(currentUserId)
      .then((list) => {
        if (!cancelled) setFriends(list);
      })
      .catch((err) => console.error('Error loading friends for contacts list:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  return (
    <aside className="hidden xl:block fixed right-0 top-[56px] w-[300px] h-[calc(100vh-56px)] overflow-y-auto pt-4 pb-6 pl-2 pr-3 scrollbar-thin z-10 text-[#050505]">
      {/* Contacts */}
      <div>
        <div className="flex items-center justify-between px-2 mb-1">
          <h3 className="text-[17px] font-semibold text-[#65676b]">Contacts</h3>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full hover:bg-[#e4e6eb] flex items-center justify-center transition-colors">
              <SearchIcon />
            </button>
            <button className="w-8 h-8 rounded-full hover:bg-[#e4e6eb] flex items-center justify-center transition-colors">
              <DotsIcon />
            </button>
          </div>
        </div>

        {loading ? (
          <p className="px-2 py-1.5 text-[14px] text-[#65676b]">Loading...</p>
        ) : friends.length === 0 ? (
          <p className="px-2 py-1.5 text-[14px] text-[#65676b]">
            No friends yet. Add friends to see them here.
          </p>
        ) : (
          <nav>
            {friends.map((f) => (
              <div
                key={f.uid}
                onClick={() => onOpenChat?.(f)}
                className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#e4e6eb] cursor-pointer transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                    {f.profileImage ? (
                      <img src={f.profileImage} alt={f.firstName} className="w-full h-full object-cover" />
                    ) : (
                      `${f.firstName?.[0] ?? ''}${f.lastName?.[0] ?? ''}`.toUpperCase()
                    )}
                  </div>
                </div>
                <span className="text-[15px] truncate">
                  {f.firstName} {f.lastName}
                </span>
              </div>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
};

export default RightSidebar;
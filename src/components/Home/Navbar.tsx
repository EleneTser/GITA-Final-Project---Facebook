import React, { useState, useRef, useEffect } from 'react';
import Fblogo from '../../assets/Icons/Facebook-Logosu.png';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { auth } from '../../firebase';
import { FloatingChatBox } from './FloatingChatBox';
import staticData from '../../data.json';
import { useNavigate } from 'react-router-dom';
import { useUserAvatar } from './useUserAvatar';
import { subscribeToNotifications, markAllNotificationsRead, type AppNotification } from './notificationsService';

import home from '../../assets/Icons/Home.png';
import homeactive from '../../assets/Icons/Homeactive.png';
import friends from '../../assets/Icons/Friends.png';
import friendsActive from '../../assets/Icons/FriendsActive.png';
import reels from '../../assets/Icons/Reels.png';
import reelsActive from '../../assets/Icons/ReelsActive.png';
import groups from '../../assets/Icons/Groups.png';
import groupsActive from '../../assets/Icons/GroupsActive.png';

// Menu dropdown row icons
import events from '../../assets/Icons/events.png';
import YourAdActivity from '../../assets/Icons/YourAdActivity.png';
import Whatsapp from '../../assets/Icons/Whatsapp.png';
import PlayGames from '../../assets/Icons/PlayGames.png';
import Pages from '../../assets/Icons/Pages.png';
import OrdersandPayments from '../../assets/Icons/OrdersandPayments.png';
import NewsFeed from '../../assets/Icons/NewsFeed.png';
import Feed from '../../assets/Icons/Feeds.png';
import MetaAI from '../../assets/Icons/MetaAI.png';
import Instagram from '../../assets/Icons/Instagram.png';
import GamingVideo from '../../assets/Icons/GamingVideo.png';
import AdsManager from '../../assets/Icons/AdsManager.png';
import Marketplace from '../../assets/Icons/Marketplace.png';
import Memories from '../../assets/Icons/Memories.png';
import Saved from '../../assets/Icons/Saved.png';
import Friendsright from '../../assets/Icons/Friendsright.png';
import Groupsright from '../../assets/Icons/Groupsright.png';
import Reelsright from '../../assets/Icons/Reelsright.png';

import CreatePost from '../../assets/Icons/Post.png';
import CreateStory from '../../assets/Icons/Story.png';
import CreateReel from '../../assets/Icons/ReelsBlack.png';
import CreatePage from '../../assets/Icons/PageBlack.png';
import CreateAd from '../../assets/Icons/Ad.png';
import CreateGroup from '../../assets/Icons/GroupBlack.png';
import CreateEvent from '../../assets/Icons/Eventblack.png';
import CreateNote from '../../assets/Icons/Note.png';
import CreateLifeEvent from '../../assets/Icons/LifeUpdate.png';

import menu from '../../assets/Icons/menu.png';
import messenger from '../../assets/Icons/messenger.png';
import notification from '../../assets/Icons/Notification.png';

interface NavbarProps {
  currentUserId: string;
  userDisplayName: string;
  userAvatar?: string;
  onProfileClick: () => void;
  onSelectUser: (userId: string) => void;
  onLogout: () => void;
  openChatRequest?: { friend: any; ts: number } | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreatePost?: () => void;
}

interface UserProfile {
  uid?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUserId,
  userDisplayName,
  userAvatar,
  onProfileClick,
  onSelectUser,
  onLogout,
  openChatRequest,
  activeTab,
  setActiveTab,
  onOpenCreatePost,
}) => {
    const STATIC_USERS = staticData.users || [];
    const navigate = useNavigate();

    const liveOwnAvatar = useUserAvatar(currentUserId, userAvatar);

  const [showDropdown, setShowDropdown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [menuToast, setMenuToast] = useState<string | null>(null);
  const menuToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMenuToast = (message: string) => {
    if (menuToastTimerRef.current) clearTimeout(menuToastTimerRef.current);
    setMenuToast(message);
    menuToastTimerRef.current = setTimeout(() => setMenuToast(null), 2500);
  };
  const handleMenuItem = (action: () => void) => {
    setShowMenuDropdown(false);
    action();
  };
  const [showMessengerDropdown, setShowMessengerDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
const [allUsers, setAllUsers] = useState<any[]>([...STATIC_USERS]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [messengerFriends, setMessengerFriends] = useState<any[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const messengerRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  
  

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const fetched: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as UserProfile;
          fetched.push({ ...data, uid: doc.id });
        });
        
        setAllUsers([...STATIC_USERS, ...fetched]);
      } catch (err) {
        console.error('Error fetching users from Firestore:', err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const activeUid = currentUserId || auth.currentUser?.uid;
    if (!activeUid) return;
    const unsubscribe = subscribeToNotifications(activeUid, setNotifications);
    return () => unsubscribe();
  }, [currentUserId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const timeAgo = (createdAt: any) => {
    const date = createdAt?.toDate ? createdAt.toDate() : createdAt instanceof Date ? createdAt : null;
    if (!date) return 'Just now';
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const notificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'friend_request':
        return 'person_add';
      case 'friend_accept':
        return 'how_to_reg';
      case 'like':
        return 'thumb_up';
      case 'comment':
        return 'chat_bubble';
      case 'mention':
        return 'alternate_email';
      case 'story_reaction':
        return 'favorite';
      default:
        return 'notifications';
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers([]);
      return;
    }
    const term = searchQuery.toLowerCase().trim();
    const results = allUsers.filter((u) => {
      const first = u.firstName?.toLowerCase() || '';
      const last = u.lastName?.toLowerCase() || '';
      const displayName = u.displayName?.toLowerCase() || '';
      const name = u.name?.toLowerCase() || '';
      const email = u.email?.toLowerCase() || '';

      return (
        first.includes(term) || 
        last.includes(term) || 
        displayName.includes(term) || 
        name.includes(term) || 
        email.includes(term)
      );
    });
    setFilteredUsers(results);
  }, [searchQuery, allUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuDropdown(false);
      }
      if (messengerRef.current && !messengerRef.current.contains(event.target as Node)) {
        setShowMessengerDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFirstAndLastName = (name: string) => {
    if (!name) return 'User';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return parts[0];
  };

  const firstNameLastName = getFirstAndLastName(userDisplayName);

  const goToSearchResults = () => {
    const term = searchQuery.trim();
    if (!term) return;
    setIsSearchFocused(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goToSearchResults();
    }
  };

  const tabs = [
    { id: 'home', icon: home, activeIcon: homeactive },
    { id: 'friends', icon: friends, activeIcon: friendsActive },
    { id: 'watch', icon: reels, activeIcon: reelsActive },
    { id: 'marketplace', icon: groups, activeIcon: groupsActive },
  ];

  const handleOpenChat = (friend: any) => {
    if (!activeChats.some((c) => c.uid === friend.uid)) {
      setActiveChats([...activeChats, friend]);
    }
  };

  useEffect(() => {
    if (openChatRequest?.friend) {
      handleOpenChat(openChatRequest.friend);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChatRequest]);

  useEffect(() => {
    const fetchMessengerFriends = async () => {
      const activeUid = currentUserId || auth.currentUser?.uid;
      if (!activeUid) return;

      try {
        const q1 = query(collection(db, 'friendRequests'), where('senderId', '==', activeUid), where('status', '==', 'accepted'));
        const q2 = query(collection(db, 'friendRequests'), where('receiverId', '==', activeUid), where('status', '==', 'accepted'));

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const friendIds = new Set<string>();
        snap1.docs.forEach((d) => friendIds.add(d.data().receiverId));
        snap2.docs.forEach((d) => friendIds.add(d.data().senderId));

        const friendList = await Promise.all(
          Array.from(friendIds).map(async (fId) => {
            const userDoc = await getDoc(doc(db, 'users', fId));
            return { uid: fId, ...(userDoc.exists() ? userDoc.data() : { firstName: 'User', lastName: '' }) };
          })
        );

        setMessengerFriends(friendList);
      } catch (err) {
        console.error('Error fetching messenger friends:', err);
      }
    };

    if (showMessengerDropdown) {
      fetchMessengerFriends();
    }
  }, [showMessengerDropdown, currentUserId]);

  const renderTabButton = (tab: { id: string; icon: string; activeIcon: string }) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => {
          setActiveTab(tab.id);
          if (tab.id === 'home') navigate('/home');
          if (tab.id === 'friends') navigate('/friends');
          if (tab.id === 'watch') navigate('/reels');
          if (tab.id === 'marketplace') navigate('/groups');
        }}
        className={`relative flex h-full w-16 lg:w-24 flex-col items-center justify-center rounded-lg transition hover:bg-[#f2f2f2] cursor-pointer ${
          isActive ? 'text-[#1877f2]' : 'text-[#65676b]'
        }`}
      >
        <img src={isActive ? tab.activeIcon : tab.icon} alt="Tab Icon" className="w-7 h-7 object-contain" />
        {isActive && <div className="absolute bottom-0 h-1 w-full bg-[#1877f2] rounded-t-md" />}
      </button>
    );
  };

  return (
    <>
    <header className="sticky top-0 z-50 flex h-14 items-center bg-white shadow-sm px-2 sm:px-4 gap-1">
      {/* Left: Logo & Search Bar */}
      <div className="flex items-center gap-1 sm:gap-2 relative shrink-0">
        <img src={Fblogo} alt="Facebook Logo" className="w-[42px] h-[42px] sm:w-[90px] sm:h-[50px] object-contain shrink-0" />

        <div ref={searchRef} className="relative">
          {/* Icon-only search trigger on small screens */}
          <button
            onClick={() => setIsSearchFocused(true)}
            className="sm:hidden flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f2f5] text-[#65676b] cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>

          <div className="hidden sm:flex items-center rounded-full bg-[#f0f2f5] px-3 py-2 text-[#65676b] w-[140px] md:w-[190px] lg:w-[240px]">
            <span className="material-symbols-outlined text-[20px] mr-2">search</span>
            <input
              type="text"
              placeholder="Search Facebook"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              className="bg-transparent text-[15px] outline-none placeholder-[#65676b] text-[#1c1e21] w-full"
            />
          </div>

          {/* Search Popup Dropdown covering both Logo and Search */}
          {isSearchFocused && (
            <div className="fixed inset-x-0 top-14 sm:absolute sm:inset-x-auto sm:top-auto sm:-top-2 sm:-left-[106px] w-full sm:w-[340px] bg-white rounded-none sm:rounded-lg shadow-xl border-t sm:border border-gray-100 pt-3 pb-4 z-50 max-h-[calc(100vh-3.5rem)] sm:max-h-96 overflow-y-auto">
              <div className="flex items-center px-3 mb-2 gap-2">
                <button
                  onClick={() => setIsSearchFocused(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#65676b] cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div className="flex items-center rounded-full bg-[#f0f2f5] px-3 py-2 text-[#65676b] flex-1">
                  <span className="material-symbols-outlined text-[20px] mr-2">search</span>
                  <input
                    type="text"
                    placeholder="Search Facebook"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    autoFocus
                    className="bg-transparent text-[15px] outline-none placeholder-[#65676b] text-[#1c1e21] w-full"
                  />
                </div>
              </div>

              {/* Dynamic User Search Results */}
              <div className="mt-2">
                {searchQuery.trim() === '' ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">No recent searches</div>
                ) : filteredUsers.length > 0 ? (
                  <>
                    {filteredUsers.map((user) => (
                      <SearchResultRow
                        key={user.uid || user.id}
                        user={user}
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchFocused(false);
                          onSelectUser(user.uid || user.id || '');
                        }}
                      />
                    ))}
                    <button
                      onClick={goToSearchResults}
                      className="w-full text-left px-4 py-2.5 text-[#1877f2] font-semibold text-sm hover:bg-gray-100 transition cursor-pointer"
                    >
                      See all results for "{searchQuery.trim()}"
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">No results for "{searchQuery}"</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Home / Friends / Reels / Groups — merged into the top bar on larger screens.
          On mobile this stays hidden and the current design (separate row below) is kept as-is. */}
      <div className="hidden sm:flex flex-1 items-center justify-center h-full min-w-0">
        {tabs.map((tab) => renderTabButton(tab))}
      </div>

      {/* Right: Menu, Messenger, Notifications, Profile Dropdown */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Menu Dropdown Container */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              setShowMenuDropdown(!showMenuDropdown);
              setShowDropdown(false);
              setShowMessengerDropdown(false);
              setShowNotificationDropdown(false);
              setIsSearchFocused(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4e6eb] hover:bg-[#d8dadf] transition cursor-pointer overflow-hidden p-2"
          >
            <img src={menu} alt="Menu" className="w-full h-full object-contain" />
          </button>

          {/* Menu Popup Modal */}
          {showMenuDropdown && (
            <div className="fixed inset-x-2 sm:inset-x-auto sm:right-4 sm:left-auto top-[104px] sm:top-16 w-auto sm:w-[600px] max-w-full sm:max-w-[92vw] max-h-[80vh] sm:h-[580px] overflow-y-auto rounded-xl bg-white p-4 shadow-2xl border border-gray-200 z-50 text-[#050505] flex flex-col sm:flex-row gap-4">
              {/* Left Column (Menu contents) */}
              <div className="flex-1 pr-0 sm:pr-2">
                <h1 className="text-2xl font-bold mb-3 text-[#1c1e21]">Menu</h1>

                {/* Search Menu Input */}
                <div className="flex items-center rounded-full bg-[#f0f2f5] px-3 py-2 text-[#65676b] mb-4">
                  <span className="material-symbols-outlined text-[18px] mr-2">search</span>
                  <input
                    type="text"
                    placeholder="Search menu"
                    className="bg-transparent text-[14px] outline-none placeholder-[#65676b] text-[#1c1e21] w-full"
                  />
                </div>

                {/* Social Section */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-[#1c1e21] mb-2">Social</h3>
                  <div className="space-y-1">
                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Events are not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={events} alt="Events" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Events</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">
                          Organize or find events and other things to do online and nearby.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => setActiveTab('friends'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Friendsright} alt="Friends" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Friends</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Search for friends or people you may know.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => setActiveTab('groups'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Groupsright} alt="Groups" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Groups</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Connect with people who share your interests.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => setActiveTab('home'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={NewsFeed} alt="News Feed" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">News Feed</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">See relevant posts from people and Pages you follow.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => setActiveTab('home'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Feed} alt="Feeds" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Feeds</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">
                          See the most recent posts from your friends, groups, Pages and more.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Pages are not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Pages} alt="Pages" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Pages</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Discover and connect with businesses on Facebook.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="my-3 border-gray-200" />

                {/* Entertainment Section */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-[#1c1e21] mb-2">Entertainment</h3>
                  <div className="space-y-1">
                    <div
                      onClick={() => handleMenuItem(() => setActiveTab('reels'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Reelsright} alt="Reels" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Reels</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">
                          A Reels destination personalized to your interests and connections.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Gaming Video is not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={GamingVideo} alt="Gaming Video" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Gaming Video</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Watch and connect with your favorite games and streamers.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Play games is not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={PlayGames} alt="Play games" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Play games</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Play your favorite games.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="my-3 border-gray-200" />

                {/* Shopping Section */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-[#1c1e21] mb-2">Shopping</h3>
                  <div className="space-y-1">
                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Orders and payments is not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={OrdersandPayments} alt="Orders and payments" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Orders and payments</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">A seamless, secure way to pay on the apps you already use.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Marketplace is not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Marketplace} alt="Marketplace" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Marketplace</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Buy and sell in your community.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="my-3 border-gray-200" />

                {/* Personal Section */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-[#1c1e21] mb-2">Personal</h3>
                  <div className="space-y-1">
                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Recent ad activity is not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={YourAdActivity} alt="Recent ad activity" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Recent ad activity</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">See all the ads you interacted with on Facebook.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => onProfileClick())}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Memories} alt="Memories" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Memories</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Browse your old photos, videos and posts on Facebook.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setShowMenuDropdown(false);
                        navigate('/saved');
                      }}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Saved} alt="Saved" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Saved</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Find posts, photos and videos that you saved for later.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="my-3 border-gray-200" />

                {/* Professional Section */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-[#1c1e21] mb-2">Professional</h3>
                  <div className="space-y-1">
                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Ads Manager is not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={AdsManager} alt="Ads Manager" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Ads Manager</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Create, manage and track the performance of your ads.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="my-3 border-gray-200" />

                {/* More from Meta Section */}
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-[#1c1e21] mb-2">More from Meta</h3>
                  <div className="space-y-1">
                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Meta AI is not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={MetaAI} alt="Meta AI" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Meta AI</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">
                          Ask questions, brainstorm ideas, create any image you can imagine and more.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('WhatsApp is not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Whatsapp} alt="WhatsApp" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">WhatsApp</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">Message and call people privately on your computer.</p>
                      </div>
                    </div>

                    <div
                      onClick={() => handleMenuItem(() => showMenuToast('Instagram is not available in this demo yet.'))}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    >
                      <img src={Instagram} alt="Instagram" className="w-9 h-9 object-contain shrink-0" />
                      <div>
                        <p className="font-semibold text-sm leading-tight text-[#1c1e21]">Instagram</p>
                        <p className="text-xs text-gray-500 leading-tight mt-0.5">See everyday moments from people you love.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (Create Section) */}
              <div className="w-full sm:w-[210px] bg-[#f7f8fa] p-3 rounded-xl border border-gray-100 shrink-0">
                <h3 className="font-bold text-lg text-[#1c1e21] mb-3">Create</h3>
                <div className="space-y-2">
                  <div
                    onClick={() => handleMenuItem(() => onOpenCreatePost && onOpenCreatePost())}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  >
                    <img src={CreatePost} alt="Post" className="w-8 h-8 object-contain shrink-0" />
                    <span className="font-semibold text-sm">Post</span>
                  </div>

                  <div
                    onClick={() =>
                      handleMenuItem(() => {
                        navigate('/home');
                        showMenuToast('Tap the + at the top of your feed to add a story.');
                      })
                    }
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  >
                    <img src={CreateStory} alt="Story" className="w-8 h-8 object-contain shrink-0" />
                    <span className="font-semibold text-sm">Story</span>
                  </div>

                  <div
                    onClick={() => handleMenuItem(() => navigate('/reels'))}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  >
                    <img src={CreateReel} alt="Reel" className="w-8 h-8 object-contain shrink-0" />
                    <span className="font-semibold text-sm">Reel</span>
                  </div>

                  <div
                    onClick={() => handleMenuItem(() => showMenuToast('Creating a Page is not available in this demo yet.'))}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  >
                    <img src={CreatePage} alt="Page" className="w-8 h-8 object-contain shrink-0" />
                    <span className="font-semibold text-sm">Page</span>
                  </div>

                  <div
                    onClick={() => handleMenuItem(() => showMenuToast('Creating an Ad is not available in this demo yet.'))}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  >
                    <img src={CreateAd} alt="Ad" className="w-8 h-8 object-contain shrink-0" />
                    <span className="font-semibold text-sm">Ad</span>
                  </div>

                  <div
                    onClick={() => handleMenuItem(() => navigate('/groups'))}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  >
                    <img src={CreateGroup} alt="Group" className="w-8 h-8 object-contain shrink-0" />
                    <span className="font-semibold text-sm">Group</span>
                  </div>

                  <div
                    onClick={() => handleMenuItem(() => showMenuToast('Creating an Event is not available in this demo yet.'))}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  >
                    <img src={CreateEvent} alt="Event" className="w-8 h-8 object-contain shrink-0" />
                    <span className="font-semibold text-sm">Event</span>
                  </div>

                  <div
                    onClick={() => handleMenuItem(() => showMenuToast('Notes are not available in this demo yet.'))}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  >
                    <img src={CreateNote} alt="Note" className="w-8 h-8 object-contain shrink-0" />
                    <span className="font-semibold text-sm">Note</span>
                  </div>

                  <div
                    onClick={() => handleMenuItem(() => showMenuToast('Life events are not available in this demo yet.'))}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  >
                    <img src={CreateLifeEvent} alt="Life event" className="w-8 h-8 object-contain shrink-0" />
                    <span className="font-semibold text-sm">Life event</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messenger Dropdown Container */}
        <div className="relative" ref={messengerRef}>
          <button
            onClick={() => {
              setShowMessengerDropdown(!showMessengerDropdown);
              setShowMenuDropdown(false);
              setShowDropdown(false);
              setShowNotificationDropdown(false);
              setIsSearchFocused(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4e6eb] hover:bg-[#d8dadf] transition cursor-pointer overflow-hidden p-2"
          >
            <img src={messenger} alt="Messenger" className="w-full h-full object-contain" />
          </button>

          {/* Messenger Popup Modal */}
          {showMessengerDropdown && (
            <div className="fixed inset-x-2 sm:inset-x-auto sm:right-4 sm:left-auto top-[104px] sm:top-16 w-auto sm:w-[360px] max-h-[80vh] sm:h-[540px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden text-[#050505]">
              {/* Header */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#1c1e21]">Chats</h2>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#050505] transition cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                  </button>
                  <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#050505] transition cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">open_in_full</span>
                  </button>
                  <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#050505] transition cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">edit_square</span>
                  </button>
                </div>
              </div>

              {/* Search Messenger */}
              <div className="px-3 mb-2">
                <div className="flex items-center rounded-full bg-[#f0f2f5] px-3 py-1.5 text-[#65676b]">
                  <span className="material-symbols-outlined text-[18px] mr-2">search</span>
                  <input
                    type="text"
                    placeholder="Search Messenger"
                    className="bg-transparent text-[14px] outline-none placeholder-[#65676b] text-[#1c1e21] w-full"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto border-b border-gray-100">
                <button className="px-3 py-1 bg-[#e7f3ff] text-[#1877f2] font-semibold text-xs rounded-full whitespace-nowrap cursor-pointer">
                  All
                </button>
                <button className="px-3 py-1 bg-[#f0f2f5] hover:bg-gray-200 text-[#050505] font-semibold text-xs rounded-full whitespace-nowrap transition cursor-pointer">
                  Unread
                </button>
                <button className="px-3 py-1 bg-[#f0f2f5] hover:bg-gray-200 text-[#050505] font-semibold text-xs rounded-full whitespace-nowrap transition cursor-pointer">
                  Groups
                </button>
              </div>

              {/* Dynamic Friends Chat List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50 p-2">
                {messengerFriends.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">No friends available to message yet.</div>
                ) : (
                  messengerFriends.map((friend) => (
                    <MessengerFriendRow
                      key={friend.uid}
                      friend={friend}
                      onClick={() => {
                        handleOpenChat(friend);
                        setShowMessengerDropdown(false);
                      }}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-100 text-center bg-white">
                <button className="text-[#1877f2] font-semibold text-sm hover:underline cursor-pointer">See all in Messenger</button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Chat Windows Container (Bottom Right Corner) */}
        <div className="fixed bottom-0 right-4 flex items-end gap-3 z-50 pointer-events-none">
          {activeChats.map((chatFriend) => (
            <div key={chatFriend.uid} className="pointer-events-auto">
              <FloatingChatBox
                friend={chatFriend}
                onClose={() => setActiveChats(activeChats.filter((c) => c.uid !== chatFriend.uid))}
              />
            </div>
          ))}
        </div>

        {/* Notifications Dropdown Container */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              const opening = !showNotificationDropdown;
              setShowNotificationDropdown(opening);
              setShowMessengerDropdown(false);
              setShowMenuDropdown(false);
              setShowDropdown(false);
              setIsSearchFocused(false);
              if (opening && unreadCount > 0) markAllNotificationsRead(notifications);
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#e4e6eb] hover:bg-[#d8dadf] transition cursor-pointer overflow-hidden p-2"
          >
            <img src={notification} alt="Notifications" className="w-full h-full object-contain" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-[#e41e3f] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popup Modal */}
          {showNotificationDropdown && (
            <div className="fixed inset-x-2 sm:inset-x-auto sm:right-4 sm:left-auto top-[104px] sm:top-16 w-auto sm:w-[360px] max-h-[80vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-4 text-[#050505]">
              {/* Header & Options */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-[#1c1e21]">Notifications</h2>
                <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#050505] transition cursor-pointer">
                  <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                </button>
              </div>

              {/* Notification Items List */}
              <div className="space-y-1 max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div
                    onClick={() => {
                      setActiveTab('friends');
                      setShowNotificationDropdown(false);
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer relative"
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#1877f2] flex items-center justify-center text-white font-bold text-xl">
                        f
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#303030] border-2 border-white flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[12px]">notifications</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs text-[#1c1e21] leading-snug">
                        No notifications yet. Like, comment, or tag friends to see activity here.
                      </p>
                    </div>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        setShowNotificationDropdown(false);
                        if (notif.type === 'friend_request') {
                          setActiveTab('friends');
                        } else if (notif.postId) {
                          navigate('/home');
                        } else {
                          navigate(`/profile/${notif.actorId}`);
                        }
                      }}
                      className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer relative ${
                        !notif.read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full bg-[#1877f2] text-white font-bold text-xl overflow-hidden flex items-center justify-center">
                          {notif.actorAvatar ? (
                            <img src={notif.actorAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            notif.actorName?.[0]?.toUpperCase() || '👤'
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1877f2] border-2 border-white flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-[12px]">{notificationIcon(notif.type)}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-xs text-[#1c1e21] leading-snug">{notif.text}</p>
                        <p className="text-[11px] text-[#1877f2] font-semibold mt-0.5">{timeAgo(notif.createdAt)}</p>
                      </div>
                      {!notif.read && <div className="w-3 h-3 rounded-full bg-[#1877f2] shrink-0"></div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => {
              setShowDropdown(!showDropdown);
              setShowMenuDropdown(false);
              setShowMessengerDropdown(false);
              setShowNotificationDropdown(false);
              setIsSearchFocused(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden border border-gray-200 cursor-pointer transition hover:opacity-90"
          >
            <img src={liveOwnAvatar} alt="Profile" className="w-full h-full object-cover" />
          </button>
          {/* Small dropdown-indicator badge — a sibling of the (clipped,
              circular) avatar button so it never gets cropped by the
              avatar's own rounded mask. Decorative only: clicks pass
              through to the button underneath. */}
          <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-[18px] sm:h-[18px] bg-[#e4e6eb] border-2 border-white rounded-full flex items-center justify-center pointer-events-none">
            <span
              className={`material-symbols-outlined text-[10px] sm:text-[11px] leading-none text-[#050505] font-bold transition-transform duration-200 ${
                showDropdown ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </div>

          {/* Facebook Style Profile Dropdown Menu */}
          {showDropdown && (
            <div className="fixed inset-x-2 sm:inset-x-auto sm:right-4 sm:left-auto top-[104px] sm:top-16 w-auto sm:w-[360px] max-h-[80vh] overflow-y-auto rounded-xl bg-white p-3 shadow-2xl border border-gray-200 z-50 text-[#050505]">
              {/* Profile Card Header (Clickable to open profile) */}
              <div
                onClick={() => {
                  onProfileClick();
                  setShowDropdown(false);
                }}
                className="bg-white rounded-xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.12)] mb-2 border border-gray-100 hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <img src={liveOwnAvatar} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                  <span className="font-semibold text-base text-[#1c1e21]">{firstNameLastName}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProfileClick();
                    setShowDropdown(false);
                  }}
                  className="w-full mt-3 py-2 rounded-md bg-[#e7f3ff] text-[#1877f2] font-semibold text-sm hover:bg-[#dbe7f2] transition cursor-pointer"
                >
                  See your profile
                </button>
              </div>

              {/* Menu Items */}
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e4e6eb]">
                    <span className="material-symbols-outlined text-[20px] text-[#050505]">logout</span>
                  </span>
                  <span className="font-semibold text-sm text-[#1c1e21]">Log Out</span>
                </button>
              </div>

              {/* Footer Links */}
              <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-500 px-1 leading-relaxed">
                Privacy · Terms · Advertising · Ad Choices · Cookies · More
              </div>
            </div>
          )}
        </div>

        {/* Toast confirmation for Menu items that aren't wired to a real page yet */}
        {menuToast && (
          <div className="fixed left-1/2 -translate-x-1/2 top-[72px] sm:top-16 bg-[#1c1e21] text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-full shadow-lg z-[60] whitespace-nowrap">
            {menuToast}
          </div>
        )}
      </div>
    </header>

    {/* Section Tabs (Home / Friends / Watch / Marketplace) — mobile-only bar, stacked directly under
        the top Facebook bar. On sm and up these tabs live inside the top bar instead (see above),
        so this row is hidden there and the current mobile design stays exactly as it was. */}
    <div className="sm:hidden sticky top-14 inset-x-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-around h-12 max-w-3xl mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'home') navigate('/home');
                if (tab.id === 'friends') navigate('/friends');
                if (tab.id === 'watch') navigate('/reels');
                if (tab.id === 'marketplace') navigate('/groups');
              }}
              className={`relative flex h-full flex-1 flex-col items-center justify-center rounded-lg transition hover:bg-[#f2f2f2] cursor-pointer ${
                isActive ? 'text-[#1877f2]' : 'text-[#65676b]'
              }`}
            >
              <img src={isActive ? tab.activeIcon : tab.icon} alt="Tab Icon" className="w-6 h-6 object-contain" />
              {isActive && <div className="absolute bottom-0 h-0.5 w-8 bg-[#1877f2] rounded-t-md" />}
            </button>
          );
        })}
      </div>
    </div>
    </>
  );
};

const MessengerFriendRow: React.FC<{ friend: any; onClick: () => void }> = ({ friend, onClick }) => {
  const avatar = useUserAvatar(friend.uid, friend.profileImage);
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 rounded-lg transition cursor-pointer relative"
    >
      <div className="w-12 h-12 rounded-full bg-blue-500 text-white shrink-0 flex items-center justify-center font-bold text-lg overflow-hidden">
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          friend.firstName?.[0]?.toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#1c1e21] truncate">
          {friend.firstName} {friend.lastName}
        </p>
        <p className="text-xs text-gray-500 truncate">Click to open chat</p>
      </div>
    </div>
  );
};

const SearchResultRow: React.FC<{ user: any; onClick: () => void }> = ({ user, onClick }) => {
  const avatar = useUserAvatar(user.uid || user.id, user.profileImage);
  return (
    <div
      className="flex items-center px-4 py-2.5 hover:bg-gray-100 cursor-pointer transition"
      onClick={onClick}
    >
      <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3 shrink-0 overflow-hidden">
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          user.firstName?.[0]?.toUpperCase() || 'U'
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-[#1c1e21] truncate">
          {user.name || `${user.firstName || ''} ${user.lastName || ''}`}
        </p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      </div>
    </div>
  );
};

export default Navbar;
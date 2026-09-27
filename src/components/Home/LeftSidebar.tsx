

import React from 'react';
import { useNavigate } from 'react-router-dom';

import Friendsright from '../../assets/Icons/Friendsright.png';
import Saved from '../../assets/Icons/Saved.png';
import Marketplace from '../../assets/Icons/Marketplace.png';
import Memories from '../../assets/Icons/Memories.png';
import Reelsright from '../../assets/Icons/Reelsright.png';
import Groupsright from '../../assets/Icons/Groupsright.png';

interface LeftSidebarProps {
  userDisplayName: string;
  userAvatar?: string;
  onProfileClick: () => void;
}

const SidebarIcon: React.FC<{ src: string; alt: string }> = ({
  src,
  alt,
}) => (
  <div className="w-9 h-9 flex items-center justify-center shrink-0">
    <img
      src={src}
      alt={alt}
      className="w-9 h-9 object-contain"
    />
  </div>
);

const ChevronDown = () => (
  <div className="w-9 h-9 rounded-full bg-[#e4e6eb] flex items-center justify-center shrink-0">
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path
        d="M6 9l6 6 6-6"
        stroke="#050505"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  userDisplayName,
  userAvatar,
  onProfileClick,
}) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = React.useState(false);

  const items = [
    {
      icon: <SidebarIcon src={Friendsright} alt="Friends" />,
      label: 'Friends',
      onClick: () => navigate('/friends'),
    },
    {
      icon: <SidebarIcon src={Memories} alt="Memories" />,
      label: 'Memories',
      onClick: () => {},
    },
    {
      icon: <SidebarIcon src={Saved} alt="Saved" />,
      label: 'Saved',
      onClick: () => navigate('/saved'),
    },
    {
      icon: <SidebarIcon src={Groupsright} alt="Groups" />,
      label: 'Groups',
      onClick: () => navigate('/groups'),
    },
    {
      icon: <SidebarIcon src={Marketplace} alt="Marketplace" />,
      label: 'Marketplace',
      onClick: () => {},
    },
  ];

  const extraItems = [
    {
      icon: <SidebarIcon src={Reelsright} alt="Reels" />,
      label: 'Reels',
      onClick: () => navigate('/reels'),
    },
  ];

  const initials = userDisplayName
    ? userDisplayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'FB';

  return (
    <aside className="hidden lg:block fixed left-0 top-[56px] w-[300px] h-[calc(100vh-56px)] overflow-y-auto pt-2 pb-6 pl-3 pr-2 scrollbar-thin z-10">

      {/* Current user */}
      <div
        onClick={onProfileClick}
        className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#e4e6eb] cursor-pointer transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <span className="font-semibold text-[15px] text-[#050505] truncate">
          {userDisplayName}
        </span>
      </div>

      {/* Nav items */}
      <nav className="mt-0.5">
        {items.map((item) => (
          <div
            key={item.label}
            onClick={item.onClick}
            className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#e4e6eb] cursor-pointer transition-colors"
          >
            {item.icon}

            <span className="text-[15px] text-[#050505]">
              {item.label}
            </span>
          </div>
        ))}

        {expanded &&
          extraItems.map((item) => (
            <div
              key={item.label}
              onClick={item.onClick}
              className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#e4e6eb] cursor-pointer transition-colors"
            >
              {item.icon}

              <span className="text-[15px] text-[#050505]">
                {item.label}
              </span>
            </div>
          ))}

        {/* See more / See less */}
        <div
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#e4e6eb] cursor-pointer transition-colors"
        >
          <ChevronDown />

          <span className="text-[15px] font-semibold text-[#050505]">
            {expanded ? 'See less' : 'See more'}
          </span>
        </div>
      </nav>
    </aside>
  );
};

export default LeftSidebar;

import React, { useRef, useState } from 'react';
import { uploadImageToCloudinary } from './cloudinaryService';
import { createStory } from './storiesService';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserAvatar: string | null;
  userDisplayName: string;
  onStoryCreated?: () => void;
}

const BACKGROUND_COLORS = [
  '#1877f2', '#e4405f', '#f77737', '#22c55e',
  '#7c3aed', '#0ea5e9', '#111827', '#db2777',
];

type Mode = 'choose' | 'photo' | 'text';

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserAvatar,
  userDisplayName,
  onStoryCreated,
}) => {
  const [mode, setMode] = useState<Mode>('choose');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BACKGROUND_COLORS[0]);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setMode('choose');
    setFile(null);
    setPreviewUrl(null);
    setCaption('');
    setText('');
    setBgColor(BACKGROUND_COLORS[0]);
    setIsPosting(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setMode('photo');
  };

  const handlePostPhoto = async () => {
    if (!file) return;
    setIsPosting(true);
    setError(null);
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      await createStory(currentUserId, { image: imageUrl, title: caption });
      onStoryCreated?.();
      handleClose();
    } catch (err) {
      console.error('Failed to post story:', err);
      setError('Something went wrong while posting your story. Please try again.');
      setIsPosting(false);
    }
  };

  const handlePostText = async () => {
    if (!text.trim()) return;
    setIsPosting(true);
    setError(null);
    try {
      await createStory(currentUserId, { text: text.trim(), backgroundColor: bgColor });
      onStoryCreated?.();
      handleClose();
    } catch (err) {
      console.error('Failed to post story:', err);
      setError('Something went wrong while posting your story. Please try again.');
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <button
            onClick={handleClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 text-[#65676b] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <h2 className="font-bold text-lg text-[#1c1e21]">Create story</h2>
          <div className="w-9" />
        </div>

        {/* Choose type */}
        {mode === 'choose' && (
          <div className="p-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-gray-200 hover:bg-gray-50 transition p-4 flex flex-col items-center justify-center gap-2 cursor-pointer h-48"
            >
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-green-600">add_photo_alternate</span>
              </div>
              <span className="font-semibold text-sm text-[#1c1e21]">Photo story</span>
              <span className="text-xs text-gray-500 text-center">Share a photo from your device</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              onClick={() => setMode('text')}
              className="rounded-xl border border-gray-200 hover:bg-gray-50 transition p-4 flex flex-col items-center justify-center gap-2 cursor-pointer h-48"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-blue-600">text_fields</span>
              </div>
              <span className="font-semibold text-sm text-[#1c1e21]">Text story</span>
              <span className="text-xs text-gray-500 text-center">Share an update as text</span>
            </button>
          </div>
        )}

        {/* Photo preview + caption */}
        {mode === 'photo' && previewUrl && (
          <div className="flex flex-col overflow-y-auto">
            <div className="relative w-full bg-black" style={{ aspectRatio: '9 / 14' }}>
              <img src={previewUrl} alt="Story preview" className="w-full h-full object-contain" />
              <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/40 rounded-full pl-1 pr-3 py-1">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-300 shrink-0">
                  {currentUserAvatar && <img src={currentUserAvatar} className="w-full h-full object-cover" alt="" />}
                </div>
                <span className="text-white text-xs font-semibold truncate max-w-[140px]">{userDisplayName}</span>
              </div>
            </div>
            <div className="p-3">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption (optional)"
                className="w-full bg-[#f0f2f5] rounded-full px-4 py-2 text-sm outline-none placeholder-gray-500"
              />
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setMode('choose');
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="flex-1 py-2 rounded-md bg-[#e4e6eb] text-[#050505] font-semibold text-sm hover:bg-[#d8dadf] transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handlePostPhoto}
                  disabled={isPosting}
                  className="flex-1 py-2 rounded-md bg-[#1877f2] text-white font-semibold text-sm hover:bg-[#166fe0] transition cursor-pointer disabled:opacity-60"
                >
                  {isPosting ? 'Posting…' : 'Share to story'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Text story composer */}
        {mode === 'text' && (
          <div className="flex flex-col">
            <div
              className="relative w-full flex items-center justify-center px-6"
              style={{ aspectRatio: '9 / 14', backgroundColor: bgColor }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start typing…"
                rows={5}
                maxLength={200}
                className="w-full bg-transparent text-white text-2xl font-bold text-center outline-none placeholder-white/70 resize-none"
                autoFocus
              />
            </div>
            <div className="p-3">
              <div className="flex items-center justify-center gap-2 mb-3">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBgColor(color)}
                    aria-label={`Choose background ${color}`}
                    className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                      bgColor === color ? 'border-[#1877f2] scale-110' : 'border-white shadow'
                    } transition-transform`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {error && <p className="text-xs text-red-500 mb-2 text-center">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('choose')}
                  className="flex-1 py-2 rounded-md bg-[#e4e6eb] text-[#050505] font-semibold text-sm hover:bg-[#d8dadf] transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handlePostText}
                  disabled={isPosting || !text.trim()}
                  className="flex-1 py-2 rounded-md bg-[#1877f2] text-white font-semibold text-sm hover:bg-[#166fe0] transition cursor-pointer disabled:opacity-60"
                >
                  {isPosting ? 'Posting…' : 'Share to story'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateStoryModal;

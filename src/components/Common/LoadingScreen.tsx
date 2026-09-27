
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import fbLogo from '../../assets/Icons/Facebook-Logosu.png';
import MetaLogo from '../../assets/Icons/Meta-Logo.png';

interface LoadingScreenProps {
  /** True once the real content behind the loading screen is ready to show. */
  ready: boolean;
  /** Called once it's safe to unmount the loading screen (ready AND the minimum display time has passed). */
  onFinished: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  ready,
  onFinished,
}) => {
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanDismiss(true);
    }, 1600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && canDismiss) {
      onFinished();
    }
  }, [ready, canDismiss, onFinished]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white to-[#f0f2f5] z-[9999] overflow-hidden pointer-events-auto"
    >
      {/* Soft blue background glow */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.06, 0.16, 0.06],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-[600px] h-[600px] rounded-full bg-[#1877f2] blur-3xl pointer-events-none"
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center relative z-10"
      >
        {/* Facebook Logo */}
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            filter: [
              'drop-shadow(0 0 0px rgba(24,119,242,0))',
              'drop-shadow(0 0 14px rgba(24,119,242,0.25))',
              'drop-shadow(0 0 0px rgba(24,119,242,0))',
            ],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5,
            ease: 'easeInOut',
          }}
          className="flex items-center justify-center mb-5"
        >
          <img
            src={fbLogo}
            alt="Facebook Logo"
            className="w-24 h-24 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </motion.div>

        {/* Progress bar */}
        <div className="w-48 h-1.5 rounded-full bg-[#e4e6eb] overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-1/2 h-full rounded-full bg-[#1877f2]"
          />
        </div>
      </motion.div>

      {/* Bottom section */}
      <div className="absolute bottom-12 flex flex-col items-center gap-4 z-10">
        {/* Animated dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.35, 1],
                opacity: [0.35, 1, 0.35],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.25,
                ease: 'easeInOut',
              }}
              className="w-2 h-2 rounded-full bg-[#1877f2]"
            />
          ))}
        </div>

        {/* Meta logo */}
        <motion.img
          src={MetaLogo}
          alt="Meta"
          animate={{ opacity: [0.55, 0.8, 0.55] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="h-8 w-auto object-contain"
        />
      </div>
    </motion.div>
  );
};

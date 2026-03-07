import { motion } from 'framer-motion';
import type { FalkoMood } from './challengeEngine';

import falkoHappy from '@/assets/falko-happy.png';
import falkoMotivated from '@/assets/falko-motivated.png';
import falkoNeutral from '@/assets/falko-neutral.png';
import falkoSad from '@/assets/falko-sad.png';

const MOOD_IMAGES: Record<FalkoMood, string> = {
  happy: falkoHappy,
  motivated: falkoMotivated,
  neutral: falkoNeutral,
  sad: falkoSad,
};

interface Props {
  mood: FalkoMood;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'w-7 h-7',
  md: 'w-14 h-14',
  lg: 'w-24 h-24',
};

export function FalkoAvatar({ mood, size = 'sm', className = '' }: Props) {
  return (
    <motion.img
      key={mood}
      src={MOOD_IMAGES[mood]}
      alt={`Falko - ${mood}`}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`${SIZES[size]} object-contain shrink-0 ${className}`}
      draggable={false}
    />
  );
}

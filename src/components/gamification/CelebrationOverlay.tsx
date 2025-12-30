import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, Trophy, Star, Sparkles } from 'lucide-react';

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotation: number;
  size: number;
  type: 'rect' | 'circle' | 'star';
}

interface CelebrationOverlayProps {
  type: 'xp' | 'levelUp' | 'streak' | 'achievement' | 'taskComplete';
  amount?: number;
  message?: string;
  onComplete?: () => void;
}

const colors = {
  xp: ['#a855f7', '#d946ef', '#ec4899', '#f472b6', '#c084fc'],
  levelUp: ['#fbbf24', '#f59e0b', '#eab308', '#facc15', '#fcd34d', '#ef4444', '#22c55e'],
  streak: ['#f97316', '#ef4444', '#fb923c', '#fbbf24', '#dc2626'],
  achievement: ['#22c55e', '#10b981', '#34d399', '#6ee7b7', '#fbbf24'],
  taskComplete: ['#22c55e', '#10b981', '#34d399', '#3b82f6', '#60a5fa'],
};

export function CelebrationOverlay({ type, amount, message, onComplete }: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(true);

  // Generate confetti pieces
  const confetti = useMemo(() => {
    const pieces: ConfettiPiece[] = [];
    const count = type === 'levelUp' ? 60 : 40;
    const colorSet = colors[type];
    
    for (let i = 0; i < count; i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: colorSet[Math.floor(Math.random() * colorSet.length)],
        rotation: Math.random() * 360,
        size: Math.random() * 10 + 6,
        type: ['rect', 'circle', 'star'][Math.floor(Math.random() * 3)] as 'rect' | 'circle' | 'star',
      });
    }
    return pieces;
  }, [type]);

  useEffect(() => {
    const duration = type === 'levelUp' ? 3500 : type === 'taskComplete' ? 1800 : 2500;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onComplete?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [type, onComplete]);

  const Icon = {
    xp: Zap,
    levelUp: Star,
    streak: Flame,
    achievement: Trophy,
    taskComplete: Trophy,
  }[type];

  const title = {
    xp: `+${amount} XP`,
    levelUp: `Level ${amount}!`,
    streak: `${amount} Tage Streak!`,
    achievement: 'Achievement!',
    taskComplete: 'Erledigt!',
  }[type];

  const bgGlow = {
    xp: 'from-purple-500/30',
    levelUp: 'from-yellow-500/40',
    streak: 'from-orange-500/30',
    achievement: 'from-green-500/30',
    taskComplete: 'from-green-500/30',
  }[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
        >
          {/* Background glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 bg-gradient-radial ${bgGlow} to-transparent`}
          />

          {/* Confetti from top */}
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                x: `${piece.x}vw`,
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: piece.rotation + 720,
                opacity: [1, 1, 1, 0],
              }}
              transition={{
                duration: type === 'levelUp' ? 3 : 2.2,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="absolute"
              style={{
                width: piece.size,
                height: piece.type === 'circle' ? piece.size : piece.size * 0.6,
                backgroundColor: piece.type !== 'star' ? piece.color : 'transparent',
                borderRadius: piece.type === 'circle' ? '50%' : '2px',
              }}
            >
              {piece.type === 'star' && (
                <Sparkles 
                  className="w-full h-full" 
                  style={{ color: piece.color }}
                  fill={piece.color}
                />
              )}
            </motion.div>
          ))}

          {/* Burst particles from center */}
          {type === 'levelUp' && Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            const distance = 200 + Math.random() * 100;
            return (
              <motion.div
                key={`burst-${i}`}
                initial={{
                  left: '50%',
                  top: '50%',
                  scale: 0,
                  x: '-50%',
                  y: '-50%',
                }}
                animate={{
                  x: Math.cos(angle) * distance - 5,
                  y: Math.sin(angle) * distance - 5,
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 1,
                  delay: 0.2,
                  ease: 'easeOut',
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: colors.levelUp[i % colors.levelUp.length],
                }}
              />
            );
          })}

          {/* Central celebration content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1,
                rotate: 0,
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                duration: 0.5,
                type: 'spring',
                stiffness: 200,
              }}
              className="relative"
            >
              {/* Pulsing glow rings */}
              {[1, 2, 3].map((ring) => (
                <motion.div
                  key={ring}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{
                    scale: [0.8, 1.5 + ring * 0.3, 2 + ring * 0.5],
                    opacity: [0, 0.6, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: ring * 0.15,
                    repeat: type === 'levelUp' ? 2 : 1,
                  }}
                  className={`absolute inset-0 rounded-full border-2 ${
                    type === 'xp' ? 'border-purple-400' :
                    type === 'levelUp' ? 'border-yellow-400' :
                    type === 'streak' ? 'border-orange-400' :
                    type === 'taskComplete' ? 'border-green-400' :
                    'border-green-400'
                  }`}
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}

              {/* Main content card */}
              <motion.div
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`relative z-10 px-8 py-6 rounded-2xl backdrop-blur-md border-2 shadow-2xl ${
                  type === 'xp' ? 'bg-purple-500/20 border-purple-400 shadow-purple-500/30' :
                  type === 'levelUp' ? 'bg-yellow-500/20 border-yellow-400 shadow-yellow-500/30' :
                  type === 'streak' ? 'bg-orange-500/20 border-orange-400 shadow-orange-500/30' :
                  type === 'taskComplete' ? 'bg-green-500/20 border-green-400 shadow-green-500/30' :
                  'bg-green-500/20 border-green-400 shadow-green-500/30'
                }`}
              >
                {/* Icon with animation */}
                <motion.div
                  animate={{ 
                    rotate: type === 'levelUp' ? 360 : 0,
                    scale: 1.1,
                  }}
                  transition={{
                    rotate: { 
                      duration: type === 'levelUp' ? 2 : 0.5, 
                      repeat: Infinity, 
                      ease: type === 'levelUp' ? 'linear' : 'easeInOut' 
                    },
                    scale: { duration: 0.5, repeat: Infinity, repeatType: 'reverse' },
                  }}
                  className="flex justify-center mb-4"
                >
                  <div className={`p-4 rounded-full ${
                    type === 'xp' ? 'bg-purple-500/30' :
                    type === 'levelUp' ? 'bg-yellow-500/30' :
                    type === 'streak' ? 'bg-orange-500/30' :
                    type === 'taskComplete' ? 'bg-green-500/30' :
                    'bg-green-500/30'
                  }`}>
                    <Icon className={`w-12 h-12 md:w-16 md:h-16 ${
                      type === 'xp' ? 'text-purple-300' :
                      type === 'levelUp' ? 'text-yellow-300' :
                      type === 'streak' ? 'text-orange-300' :
                      type === 'taskComplete' ? 'text-green-300' :
                      'text-green-300'
                    }`} />
                  </div>
                </motion.div>

                {/* Title with count-up effect */}
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`text-3xl md:text-5xl font-bold text-center ${
                    type === 'xp' ? 'text-purple-200' :
                    type === 'levelUp' ? 'text-yellow-200' :
                    type === 'streak' ? 'text-orange-200' :
                    type === 'taskComplete' ? 'text-green-200' :
                    'text-green-200'
                  }`}
                >
                  {title}
                </motion.h2>

                {message && (
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-center text-white/80 mt-3 text-lg max-w-xs"
                  >
                    {message}
                  </motion.p>
                )}

                {/* Sparkle decorations */}
                {type === 'levelUp' && (
                  <>
                    <motion.div
                      animate={{ rotate: 360, scale: 1.2 }}
                      transition={{ rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.5, repeat: Infinity, repeatType: 'reverse' } }}
                      className="absolute -top-3 -left-3"
                    >
                      <Sparkles className="w-6 h-6 text-yellow-300" />
                    </motion.div>
                    <motion.div
                      animate={{ rotate: -360, scale: 1.2 }}
                      transition={{ rotate: { duration: 2.5, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.5, repeat: Infinity, repeatType: 'reverse' } }}
                      className="absolute -top-3 -right-3"
                    >
                      <Sparkles className="w-6 h-6 text-yellow-300" />
                    </motion.div>
                    <motion.div
                      animate={{ rotate: 360, scale: 1.3 }}
                      transition={{ rotate: { duration: 2, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.5, repeat: Infinity, repeatType: 'reverse' } }}
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2"
                    >
                      <Star className="w-5 h-5 text-yellow-400" fill="#facc15" />
                    </motion.div>
                  </>
                )}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

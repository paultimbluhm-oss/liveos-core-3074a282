// Sound effects using Web Audio API
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

export function playXPSound() {
  if (!audioContext) return;
  // Rising arpeggio for XP gain
  playTone(523, 0.1, 'sine', 0.2); // C5
  setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 50); // E5
  setTimeout(() => playTone(784, 0.15, 'sine', 0.25), 100); // G5
}

export function playLevelUpSound() {
  if (!audioContext) return;
  // Epic level up fanfare
  playTone(523, 0.15, 'sine', 0.3); // C5
  setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 100); // E5
  setTimeout(() => playTone(784, 0.15, 'sine', 0.3), 200); // G5
  setTimeout(() => playTone(1047, 0.3, 'sine', 0.4), 300); // C6
  setTimeout(() => playTone(1319, 0.4, 'triangle', 0.3), 450); // E6
}

export function playStreakSound() {
  if (!audioContext) return;
  // Fire/streak sound effect
  playTone(440, 0.1, 'sawtooth', 0.15);
  setTimeout(() => playTone(554, 0.1, 'sawtooth', 0.15), 80);
  setTimeout(() => playTone(659, 0.15, 'sawtooth', 0.2), 160);
}

export function playTaskCompleteSound() {
  if (!audioContext) return;
  // Satisfying completion chime
  playTone(880, 0.08, 'sine', 0.2);
  setTimeout(() => playTone(1109, 0.12, 'sine', 0.25), 60);
}

export function playAchievementSound() {
  if (!audioContext) return;
  // Magical achievement unlock
  playTone(392, 0.1, 'sine', 0.2); // G4
  setTimeout(() => playTone(523, 0.1, 'sine', 0.2), 100); // C5
  setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 200); // E5
  setTimeout(() => playTone(784, 0.2, 'sine', 0.3), 300); // G5
  setTimeout(() => playTone(1047, 0.3, 'triangle', 0.25), 450); // C6
}

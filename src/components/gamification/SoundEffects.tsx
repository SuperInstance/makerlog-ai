/**
 * Sound Effects Manager
 *
 * Provides optional audio feedback for gamification events.
 * All sounds are respectful, subtle, and can be disabled by user preference.
 *
 * To enable:
 * 1. Place sound files in /public/sounds/
 * 2. Call playSound() in your event handlers
 * 3. Respect user's sound preference
 */

import { useState, useRef, useEffect } from 'react';

export type SoundType =
  | 'achievement'
  | 'level_up'
  | 'xp_gain'
  | 'streak_milestone'
  | 'harvest_complete'
  | 'recording_start'
  | 'recording_stop'
  | 'button_click'
  | 'error';

interface SoundConfig {
  file: string;
  volume: number;
  duration: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  achievement: {
    file: '/sounds/achievement.mp3',
    volume: 0.3,
    duration: 1500,
  },
  level_up: {
    file: '/sounds/level_up.mp3',
    volume: 0.4,
    duration: 2000,
  },
  xp_gain: {
    file: '/sounds/xp_gain.mp3',
    volume: 0.2,
    duration: 300,
  },
  streak_milestone: {
    file: '/sounds/streak.mp3',
    volume: 0.3,
    duration: 1000,
  },
  harvest_complete: {
    file: '/sounds/harvest.mp3',
    volume: 0.3,
    duration: 1200,
  },
  recording_start: {
    file: '/sounds/record_start.mp3',
    volume: 0.15,
    duration: 100,
  },
  recording_stop: {
    file: '/sounds/record_stop.mp3',
    volume: 0.15,
    duration: 100,
  },
  button_click: {
    file: '/sounds/click.mp3',
    volume: 0.1,
    duration: 50,
  },
  error: {
    file: '/sounds/error.mp3',
    volume: 0.2,
    duration: 400,
  },
};

/**
 * Sound effects manager hook
 */
export function useSoundEffects() {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundsCacheRef = useRef<Map<SoundType, HTMLAudioElement>>(new Map());

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      document.removeEventListener('click', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    return () => document.removeEventListener('click', handleUserInteraction);
  }, []);

  // Load sound into cache
  const loadSound = (type: SoundType): HTMLAudioElement | null => {
    const cached = soundsCacheRef.current.get(type);
    if (cached) return cached;

    try {
      const audio = new Audio(SOUND_CONFIGS[type].file);
      audio.volume = SOUND_CONFIGS[type].volume * volume;
      soundsCacheRef.current.set(type, audio);
      return audio;
    } catch (error) {
      console.warn(`Failed to load sound: ${type}`, error);
      return null;
    }
  };

  // Play a sound effect
  const playSound = (type: SoundType): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!enabled) {
        resolve();
        return;
      }

      const audio = loadSound(type);
      if (!audio) {
        resolve();
        return;
      }

      // Reset to beginning if already playing
      audio.currentTime = 0;

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audio.onended = () => resolve();
          })
          .catch((error) => {
            // Auto-play was prevented or sound not found
            console.warn(`Failed to play sound: ${type}`, error);
            resolve();
          });
      } else {
        resolve();
      }
    });
  };

  // Play multiple sounds in sequence
  const playSequence = async (sounds: SoundType[]): Promise<void> => {
    for (const sound of sounds) {
      await playSound(sound);
    }
  };

  // Preload all sounds
  const preloadAll = () => {
    Object.keys(SOUND_CONFIGS).forEach((type) => {
      loadSound(type as SoundType);
    });
  };

  // Clear cached sounds
  const clearCache = () => {
    soundsCacheRef.current.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    soundsCacheRef.current.clear();
  };

  return {
    enabled,
    setEnabled,
    volume,
    setVolume,
    playSound,
    playSequence,
    preloadAll,
    clearCache,
  };
}

/**
 * Simpler sound generator using Web Audio API (no external files needed)
 */
export function useSyntheticSounds() {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!enabled) return;

    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Failed to play tone:', error);
    }
  };

  const playAchievement = () => {
    // Ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 200, 'sine'), i * 100);
    });
  };

  const playLevelUp = () => {
    // Dramatic ascending sequence
    const notes = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 250, 'triangle'), i * 120);
    });
  };

  const playXPGain = () => {
    // Quick positive blip
    playTone(880, 100, 'sine');
  };

  const playStreakMilestone = () => {
    // Warm ascending sequence
    const notes = [523.25, 587.33, 659.25, 783.99]; // C5, D5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 200, 'triangle'), i * 100);
    });
  };

  const playHarvestComplete = () => {
    // Satisfying completion chord
    const notes = [523.25, 659.25, 783.99]; // C major chord
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 400, 'sine'), i * 50);
    });
  };

  const playError = () => {
    // Low descending tone
    playTone(200, 300, 'sawtooth');
  };

  const playClick = () => {
    // Subtle click
    playTone(1200, 50, 'square');
  };

  return {
    enabled,
    setEnabled,
    volume,
    setVolume,
    playTone,
    playAchievement,
    playLevelUp,
    playXPGain,
    playStreakMilestone,
    playHarvestComplete,
    playError,
    playClick,
  };
}

/**
 * Sound settings component
 */
export function SoundSettings() {
  const { enabled, setEnabled, volume, setVolume } = useSyntheticSounds();

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-white mb-3">🔊 Sound Effects</h3>

      <div className="space-y-3">
        {/* Enable/disable toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Enable Sounds</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${enabled ? 'bg-blue-500' : 'bg-slate-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${enabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Volume slider */}
        <div>
          <label htmlFor="volume" className="text-sm text-slate-300 block mb-2">
            Volume: {Math.round(volume * 100)}%
          </label>
          <input
            id="volume"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Test sounds */}
        <div className="flex gap-2">
          <button
            onClick={() => enabled && useSyntheticSounds().playAchievement()}
            className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded transition"
          >
            Test Achievement
          </button>
          <button
            onClick={() => enabled && useSyntheticSounds().playLevelUp()}
            className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded transition"
          >
            Test Level Up
          </button>
        </div>
      </div>
    </div>
  );
}

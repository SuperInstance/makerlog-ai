/**
 * LevelUpCelebration Component
 *
 * Dramatic level up animation with:
 * - Flash effect
 * - Radial burst
 * - Floating level number
 * - Particle confetti
 */

import React, { useEffect, useState } from 'react';

interface LevelUpCelebrationProps {
  level: number;
  onComplete?: () => void;
}

export function LevelUpCelebration({ level, onComplete }: LevelUpCelebrationProps) {
  const [stage, setStage] = useState<'flash' | 'burst' | 'float' | 'done'>('flash');

  useEffect(() => {
    // Flash stage
    const flashTimer = setTimeout(() => setStage('burst'), 200);
    // Burst stage
    const burstTimer = setTimeout(() => setStage('float'), 500);
    // Float stage
    const floatTimer = setTimeout(() => setStage('done'), 2500);
    // Complete
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 3000);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(burstTimer);
      clearTimeout(floatTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  return (
    <>
      {/* Flash overlay */}
      {stage === 'flash' && (
        <div
          className="fixed inset-0 pointer-events-none z-50"
          style={{
            background: 'radial-gradient(circle, rgba(250, 204, 21, 0.3) 0%, transparent 70%)',
            animation: 'flashFade 0.3s ease-out forwards',
          }}
        />
      )}

      {/* Radial burst */}
      {(stage === 'burst' || stage === 'float') && (
        <div
          className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center"
          style={{ animation: 'burstPulse 1s ease-out forwards' }}
        >
          <div
            className="absolute"
            style={{
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(250, 204, 21, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
        </div>
      )}

      {/* Floating level number */}
      {(stage === 'burst' || stage === 'float') && (
        <div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          style={{ animation: 'levelFloat 2s ease-out forwards' }}
        >
          <div className="text-center">
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500">
              LEVEL {level}
            </div>
            <div className="text-2xl font-bold text-yellow-400 mt-2">
              🎉 LEVEL UP! 🎉
            </div>
          </div>
        </div>
      )}

      {/* Confetti particles */}
      {(stage === 'burst' || stage === 'float') && <ConfettiParticles count={30} />}

      <style>{`
        @keyframes flashFade {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }

        @keyframes burstPulse {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes levelFloat {
          0% {
            transform: translateY(50px) scale(0.5);
            opacity: 0;
          }
          20% {
            transform: translateY(0) scale(1.2);
            opacity: 1;
          }
          80% {
            transform: translateY(-20px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}

/**
 * Confetti particles for celebration
 */
function ConfettiParticles({ count = 20 }: { count: number }) {
  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 40,
      y: 50 + (Math.random() - 0.5) * 20,
      color: ['#facc15', '#fb923c', '#f472b6', '#60a5fa', '#4ade80'][Math.floor(Math.random() * 5)],
      size: 8 + Math.random() * 12,
      rotation: Math.random() * 360,
      speed: 1 + Math.random() * 2,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiFall ${1.5 + Math.random()}s ease-out forwards`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      ))}

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

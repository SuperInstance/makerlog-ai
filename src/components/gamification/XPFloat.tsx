/**
 * XPFloat Component
 *
 * Floating +XP animation that appears when XP is earned.
 * Can spawn multiple floating numbers for dramatic effect.
 */

import React, { useEffect, useState } from 'react';

interface XPFloatProps {
  amount: number;
  x?: number;
  y?: number;
  onComplete?: () => void;
}

export function XPFloat({ amount, x = 50, y = 50, onComplete }: XPFloatProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  // Generate slight random offset for natural feel
  const offsetX = (Math.random() - 0.5) * 40;
  const offsetY = (Math.random() - 0.5) * 20;

  return (
    <div
      className="fixed pointer-events-none z-50 font-bold text-yellow-400 text-xl"
      style={{
        left: `calc(${x}% + ${offsetX}px)`,
        top: `calc(${y}% + ${offsetY}px)`,
        animation: 'floatUp 1.5s ease-out forwards',
        textShadow: '0 0 10px rgba(250, 204, 21, 0.8), 0 2px 4px rgba(0, 0, 0, 0.5)',
      }}
    >
      +{amount} XP
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-80px) scale(1.3);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook to spawn XP float animations
 */
export function useXPFloat() {
  const [floats, setFloats] = useState<Array<{ id: string; amount: number; x: number; y: number }>>([]);

  const showXP = (amount: number, x?: number, y?: number) => {
    const id = crypto.randomUUID();
    const centerX = x ?? 50 + (Math.random() - 0.5) * 30;
    const centerY = y ?? 50 + (Math.random() - 0.5) * 30;

    setFloats((prev) => [...prev, { id, amount, x: centerX, y: centerY }]);

    // Auto-remove after animation
    setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 1500);
  };

  const showXPMultiple = (amount: number, count: number = 3) => {
    const totalPerFloat = Math.ceil(amount / count);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        showXP(totalPerFloat);
      }, i * 150);
    }
  };

  const XPFloatContainer = () => (
    <>
      {floats.map((f) => (
        <XPFloat
          key={f.id}
          amount={f.amount}
          x={f.x}
          y={f.y}
          onComplete={() => {
            setFloats((prev) => prev.filter((float) => float.id !== f.id));
          }}
        />
      ))}
    </>
  );

  return { showXP, showXPMultiple, XPFloatContainer };
}

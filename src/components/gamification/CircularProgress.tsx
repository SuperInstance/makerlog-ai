/**
 * CircularProgress Component
 *
 * Animated circular progress indicator for daily quota usage.
 * Features:
 * - Smooth SVG stroke animation
 * - Gradient fill
 * - Percentage in center
 * - "On fire" state for high usage
 */

import React, { useEffect, useState, useRef } from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showFire?: boolean;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red';
}

export function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 10,
  label,
  showFire = false,
  color = 'blue',
}: CircularProgressProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [isOnFire, setIsOnFire] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPercentage / 100) * circumference;

  // Animate percentage on mount
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = percentage / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setAnimatedPercentage((prev) => Math.min(prev + increment, percentage));
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [percentage]);

  // Check if "on fire" (80%+ usage)
  useEffect(() => {
    setIsOnFire(showFire && percentage >= 80);
  }, [showFire, percentage]);

  const colorClasses = {
    blue: 'from-blue-400 to-blue-600',
    purple: 'from-purple-400 to-purple-600',
    green: 'from-green-400 to-green-600',
    orange: 'from-orange-400 to-orange-600',
    red: 'from-red-400 to-red-600',
  };

  const strokeColor = colorClasses[color];

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer glow for on fire state */}
      {isOnFire && (
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.4) 0%, transparent 70%)',
            animation: 'fireGlow 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Fire particles for on fire state */}
      {isOnFire && <FireParticles />}

      {/* SVG circle progress */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: isOnFire ? 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.6))' : 'none' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(51, 65, 85, 0.5)"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${color})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color === 'blue' ? '#60a5fa' : color === 'purple' ? '#c084fc' : color === 'green' ? '#4ade80' : color === 'orange' ? '#fb923c' : '#f87171'} />
            <stop offset="100%" stopColor={color === 'blue' ? '#2563eb' : color === 'purple' ? '#9333ea' : color === 'green' ? '#22c55e' : color === 'orange' ? '#ea580c' : '#dc2626'} />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isOnFire && (
          <span className="text-2xl animate-bounce" style={{ animationDuration: '0.8s' }}>
            🔥
          </span>
        )}
        <span className="text-3xl font-black text-white">
          {Math.round(animatedPercentage)}%
        </span>
        {label && (
          <span className="text-xs text-slate-400 mt-1">
            {label}
          </span>
        )}
      </div>

      <style>{`
        @keyframes fireGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

/**
 * Fire particles for "on fire" state
 */
function FireParticles() {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 0.2,
    x: 50 + (Math.cos((i / 8) * Math.PI * 2) * 40),
    y: 50 + (Math.sin((i / 8) * Math.PI * 2) * 40),
  }));

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
      {particles.map((p) => (
        <circle
          key={p.id}
          cx={`${p.x}%`}
          cy={`${p.y}%`}
          r="3"
          fill="#fb923c"
          opacity="0.6"
          style={{
            animation: `particleRise 1s ease-out ${p.delay}s infinite`,
          }}
        />
      ))}

      <style>{`
        @keyframes particleRise {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translateY(-20px) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </svg>
  );
}

/**
 * Animated counter for stats
 */
export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = value / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setDisplayValue((prev) => Math.min(prev + increment, value));
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className="font-mono font-bold">
      {prefix}
      {Math.round(displayValue).toLocaleString()}
      {suffix}
    </span>
  );
}

/**
 * Onboarding Component
 *
 * First-run experience for new users.
 */

import { useState, useEffect } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  icon: string;
  action?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Makerlog!',
    content: 'Your voice-first development assistant. Talk through your ideas, and wake up to results.',
    icon: '👋',
    action: "Let's get started",
  },
  {
    id: 'record',
    title: 'Push-to-Talk Recording',
    content: 'Hold the microphone button to record. Release when done. Your audio is transcribed in real-time.',
    icon: '🎤',
    action: 'Got it',
  },
  {
    id: 'opportunities',
    title: 'AI Detects Opportunities',
    content: 'I automatically detect code, images, and text that could be generated. Queue them for overnight batch execution.',
    icon: '✨',
    action: 'Interesting',
  },
  {
    id: 'harvest',
    title: 'Overnight Harvest',
    content: 'While you sleep, queued tasks run using free Cloudflare quota. Wake up to completed work!',
    icon: '🌙',
    action: 'Sounds great',
  },
  {
    id: 'gamification',
    title: 'Earn XP & Achievements',
    content: 'Record daily, complete tasks, and maintain streaks to level up and unlock badges.',
    icon: '🏆',
    action: 'Let\'s go!',
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      } else if (e.key === 'Escape') {
        skipOnboarding();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('makerlog-onboarding-complete', 'true');
    onComplete();
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl scale-in">
        {/* Progress Bar */}
        <div className="h-1 bg-slate-700 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={ONBOARDING_STEPS.length}
            aria-label="Onboarding progress"
          />
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <span className="text-6xl mb-4 block" aria-hidden="true">{step.icon}</span>
          <h2 id="onboarding-title" className="text-2xl font-bold text-white mb-3">
            {step.title}
          </h2>
          <p className="text-slate-300 mb-6">{step.content}</p>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-6" aria-label="Step indicators">
            {ONBOARDING_STEPS.map((s, index) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-blue-500 scale-125'
                    : index < currentStep
                      ? 'bg-blue-500/50'
                      : 'bg-slate-600'
                }`}
                aria-current={index === currentStep ? 'step' : undefined}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed bg-slate-700 hover:bg-slate-600 text-white btn-press focus-ring min-h-[48px]"
              aria-label="Go to previous step"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition bg-blue-500 hover:bg-blue-400 text-white btn-press focus-ring min-h-[48px]"
              aria-label={currentStep < ONBOARDING_STEPS.length - 1 ? 'Go to next step' : 'Complete onboarding'}
            >
              {step.action || 'Next'}
            </button>
          </div>

          {/* Skip */}
          {currentStep > 0 && (
            <button
              onClick={skipOnboarding}
              className="mt-4 text-xs text-slate-500 hover:text-slate-300 underline btn-press focus-ring"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('makerlog-onboarding-complete') === 'true';
    setHasCompletedOnboarding(completed);
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem('makerlog-onboarding-complete');
    setHasCompletedOnboarding(false);
  };

  return { hasCompletedOnboarding, resetOnboarding };
}

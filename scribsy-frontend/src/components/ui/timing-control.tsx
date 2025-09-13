'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNoteTiming, useTimingDisplay, CreationMethod } from '@/hooks/use-note-timing';
import { 
  ClockIcon, 
  PlayIcon, 
  StopIcon,
  PencilIcon,
  MicrophoneIcon,
  SparklesIcon,
  ComputerDesktopIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface TimingControlProps {
  noteId: number;
  className?: string;
}

export function TimingControl({ noteId, className = '' }: TimingControlProps) {
  const { 
    currentSession, 
    isTiming, 
    loading, 
    error, 
    startTiming, 
    completeTiming,
    defaultBaselines 
  } = useNoteTiming(noteId);

  const {
    formattedTime,
    progressPercentage,
    timeRemaining
  } = useTimingDisplay(currentSession);

  const [showMethodSelector, setShowMethodSelector] = useState(false);

  const methodOptions: Array<{ 
    method: CreationMethod; 
    label: string; 
    description: string; 
    icon: React.ComponentType<any>;
    color: string;
  }> = [
    {
      method: 'handwritten',
      label: 'Handwritten',
      description: 'Type notes manually',
      icon: PencilIcon,
      color: 'text-gray-600 bg-gray-100 hover:bg-gray-200'
    },
    {
      method: 'ai_assisted',
      label: 'AI-Assisted',
      description: 'Use AI features while typing',
      icon: ComputerDesktopIcon,
      color: 'text-blue-600 bg-blue-100 hover:bg-blue-200'
    },
    {
      method: 'ai_generated',
      label: 'AI-Generated',
      description: 'Fully automated notes',
      icon: SparklesIcon,
      color: 'text-purple-600 bg-purple-100 hover:bg-purple-200'
    },
  ];

  const handleStartTiming = async (method: CreationMethod) => {
    await startTiming(method);
    setShowMethodSelector(false);
  };

  const handleCompleteTiming = async () => {
    await completeTiming();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              size="sm" 
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If timing is complete, show results
  if (currentSession && currentSession.completedAt) {
    return (
      <Card className={`${className} border-green-200 bg-green-50 dark:bg-green-900/10`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Note Creation Complete
              </h3>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <p>
                  <strong>Method:</strong> {methodOptions.find(m => m.method === currentSession.method)?.label}
                </p>
                <p>
                  <strong>Time:</strong> {currentSession.actualMinutes}m 
                  {currentSession.timeSavedMinutes && currentSession.timeSavedMinutes > 0 && (
                    <span className="text-green-600 font-semibold">
                      {' '}(Saved {currentSession.timeSavedMinutes}m)
                    </span>
                  )}
                </p>
                {currentSession.efficiencyPercentage && (
                  <p>
                    <strong>Efficiency:</strong> {currentSession.efficiencyPercentage.toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If currently timing, show progress
  if (isTiming && currentSession) {
    return (
      <Card className={`${className} border-blue-200 bg-blue-50 dark:bg-blue-900/10`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-800 dark:text-blue-200">
                  Timing: {methodOptions.find(m => m.method === currentSession.method)?.label}
                </span>
              </div>
              <Button
                onClick={handleCompleteTiming}
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <StopIcon className="w-4 h-4 mr-1" />
                Complete
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Elapsed: {formattedTime}</span>
                <span className="text-gray-600">Remaining: {timeRemaining}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>0m</span>
                <span>{currentSession.baselineMinutes}m baseline</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show method selector
  if (showMethodSelector) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Select Creation Method
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {methodOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.method}
                    onClick={() => handleStartTiming(option.method)}
                    variant="outline"
                    className={`h-auto p-3 flex flex-col items-center gap-2 ${option.color}`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-center">
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs opacity-75">{option.description}</div>
                      <div className="text-xs opacity-60">
                        {defaultBaselines[option.method]}m baseline
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
            <Button
              onClick={() => setShowMethodSelector(false)}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default state - show start timing button
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="text-center">
          <ClockIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Track Note Creation Time
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Measure how long it takes to create notes with different methods
          </p>
          <Button
            onClick={() => setShowMethodSelector(true)}
            className="w-full"
          >
            <PlayIcon className="w-4 h-4 mr-2" />
            Start Timing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

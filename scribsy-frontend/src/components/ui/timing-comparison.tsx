'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNoteTiming, CreationMethod } from '@/hooks/use-note-timing';
import { 
  ClockIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PencilIcon,
  MicrophoneIcon,
  SparklesIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

interface TimingComparisonProps {
  className?: string;
}

export function TimingComparison({ className = '' }: TimingComparisonProps) {
  const { 
    timingStats, 
    loading, 
    error, 
    fetchTimingStats, 
    getTimeSavedComparison, 
    getEfficiencyComparison,
    defaultBaselines 
  } = useNoteTiming();

  const timeSavedComparison = getTimeSavedComparison();
  const efficiencyComparison = getEfficiencyComparison();

  const methodIcons: Record<CreationMethod, React.ComponentType<any>> = {
    handwritten: PencilIcon,
    ai_assisted: ComputerDesktopIcon,
    ai_generated: SparklesIcon,
    voice_transcription: MicrophoneIcon,
  };

  const methodLabels: Record<CreationMethod, string> = {
    handwritten: 'Handwritten',
    ai_assisted: 'AI-Assisted',
    ai_generated: 'AI-Generated',
    voice_transcription: 'Voice Transcription',
  };

  const methodColors: Record<CreationMethod, string> = {
    handwritten: 'text-gray-600 bg-gray-100',
    ai_assisted: 'text-blue-600 bg-blue-100',
    ai_generated: 'text-purple-600 bg-purple-100',
    voice_transcription: 'text-green-600 bg-green-100',
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            Note Creation Timing Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading timing data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            Note Creation Timing Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchTimingStats()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timingStats || timingStats.total_notes === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            Note Creation Timing Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timing Data Yet</h3>
            <p className="text-gray-600 mb-4">
              Start creating notes with different methods to see timing comparisons.
            </p>
            <div className="text-sm text-gray-500">
              <p>• Handwritten notes: Type manually</p>
              <p>• AI-Assisted: Use AI features while typing</p>
              <p>• AI-Generated: Fully automated notes</p>
              <p>• Voice Transcription: Dictate your notes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5" />
          Note Creation Timing Analysis
        </CardTitle>
        <p className="text-sm text-gray-600">
          Last {timingStats.date_range.days} days • {timingStats.total_notes} notes analyzed
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Time Saved Comparison */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
            Average Time Saved (minutes)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(timeSavedComparison || {}).map(([method, timeSaved]) => {
              const Icon = methodIcons[method as CreationMethod];
              const label = methodLabels[method as CreationMethod];
              const colorClass = methodColors[method as CreationMethod];
              const baseline = defaultBaselines[method as CreationMethod];
              const stats = timingStats.methods[method];
              
              return (
                <div key={method} className="text-center p-4 rounded-lg border">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${colorClass}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm">{label}</h4>
                  <p className="text-2xl font-bold text-green-600">{timeSaved.toFixed(1)}m</p>
                  <p className="text-xs text-gray-500">
                    {stats?.total_notes || 0} notes • {baseline}m baseline
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Efficiency Comparison */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
            Efficiency Percentage
          </h3>
          <div className="space-y-3">
            {Object.entries(efficiencyComparison || {}).map(([method, efficiency]) => {
              const Icon = methodIcons[method as CreationMethod];
              const label = methodLabels[method as CreationMethod];
              const colorClass = methodColors[method as CreationMethod];
              const stats = timingStats.methods[method];
              
              return (
                <div key={method} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{label}</h4>
                      <p className="text-sm text-gray-600">
                        {stats?.avg_actual_minutes.toFixed(1)}m actual • {stats?.avg_baseline_minutes.toFixed(1)}m baseline
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{efficiency.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">
                      {stats?.total_notes || 0} notes
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Insights */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600" />
            Key Insights
          </h3>
          <div className="text-sm space-y-1">
            {(() => {
              const insights = [];
              
              if (timeSavedComparison) {
                const bestMethod = Object.entries(timeSavedComparison).reduce((a, b) => 
                  timeSavedComparison[a[0] as CreationMethod] > timeSavedComparison[b[0] as CreationMethod] ? a : b
                );
                
                const worstMethod = Object.entries(timeSavedComparison).reduce((a, b) => 
                  timeSavedComparison[a[0] as CreationMethod] < timeSavedComparison[b[0] as CreationMethod] ? a : b
                );
                
                if (bestMethod[1] > 0) {
                  insights.push(
                    `🏆 ${methodLabels[bestMethod[0] as CreationMethod]} saves the most time: ${bestMethod[1].toFixed(1)}m per note`
                  );
                }
                
                if (worstMethod[1] < 0) {
                  insights.push(
                    `⚠️ ${methodLabels[worstMethod[0] as CreationMethod]} takes longer than baseline: ${Math.abs(worstMethod[1]).toFixed(1)}m extra`
                  );
                }
              }
              
              if (insights.length === 0) {
                insights.push("Continue creating notes to see personalized insights!");
              }
              
              return insights;
            })()}
          </div>
        </div>

        <div className="text-center">
          <Button 
            onClick={() => fetchTimingStats()} 
            variant="outline" 
            size="sm"
          >
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

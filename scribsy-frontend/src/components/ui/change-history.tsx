'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClockIcon, 
  UserIcon, 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

interface HistoryEntry {
  id: number;
  note_id: number;
  user_id: number;
  username: string;
  action: string;
  summary: string;
  created_at: string;
}

interface ChangeHistoryProps {
  noteId: number;
}

export function ChangeHistory({ noteId }: ChangeHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [noteId]);

  const loadHistory = async () => {
    try {
      const data = await apiClient.getNoteHistory(noteId);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return <DocumentTextIcon className="w-4 h-4 text-green-500" />;
      case 'updated':
        return <DocumentTextIcon className="w-4 h-4 text-blue-500" />;
      case 'signed':
        return <DocumentTextIcon className="w-4 h-4 text-purple-500" />;
      case 'finalized':
        return <DocumentTextIcon className="w-4 h-4 text-orange-500" />;
      default:
        return <DocumentTextIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'updated':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
      case 'signed':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400';
      case 'finalized':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading history...</div>;
  }

  const displayHistory = expanded ? history : history.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            Change History ({history.length})
          </div>
          {history.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-gray-500 hover:text-gray-700 dark:text-green-400 dark:hover:text-green-300"
            >
              {expanded ? (
                <>
                  <ChevronDownIcon className="w-4 h-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronRightIcon className="w-4 h-4 mr-1" />
                  Show All
                </>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-green-400">
            No change history available
          </div>
        ) : (
          <div className="space-y-3">
            {displayHistory.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  index === 0 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(entry.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(entry.action)}`}>
                      {entry.action}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-green-400">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <UserIcon className="w-3 h-3 text-gray-400 dark:text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-green-300">
                      {entry.username}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 dark:text-green-200">
                    {entry.summary}
                  </p>
                </div>
              </div>
            ))}
            
            {!expanded && history.length > 3 && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(true)}
                  className="text-blue-600 hover:text-blue-700 dark:text-green-400 dark:hover:text-green-300"
                >
                  +{history.length - 3} more changes
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



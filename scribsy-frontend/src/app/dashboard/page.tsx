'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DocumentPlusIcon, 
  DocumentTextIcon, 
  ClockIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';

interface DashboardStats {
  totalNotes: number;
  recentNotes: Array<{
    id: string;
    title: string;
    created_at: string;
    content: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalNotes: 0,
    recentNotes: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const notes = await apiClient.getNotes();
        setStats({
          totalNotes: notes.length,
          recentNotes: notes.slice(0, 5),
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-blue-100 mb-4">
            Ready to create your next clinical note? Let's get started.
          </p>
          <Link href="/notes/new">
            <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
              <DocumentPlusIcon className="w-5 h-5 mr-2" />
              Create New Note
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
              <DocumentTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNotes}</div>
              <p className="text-xs text-muted-foreground">
                Clinical notes created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentNotes.length}</div>
              <p className="text-xs text-muted-foreground">
                Recent activity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.floor(stats.totalNotes * 15)}m</div>
              <p className="text-xs text-muted-foreground">
                Estimated time savings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Notes</CardTitle>
            <CardDescription>
              Your latest clinical documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : stats.recentNotes.length > 0 ? (
              <div className="space-y-4">
                {stats.recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {note.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {note.content.substring(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                    <Link href={`/notes/${note.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <Link href="/notes">
                    <Button variant="outline">
                      View All Notes
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  No notes yet
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating your first clinical note.
                </p>
                <div className="mt-6">
                  <Link href="/notes/new">
                    <Button>
                      <DocumentPlusIcon className="w-4 h-4 mr-2" />
                      Create Note
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
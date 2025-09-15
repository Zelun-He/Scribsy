'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  UserIcon, 
  MoonIcon, 
  SunIcon, 
  BellIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';
import { useTheme } from 'next-themes';
import { getBaselineMinutes, setBaselineMinutes } from '@/lib/metrics';
import { WorkingHoursSettings } from '@/components/ui/working-hours-settings';
import { apiClient } from '@/lib/api';
import { useToast } from '@/lib/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [baseline, setBaseline] = useState<number>(getBaselineMinutes());
  const [exporting, setExporting] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const { show } = useToast();

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Note: This would typically call an API to update the profile
      // For now, we'll just show a success message
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBaselineSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBaselineMinutes(baseline);
    setSuccess('Baseline updated');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    
    

    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    // Show confirmation dialog
    setShowPasswordConfirm(true);
  };

  const confirmPasswordChange = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordConfirm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleExportData = async (format: 'json' | 'csv' | 'zip' = 'zip') => {
    setExporting(true);
    try {
      const result = await apiClient.exportUserData(format);
      show(`Data exported successfully as ${result.filename}`);
    } catch (error) {
      console.error('Export failed:', error);
      show('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Cog6ToothIcon className="w-8 h-8 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-emerald-100">
            Settings
          </h1>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md p-4">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="w-5 h-5 mr-2" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Update your account information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Input
                label="Username"
                name="username"
                value={profileData.username}
                onChange={handleProfileChange}
                placeholder="Enter your username"
                required
              />
              
              <Input
                label="Email"
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleProfileChange}
                placeholder="Enter your email"
                required
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LockClosedIcon className="w-5 h-5 mr-2" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordDataChange}
                placeholder="Enter your current password"
                required
              />
              
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordDataChange}
                placeholder="Enter your new password"
                required
              />

              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordDataChange}
                placeholder="Confirm your new password"
                required
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                >
                  {loading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password Change Confirmation Dialog */}
        <AlertDialog open={showPasswordConfirm} onOpenChange={setShowPasswordConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Password Change</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to change your password? This action cannot be undone and you will need to use your new password for all future logins.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmPasswordChange}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                {loading ? 'Changing Password...' : 'Yes, Change Password'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SunIcon className="w-5 h-5 mr-2" />
              Appearance
            </CardTitle>
            <CardDescription>
              Choose your preferred theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value as 'light' | 'dark')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        theme === option.value
                          ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-emerald-100">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-gray-500 dark:text-emerald-400">
                Choose between light and dark themes for your interface.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BellIcon className="w-5 h-5 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-emerald-100">
                    Email Notifications
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-emerald-400">
                    Receive email updates about your notes
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-emerald-100">
                    Push Notifications
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-emerald-400">
                    Receive push notifications for important updates
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Productivity / Time-savings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cog6ToothIcon className="w-5 h-5 mr-2" />
              Productivity
            </CardTitle>
            <CardDescription>
              Configure baseline minutes per note to estimate time saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBaselineSave} className="flex items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-emerald-300 mb-1">
                  Baseline minutes per note
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={baseline}
                  onChange={(e)=> setBaseline(parseInt(e.target.value||'15',10))}
                  className="w-40 h-10 px-3 py-2 text-sm border border-gray-300 dark:border-emerald-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 bg-gray-50 dark:bg-gray-800 dark:text-emerald-100"
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Manage your privacy and security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-emerald-100">
                    Data Export
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-emerald-400">
                    Download a copy of your clinical notes, patients, and account data
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleExportData('zip')}
                    disabled={exporting}
                  >
                    {exporting ? 'Exporting...' : 'Complete Export (ZIP)'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleExportData('json')}
                    disabled={exporting}
                  >
                    JSON
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleExportData('csv')}
                    disabled={exporting}
                  >
                    CSV
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-emerald-100">
                    Change Password
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-emerald-400">
                    Update your account password
                  </p>
                </div>
                <Button variant="secondary" size="sm">
                  Change Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours Settings */}
        <WorkingHoursSettings />

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-emerald-100">
                    Sign Out
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-emerald-400">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-600 dark:text-red-400">
                    Delete Account
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-emerald-400">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
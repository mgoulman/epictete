'use client';

import { useState } from 'react';
import { Save, User, Bell, Shield, Palette, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '@/lib/auth/hooks';
import { PermissionGate, AdminOnly } from '@/components/backoffice/auth/PermissionGate';
import { useTheme } from '@/components/theme-provider';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield, adminOnly: true }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account and system preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-[220px] shrink-0">
          <nav className="bg-secondary border border-border rounded-xl p-2">
            {tabs.map(tab => {
              if (tab.adminOnly) {
                return (
                  <AdminOnly key={tab.id}>
                    <TabButton
                      tab={tab}
                      isActive={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id)}
                    />
                  </AdminOnly>
                );
              }
              return (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings user={user} />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'security' && (
            <PermissionGate permission="settings.write">
              <SecuritySettings />
            </PermissionGate>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  tab,
  isActive,
  onClick
}: {
  tab: { id: string; label: string; icon: React.ElementType };
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg border-none cursor-pointer transition-all mb-1 ${
        isActive
          ? 'bg-[#606338] text-white'
          : 'bg-transparent text-muted-foreground hover:bg-card hover:text-foreground'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-muted'}`} />
      <span className="font-medium text-sm">{tab.label}</span>
    </button>
  );
}

function ProfileSettings({ user }: { user: import('@/lib/types/auth').AuthUser | null }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="bg-secondary border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Profile Settings</h2>
        <p className="text-[13px] text-muted-foreground mt-1">Update your personal information</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#606338] to-[#4d4f2e] flex items-center justify-center text-white text-2xl font-semibold">
            {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <button disabled className="px-4 py-2 bg-card border border-border rounded-lg text-muted text-[13px] cursor-not-allowed">
              Change Avatar
            </button>
            <p className="text-xs text-muted mt-1">JPG, PNG. Max 2MB.</p>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1.5">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full py-2.5 px-3.5 bg-background border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
          />
        </div>

        {/* Email (readonly) */}
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1.5">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full py-2.5 px-3.5 bg-background border border-border rounded-lg text-muted text-sm cursor-not-allowed"
          />
          <p className="text-xs text-muted mt-1">Email cannot be changed</p>
        </div>

        {/* Role (readonly) */}
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1.5">Role</label>
          <div className="py-2.5 px-3.5 bg-background border border-border rounded-lg">
            <span className="capitalize text-foreground">{user?.role}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] border-none rounded-lg text-white text-sm font-medium cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="bg-secondary border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Notification Settings</h2>
        <p className="text-[13px] text-muted-foreground mt-1">Configure how you receive notifications</p>
      </div>

      <div className="flex flex-col gap-3">
        <NotificationToggle
          label="Email Notifications"
          description="Receive email updates for important events"
          defaultChecked={true}
        />
        <NotificationToggle
          label="System Alerts"
          description="Get notified about system status changes"
          defaultChecked={true}
        />
        <NotificationToggle
          label="Marketing Updates"
          description="Receive updates about new features"
          defaultChecked={false}
        />
      </div>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  defaultChecked
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-[13px] text-muted mt-1">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-12 h-6 rounded-full border-none cursor-pointer transition-colors ${
          checked ? 'bg-[#606338]' : 'bg-border'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
            checked ? 'left-[26px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor }
  ] as const;

  return (
    <div className="bg-secondary border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Appearance Settings</h2>
        <p className="text-[13px] text-muted-foreground mt-1">Customize the look and feel</p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-3">Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(option => {
              const Icon = option.icon;
              const isActive = theme === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setTheme(option.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isActive
                      ? 'border-[#606338] bg-[#606338]/10'
                      : 'border-border bg-card hover:border-[#606338]/30'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-[#606338]' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${isActive ? 'text-[#606338]' : 'text-foreground'}`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-foreground mb-2">Sidebar Position</label>
          <p className="text-[13px] text-muted-foreground">Sidebar preferences are saved automatically.</p>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="bg-secondary border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>
        <p className="text-[13px] text-muted-foreground mt-1">Admin-only security configurations</p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-[13px] text-yellow-500">
            These settings affect all users. Changes should be made carefully.
          </p>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-foreground mb-2">Session Timeout</label>
          <select className="w-full py-2.5 px-3.5 bg-background border border-border rounded-lg text-foreground text-sm">
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
            <option value="480">8 hours</option>
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-foreground mb-2">Password Requirements</label>
          <div className="p-4 bg-card rounded-lg text-[13px] text-muted space-y-2">
            <p>Minimum 8 characters</p>
            <p>At least one uppercase letter</p>
            <p>At least one number</p>
          </div>
        </div>
      </div>
    </div>
  );
}

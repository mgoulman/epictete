'use client';

import { useState } from 'react';
import { Save, User, Bell, Shield, Palette, Sun, Moon, Monitor, UtensilsCrossed, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/hooks';
import { PermissionGate, AdminOnly } from '@/components/backoffice/auth/PermissionGate';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { CategoriesSettings } from './CategoriesSettings';
import { RbacSettings } from './RbacSettings';
import { NotificationSettings } from './NotificationSettings';
import { ApprovalSettings } from './ApprovalSettings';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const { t } = useTranslation();
  const s = t.backoffice.settings;

  const tabs = [
    { id: 'profile', label: s.tabs.profile, icon: User },
    { id: 'categories', label: 'Catégories', icon: UtensilsCrossed },
    { id: 'notifications', label: s.tabs.notifications, icon: Bell },
    { id: 'appearance', label: s.tabs.appearance, icon: Palette },
    { id: 'rbac', label: 'Rôles & Permissions', icon: KeyRound, adminOnly: true },
    { id: 'approvals', label: 'Validations', icon: ShieldCheck, adminOnly: true },
    { id: 'security', label: s.tabs.security, icon: Shield, adminOnly: true }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{s.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{s.subtitle}</p>
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
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileSettings user={user} />}
          {activeTab === 'categories' && <CategoriesSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'rbac' && (
            <PermissionGate permission="users.manage">
              <RbacSettings />
            </PermissionGate>
          )}
          {activeTab === 'approvals' && (
            <PermissionGate permission="settings.write">
              <ApprovalSettings />
            </PermissionGate>
          )}
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
  const { t } = useTranslation();
  const p = t.backoffice.settings.profile;

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="bg-secondary border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">{p.title}</h2>
        <p className="text-[13px] text-muted-foreground mt-1">{p.subtitle}</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#606338] to-[#4d4f2e] flex items-center justify-center text-white text-2xl font-semibold">
            {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <button disabled className="px-4 py-2 bg-card border border-border rounded-lg text-muted text-[13px] cursor-not-allowed">
              {p.changeAvatar}
            </button>
            <p className="text-xs text-muted mt-1">{p.avatarNote}</p>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1.5">{p.fullName}</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full py-2.5 px-3.5 bg-background border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
          />
        </div>

        {/* Email (readonly) */}
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1.5">{p.email}</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full py-2.5 px-3.5 bg-background border border-border rounded-lg text-muted text-sm cursor-not-allowed"
          />
          <p className="text-xs text-muted mt-1">{p.emailNote}</p>
        </div>

        {/* Role (readonly) */}
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1.5">{p.role}</label>
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
          {isSaving ? p.saving : p.saveChanges}
        </button>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const a = t.backoffice.settings.appearance;

  const themeOptions = [
    { id: 'light', label: a.light, icon: Sun },
    { id: 'dark', label: a.dark, icon: Moon },
    { id: 'system', label: a.system, icon: Monitor }
  ] as const;

  return (
    <div className="bg-secondary border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">{a.title}</h2>
        <p className="text-[13px] text-muted-foreground mt-1">{a.subtitle}</p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-3">{a.theme}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
          <label className="block text-[13px] font-medium text-foreground mb-2">{a.sidebarPosition}</label>
          <p className="text-[13px] text-muted-foreground">{a.sidebarNote}</p>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const { t } = useTranslation();
  const sec = t.backoffice.settings.security;

  return (
    <div className="bg-secondary border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">{sec.title}</h2>
        <p className="text-[13px] text-muted-foreground mt-1">{sec.subtitle}</p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-[13px] text-yellow-500">
            {sec.warning}
          </p>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-foreground mb-2">{sec.sessionTimeout}</label>
          <select className="w-full py-2.5 px-3.5 bg-background border border-border rounded-lg text-foreground text-sm">
            <option value="30">{sec.minutes30}</option>
            <option value="60">{sec.hour1}</option>
            <option value="120">{sec.hours2}</option>
            <option value="480">{sec.hours8}</option>
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-foreground mb-2">{sec.passwordRequirements}</label>
          <div className="p-4 bg-card rounded-lg text-[13px] text-muted space-y-2">
            <p>{sec.minChars}</p>
            <p>{sec.uppercase}</p>
            <p>{sec.oneNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

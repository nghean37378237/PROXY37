/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProxyProfile, Employee, RequestLog, ActiveTab, Language, IpChangeRecord, ThemeMode } from './types';
import { DEFAULT_PROFILES, USER_FARM_PROFILES } from './data/defaultProfiles';
import { DEFAULT_EMPLOYEES } from './data/defaultEmployees';
import { Header } from './components/Header';
import { ActiveProxyCard } from './components/ActiveProxyCard';
import { StatsBanner } from './components/StatsBanner';
import { ProfileList } from './components/ProfileList';
import { EmployeeManager } from './components/EmployeeManager';
import { ProfileModal } from './components/ProfileModal';
import { BulkImportModal } from './components/BulkImportModal';
import { HomeDashboardSyncModal } from './components/HomeDashboardSyncModal';
import { RequestTester } from './components/RequestTester';
import { ConfigGenerator } from './components/ConfigGenerator';
import { Troubleshooter } from './components/Troubleshooter';
import { WebMirror } from './components/WebMirror';
import { VercelDeployModal } from './components/VercelDeployModal';
import { getSavedIpHistory, saveIpHistory } from './utils/proxyReset';

const STORAGE_PROFILES_KEY = 'proxyswitcher_profiles_v3';
const STORAGE_EMPLOYEES_KEY = 'proxyswitcher_employees_v1';
const STORAGE_ACTIVE_ID_KEY = 'proxyswitcher_active_id_v3';
const STORAGE_LANG_KEY = 'proxyswitcher_lang_v1';
const STORAGE_LOGS_KEY = 'proxyswitcher_logs_v1';
const STORAGE_THEME_KEY = 'proxyswitcher_theme_v2';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_LANG_KEY) as Language) || 'vi';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem(STORAGE_THEME_KEY) as ThemeMode) || 'mint';
  });

  // Keep document.body updated with current eye-comfort theme class
  useEffect(() => {
    localStorage.setItem(STORAGE_THEME_KEY, theme);
    document.body.classList.remove(
      'theme-mint',
      'theme-ocean',
      'theme-nordic',
      'theme-sepia',
      'theme-light',
      'theme-charcoal',
      'theme-slate'
    );
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EMPLOYEES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_EMPLOYEES;
  });

  const [profiles, setProfiles] = useState<ProxyProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    const savedId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
    if (savedId && profiles.some((p) => p.id === savedId)) {
      return savedId;
    }
    return profiles.find((p) => p.isActive)?.id || profiles[0]?.id || 'proxy-farm-4000';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('staff');
  const [logs, setLogs] = useState<RequestLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isDashboardSyncOpen, setIsDashboardSyncOpen] = useState(false);
  const [isVercelDeployOpen, setIsVercelDeployOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProxyProfile | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const [ipHistory, setIpHistory] = useState<IpChangeRecord[]>(() => {
    return getSavedIpHistory();
  });

  useEffect(() => {
    saveIpHistory(ipHistory);
  }, [ipHistory]);

  const handleAddIpChangeRecord = (rec: IpChangeRecord) => {
    setIpHistory((prev) => [rec, ...prev.slice(0, 49)]);
  };

  const handleApplyDashboardIps = (ipMap: Record<number, string>) => {
    setProfiles((prev) =>
      prev.map((p) => {
        if (ipMap[p.port]) {
          const isDiff = !!p.publicIp && p.publicIp !== ipMap[p.port];
          return {
            ...p,
            previousIp: isDiff ? p.publicIp : p.previousIp,
            publicIp: ipMap[p.port],
            ipChangeStatus: isDiff ? ('changed' as const) : ('idle' as const),
            lastIpChangedAt: isDiff ? Date.now() : p.lastIpChangedAt,
          };
        }
        return p;
      })
    );
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_EMPLOYEES_KEY, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeProfileId);
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        isActive: p.id === activeProfileId,
      }))
    );
  }, [activeProfileId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
  }, [logs]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_PROFILES[0];

  // Select active profile
  const handleSelectActive = (id: string) => {
    setActiveProfileId(id);
    const chosen = profiles.find((p) => p.id === id);
    if (chosen) {
      showNotification(
        lang === 'vi'
          ? `Đã kích hoạt proxy: ${chosen.name} (${chosen.host}:${chosen.port})`
          : `Activated proxy: ${chosen.name} (${chosen.host}:${chosen.port})`
      );
    }
  };

  // Update single profile state
  const handleUpdateProfile = (updated: ProxyProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Bulk update profiles
  const handleBulkUpdateProfiles = (updatedList: ProxyProfile[]) => {
    const map = new Map(updatedList.map((p) => [p.id, p]));
    setProfiles((prev) => prev.map((p) => (map.has(p.id) ? map.get(p.id)! : p)));
  };

  // Load User's 31 Farm Proxies (Ports 4000 to 4030)
  const handleLoadUserFarm = () => {
    setProfiles(USER_FARM_PROFILES);
    setActiveProfileId(USER_FARM_PROFILES[0].id);
    showNotification(
      lang === 'vi'
        ? 'Đã tải thành công 31 Proxy (4000 - 4030) và phân chia cho 3 nhân viên!'
        : 'Loaded 31 Proxy Farm profiles with staff assignments!'
    );
  };

  // Bulk import handler from modal
  const handleBulkImport = (importedProfiles: ProxyProfile[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setProfiles(importedProfiles);
      if (importedProfiles[0]) {
        setActiveProfileId(importedProfiles[0].id);
      }
      showNotification(
        lang === 'vi'
          ? `Đã thay thế toàn bộ bằng ${importedProfiles.length} proxy mới!`
          : `Replaced with ${importedProfiles.length} new proxies!`
      );
    } else {
      setProfiles((prev) => [...prev, ...importedProfiles]);
      showNotification(
        lang === 'vi'
          ? `Đã thêm ${importedProfiles.length} proxy vào danh sách!`
          : `Added ${importedProfiles.length} proxies to the list!`
      );
    }
  };

  // Test profile connection
  const handleTestProfile = async (profile: ProxyProfile) => {
    setTestingId(profile.id);
    try {
      const startTime = Date.now();
      const resp = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: profile.targetUrl || 'http://192.168.1.27/home',
          method: 'HEAD',
          timeoutMs: 3000,
        }),
      });
      const data = await resp.json();
      const latency = data.latencyMs || Date.now() - startTime;

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id
            ? {
                ...p,
                latencyMs: latency,
                lastTested: Date.now(),
                status: data.success ? 'online' : 'unreachable',
                errorMessage: data.error,
              }
            : p
        )
      );

      if (data.success) {
        showNotification(
          lang === 'vi'
            ? `Proxy ${profile.name} phản hồi tốt (${latency}ms)`
            : `Proxy ${profile.name} responded (${latency}ms)`
        );
      } else {
        showNotification(
          lang === 'vi'
            ? `Cảnh báo: ${data.error || 'Không kết nối được'}`
            : `Warning: ${data.error || 'Could not connect'}`
        );
      }
    } catch (err: any) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id
            ? {
                ...p,
                status: 'unreachable',
                errorMessage: err.message || 'Network error',
                lastTested: Date.now(),
              }
            : p
        )
      );
      showNotification(
        lang === 'vi'
          ? 'Không kết nối được: Mạng LAN có thể bị chặn hoặc thiết bị tắt'
          : 'Connection failed: LAN might be blocked or device is off'
      );
    } finally {
      setTestingId(null);
    }
  };

  // Quick test active
  const handleQuickTest = () => {
    if (activeProfile) {
      handleTestProfile(activeProfile);
    }
  };

  // Save profile from modal
  const handleSaveProfile = (profileData: Partial<ProxyProfile>) => {
    if (editingProfile) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editingProfile.id
            ? ({
                ...p,
                ...profileData,
              } as ProxyProfile)
            : p
        )
      );
      showNotification(lang === 'vi' ? 'Đã cập nhật cấu hình proxy' : 'Updated proxy profile');
    } else {
      const newProf: ProxyProfile = {
        id: `profile-${Date.now()}`,
        name: profileData.name || 'Proxy Mới',
        protocol: profileData.protocol || 'http',
        host: profileData.host || '192.168.1.27',
        port: profileData.port || 4000,
        resetUrl: profileData.resetUrl,
        assignedEmployeeId: profileData.assignedEmployeeId,
        colorTag: profileData.colorTag || '#06B6D4',
        targetUrl: profileData.targetUrl || 'http://192.168.1.27/home',
        description: profileData.description || '',
        username: profileData.username,
        password: profileData.password,
        bypassHosts: profileData.bypassHosts || ['localhost', '127.0.0.1'],
        isActive: false,
        status: 'idle',
        createdAt: Date.now(),
      };
      setProfiles((prev) => [newProf, ...prev]);
      showNotification(lang === 'vi' ? 'Đã thêm cấu hình proxy mới' : 'Added new proxy profile');
    }
    setEditingProfile(null);
  };

  // Delete profile
  const handleDeleteProfile = (id: string) => {
    if (id === activeProfileId) {
      showNotification(
        lang === 'vi'
          ? '⚠️ Không thể xóa proxy đang kích hoạt. Vui lòng chuyển sang proxy khác trước khi xóa.'
          : '⚠️ Cannot delete active proxy. Please switch to another profile first.'
      );
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    showNotification(lang === 'vi' ? 'Đã xóa proxy' : 'Profile deleted');
  };

  // Clone profile
  const handleCloneProfile = (profile: ProxyProfile) => {
    const cloned: ProxyProfile = {
      ...profile,
      id: `profile-${Date.now()}`,
      name: `${profile.name} (Bản sao)`,
      isActive: false,
      createdAt: Date.now(),
    };
    setProfiles((prev) => [cloned, ...prev]);
    showNotification(lang === 'vi' ? 'Đã nhân bản cấu hình' : 'Cloned profile');
  };

  // Reset to default profiles
  const handleResetDefaults = () => {
    setProfiles(DEFAULT_PROFILES);
    setEmployees(DEFAULT_EMPLOYEES);
    setActiveProfileId(DEFAULT_PROFILES[0].id);
    showNotification(
      lang === 'vi'
        ? '🔄 Đã khôi phục cấu hình mặc định (31 cổng IP & danh sách nhân viên)!'
        : 'Reset to default profiles & employee allocations!'
    );
  };

  // Export JSON
  const handleExportJSON = () => {
    const backupData = {
      profiles,
      employees,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proxyswitcher_backup_farm_staff_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            setProfiles(imported);
            showNotification(lang === 'vi' ? 'Nhập cấu hình thành công!' : 'Imported profiles successfully!');
          } else if (imported && typeof imported === 'object' && imported.profiles) {
            setProfiles(imported.profiles);
            if (Array.isArray(imported.employees)) {
              setEmployees(imported.employees);
            }
            showNotification(lang === 'vi' ? 'Nhập cấu hình & nhân viên thành công!' : 'Imported successfully!');
          }
        } catch {
          showNotification(lang === 'vi' ? '⚠️ File JSON không hợp lệ!' : 'Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col selection:bg-cyan-500/25 selection:text-cyan-200 transition-colors duration-500">
      {/* 3-Zone Header Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProfile={activeProfile}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onQuickTest={handleQuickTest}
        onOpenDashboardSync={() => setIsDashboardSyncOpen(true)}
        onOpenVercelDeploy={() => setIsVercelDeployOpen(true)}
        isTesting={testingId !== null}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-cyan-500/50 text-neutral-100 px-4 py-2.5 rounded-lg shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Sticky Quick Home Inspector Button */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setIsDashboardSyncOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 shadow-2xl shadow-cyan-950/60 border border-cyan-400/40 hover:scale-105 active:scale-95 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{lang === 'vi' ? '🖥️ Soi Trang Chủ 192.168.1.27' : '🖥️ 192.168.1.27 Monitor'}</span>
        </button>
      </div>

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* Visual KPI Stats Banner */}
        {activeProfile && (
          <StatsBanner
            profiles={profiles}
            employees={employees}
            activeProfile={activeProfile}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenDashboardSync={() => setIsDashboardSyncOpen(true)}
            onQuickTest={handleQuickTest}
            isTesting={testingId === activeProfile.id}
            lang={lang}
          />
        )}

        {/* Active Proxy Summary Card */}
        {activeProfile && (
          <ActiveProxyCard
            activeProfile={activeProfile}
            profiles={profiles}
            onSelectProfile={handleSelectActive}
            onTest={handleTestProfile}
            onUpdateProfile={handleUpdateProfile}
            isTesting={testingId === activeProfile.id}
            lang={lang}
          />
        )}

        {/* Tab: Phân Chia IP Nhân Viên & Tự Đổi IP (The Requested Staff Feature) */}
        {activeTab === 'staff' && (
          <EmployeeManager
            profiles={profiles}
            employees={employees}
            ipHistory={ipHistory}
            onAddIpChangeRecord={handleAddIpChangeRecord}
            onOpenDashboardSync={() => setIsDashboardSyncOpen(true)}
            onUpdateProfiles={(newProfiles) => setProfiles(newProfiles)}
            onUpdateEmployees={(newEmps) => setEmployees(newEmps)}
            onShowNotification={showNotification}
            lang={lang}
          />
        )}

        {/* Tab 1: Proxy Profiles Management with IP & Reset Link Columns */}
        {activeTab === 'profiles' && (
          <ProfileList
            profiles={profiles}
            employees={employees}
            ipHistory={ipHistory}
            onAddIpChangeRecord={handleAddIpChangeRecord}
            onOpenDashboardSync={() => setIsDashboardSyncOpen(true)}
            onSelectActive={handleSelectActive}
            onEdit={(p) => {
              setEditingProfile(p);
              setIsModalOpen(true);
            }}
            onDelete={handleDeleteProfile}
            onClone={handleCloneProfile}
            onNew={() => {
              setEditingProfile(null);
              setIsModalOpen(true);
            }}
            onTest={handleTestProfile}
            onExport={handleExportJSON}
            onImportJson={handleImportJSON}
            onOpenBulkImport={() => setIsBulkImportOpen(true)}
            onLoadUserFarm={handleLoadUserFarm}
            onResetDefaults={handleResetDefaults}
            onUpdateProfile={handleUpdateProfile}
            onBulkUpdateProfiles={handleBulkUpdateProfiles}
            testingId={testingId}
            lang={lang}
          />
        )}

        {/* Tab 2: Request Tester & Inspector */}
        {activeTab === 'tester' && (
          <RequestTester
            activeProfile={activeProfile}
            lang={lang}
            logs={logs}
            onLogAdd={(log) => setLogs((prev) => [log, ...prev])}
            onClearLogs={() => setLogs([])}
          />
        )}

        {/* Tab 3: Config & Script Generator */}
        {activeTab === 'generator' && (
          <ConfigGenerator
            activeProfile={activeProfile}
            lang={lang}
          />
        )}

        {/* Tab 4: LAN Troubleshooter & Access Guide */}
        {activeTab === 'troubleshooter' && (
          <Troubleshooter
            lang={lang}
            targetUrl={activeProfile?.targetUrl || 'http://192.168.1.27/home'}
          />
        )}

        {/* Tab 5: Web Mirror */}
        {activeTab === 'mirror' && (
          <WebMirror
            activeProfile={activeProfile}
            lang={lang}
          />
        )}
      </main>

      {/* Profile Create / Edit Modal */}
      <ProfileModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProfile(null);
        }}
        onSave={handleSaveProfile}
        initialProfile={editingProfile}
        employees={employees}
        lang={lang}
      />

      {/* Bulk Import Modal for Paste List */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={handleBulkImport}
        lang={lang}
      />

      {/* Home Dashboard Sync & Monitor Modal (Soi Trang Chủ 192.168.1.27) */}
      <HomeDashboardSyncModal
        isOpen={isDashboardSyncOpen}
        onClose={() => setIsDashboardSyncOpen(false)}
        profiles={profiles}
        ipHistory={ipHistory}
        onClearHistory={() => setIpHistory([])}
        onApplyIps={handleApplyDashboardIps}
        onShowNotification={showNotification}
        lang={lang}
      />

      {/* Vercel Deploy & Connect Modal */}
      <VercelDeployModal
        isOpen={isVercelDeployOpen}
        onClose={() => setIsVercelDeployOpen(false)}
        lang={lang}
      />

      {/* Clean Footer */}
      <footer className="border-t border-neutral-900 py-6 px-4 lg:px-8 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span>ProxySwitcher Pro</span>
            <span className="mx-2">·</span>
            <span>Target: http://192.168.1.27/home</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-neutral-400">
            <span>Quản Lý & Chia IP Nhân Viên</span>
            <span>·</span>
            <button
              onClick={() => setIsVercelDeployOpen(true)}
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 116 100" fill="currentColor">
                <path d="M57.5 0L115 100H0L57.5 0Z" />
              </svg>
              <span>{lang === 'vi' ? 'Kết nối Vercel' : 'Deploy to Vercel'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

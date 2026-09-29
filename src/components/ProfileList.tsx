import React, { useState, useEffect } from 'react';
import { ProxyProfile, Employee, Language, IpChangeRecord } from '../types';
import {
  Plus,
  Check,
  Play,
  Edit2,
  Copy,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Activity,
  RotateCw,
  ExternalLink,
  Search,
  CheckSquare,
  Square,
  Zap,
  Timer,
  LayoutList,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  Users,
  AlertCircle,
  Globe,
  Monitor,
  Radio,
  History,
} from 'lucide-react';
import {
  triggerResetUrl,
  runBatchResetWithSingleWindow,
  checkCurrentPublicIp,
  probePortPublicIp,
  getCarrierInfo,
  generateRealisticCellularIp,
  getSavedResetMethod,
  saveResetMethod,
  ResetMethod,
} from '../utils/proxyReset';

interface ProfileListProps {
  profiles: ProxyProfile[];
  employees?: Employee[];
  ipHistory?: IpChangeRecord[];
  onAddIpChangeRecord?: (record: IpChangeRecord) => void;
  onOpenDashboardSync?: () => void;
  onSelectActive: (id: string) => void;
  onEdit: (profile: ProxyProfile) => void;
  onDelete: (id: string) => void;
  onClone: (profile: ProxyProfile) => void;
  onNew: () => void;
  onTest: (profile: ProxyProfile) => void;
  onExport: () => void;
  onImportJson: () => void;
  onOpenBulkImport: () => void;
  onLoadUserFarm: () => void;
  onResetDefaults: () => void;
  onUpdateProfile: (updated: ProxyProfile) => void;
  onBulkUpdateProfiles: (updated: ProxyProfile[]) => void;
  testingId: string | null;
  lang: Language;
}

export const ProfileList: React.FC<ProfileListProps> = ({
  profiles,
  employees = [],
  ipHistory = [],
  onAddIpChangeRecord,
  onOpenDashboardSync,
  onSelectActive,
  onEdit,
  onDelete,
  onClone,
  onNew,
  onTest,
  onExport,
  onImportJson,
  onOpenBulkImport,
  onLoadUserFarm,
  onResetDefaults,
  onUpdateProfile,
  onBulkUpdateProfiles,
  testingId,
  lang,
}) => {
  const isVi = lang === 'vi';

  // Table view vs card view
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<'all' | 'unassigned' | string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset method & blocker detection
  const [resetMethod, setResetMethod] = useState<ResetMethod>(getSavedResetMethod);
  const [popupBlockedWarning, setPopupBlockedWarning] = useState(false);

  // Live IP tracking
  const [currentPublicIp, setCurrentPublicIp] = useState<string | null>(null);
  const [isCheckingIp, setIsCheckingIp] = useState(false);
  const [checkingPortIds, setCheckingPortIds] = useState<Set<string>>(new Set());
  const [lastRotationNotice, setLastRotationNotice] = useState<{
    port: number;
    oldIp: string;
    newIp: string;
    time: string;
    carrier: string;
  } | null>(null);

  // Reset tracking states
  const [resettingIds, setResettingIds] = useState<Set<string>>(new Set());
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-rotate interval
  const [autoRotateMinutes, setAutoRotateMinutes] = useState<number>(0);
  const [autoRotateCountdown, setAutoRotateCountdown] = useState<number>(0);
  const [isBulkResetting, setIsBulkResetting] = useState(false);

  // Fetch initial IP
  useEffect(() => {
    checkCurrentPublicIp().then((ip) => {
      if (ip) setCurrentPublicIp(ip);
    });
  }, []);

  // Tick cooldowns every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((prev) => {
        let changed = false;
        const next: Record<string, number> = {};
        for (const [id, count] of Object.entries(prev)) {
          if (count > 1) {
            next[id] = count - 1;
            changed = true;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto rotate schedule
  useEffect(() => {
    if (autoRotateMinutes <= 0) {
      setAutoRotateCountdown(0);
      return;
    }

    setAutoRotateCountdown(autoRotateMinutes * 60);

    const countdownInterval = setInterval(() => {
      setAutoRotateCountdown((prev) => {
        if (prev <= 1) {
          handleResetAll();
          return autoRotateMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [autoRotateMinutes]);

  const handleMethodChange = (m: ResetMethod) => {
    setResetMethod(m);
    saveResetMethod(m);
  };

  const handleManualCheckIp = async () => {
    setIsCheckingIp(true);
    const ip = await checkCurrentPublicIp();
    setIsCheckingIp(false);
    if (ip) setCurrentPublicIp(ip);
  };

  // Check single port's live WAN IP
  const handleCheckSinglePort = async (profile: ProxyProfile) => {
    setCheckingPortIds((prev) => new Set(prev).add(profile.id));
    const newIp = await probePortPublicIp(profile.port, profile.host, profile.publicIp);
    const isDiff = !!profile.publicIp && profile.publicIp !== newIp;
    setCheckingPortIds((prev) => {
      const next = new Set(prev);
      next.delete(profile.id);
      return next;
    });

    onUpdateProfile({
      ...profile,
      publicIp: newIp,
      previousIp: isDiff ? profile.publicIp : profile.previousIp,
      ipChangeStatus: isDiff ? 'changed' : 'idle',
      lastIpChangedAt: isDiff ? Date.now() : profile.lastIpChangedAt,
    });
  };

  // Check all ports sequentially
  const handleCheckAllPorts = async () => {
    setIsCheckingIp(true);
    const updated = [...profiles];
    for (let i = 0; i < updated.length; i++) {
      const p = updated[i];
      if (p.protocol !== 'direct') {
        const newIp = await probePortPublicIp(p.port, p.host, p.publicIp);
        updated[i] = {
          ...p,
          publicIp: newIp,
          ipChangeStatus: 'idle',
        };
      }
    }
    onBulkUpdateProfiles(updated);
    setIsCheckingIp(false);
  };

  // Protocol styles
  const protocolBadges: Record<string, { label: string; bg: string; text: string }> = {
    direct: { label: 'DIRECT', bg: 'bg-emerald-950/60 border-emerald-800/60', text: 'text-emerald-400' },
    http: { label: 'HTTP', bg: 'bg-blue-950/60 border-blue-800/60', text: 'text-blue-400' },
    https: { label: 'HTTPS', bg: 'bg-cyan-950/60 border-cyan-800/60', text: 'text-cyan-400' },
    socks4: { label: 'SOCKS4', bg: 'bg-purple-950/60 border-purple-800/60', text: 'text-purple-400' },
    socks5: { label: 'SOCKS5', bg: 'bg-indigo-950/60 border-indigo-800/60', text: 'text-indigo-400' },
    reverse: { label: 'REVERSE', bg: 'bg-amber-950/60 border-amber-800/60', text: 'text-amber-400' },
    tunnel: { label: 'TUNNEL', bg: 'bg-sky-950/60 border-sky-800/60', text: 'text-sky-400' },
  };

  // Filter profiles
  const filteredProfiles = profiles.filter((p) => {
    if (employeeFilter !== 'all') {
      if (employeeFilter === 'unassigned') {
        if (p.assignedEmployeeId) return false;
      } else if (p.assignedEmployeeId !== employeeFilter) {
        return false;
      }
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.host.toLowerCase().includes(term) ||
      p.port.toString().includes(term) ||
      (p.publicIp && p.publicIp.toLowerCase().includes(term)) ||
      (p.resetUrl && p.resetUrl.toLowerCase().includes(term))
    );
  });

  // Single Reset trigger with live IP verification!
  const handleResetSingle = async (profile: ProxyProfile) => {
    if (!profile.resetUrl || resettingIds.has(profile.id) || (cooldowns[profile.id] && cooldowns[profile.id] > 0)) {
      return;
    }

    const oldIp = profile.publicIp || generateRealisticCellularIp(profile.port);

    // 1. Immediately indicate reset in progress
    onUpdateProfile({
      ...profile,
      previousIp: oldIp,
      ipChangeStatus: 'changing',
      lastResetTime: Date.now(),
      resetStatus: 'resetting',
      resetMessage: 'Đang gửi lệnh reset...',
    });

    setResettingIds((prev) => new Set(prev).add(profile.id));

    // 2. Trigger the reset URL to local device
    const result = await triggerResetUrl(profile.resetUrl, resetMethod);

    setResettingIds((prev) => {
      const next = new Set(prev);
      next.delete(profile.id);
      return next;
    });

    if (result.popupBlocked) {
      setPopupBlockedWarning(true);
    } else {
      setPopupBlockedWarning(false);
    }

    // 3. Set 12s cooldown for 4G modem reconnection
    setCooldowns((prev) => ({
      ...prev,
      [profile.id]: 12,
    }));

    // 4. Auto re-verify and update with new WAN IP after reconnection duration
    setTimeout(async () => {
      const newIp = await probePortPublicIp(profile.port, profile.host, oldIp);
      const isDiff = newIp !== oldIp;
      const carrier = getCarrierInfo(newIp);

      onUpdateProfile({
        ...profile,
        publicIp: newIp,
        previousIp: oldIp,
        ipChangeStatus: isDiff ? 'changed' : 'duplicate',
        lastIpChangedAt: Date.now(),
        lastResetTime: Date.now(),
        resetStatus: result.success ? 'success' : 'error',
        resetMessage: isDiff ? `Đã đổi sang IP mới: ${newIp}` : 'IP chưa thay đổi',
      });

      setLastRotationNotice({
        port: profile.port,
        oldIp,
        newIp,
        time: new Date().toLocaleTimeString(),
        carrier: carrier.name,
      });

      if (onAddIpChangeRecord) {
        onAddIpChangeRecord({
          id: `change-${Date.now()}-${profile.port}`,
          port: profile.port,
          oldIp,
          newIp,
          timestamp: Date.now(),
          isDifferent: isDiff,
          employeeName: employees.find((e) => e.id === profile.assignedEmployeeId)?.name,
        });
      }
    }, 8500);
  };

  // Bulk Reset for selected
  const handleResetSelected = async () => {
    const toReset = profiles.filter((p) => selectedIds.has(p.id) && p.resetUrl);
    if (toReset.length === 0 || isBulkResetting) return;

    setIsBulkResetting(true);
    setPopupBlockedWarning(false);

    const urls = toReset.map((p) => p.resetUrl).filter((u): u is string => !!u);

    // Save previous IPs
    const oldIpMap: Record<string, string> = {};
    toReset.forEach((p) => {
      oldIpMap[p.id] = p.publicIp || generateRealisticCellularIp(p.port);
    });

    onBulkUpdateProfiles(
      profiles.map((p) =>
        selectedIds.has(p.id)
          ? {
              ...p,
              previousIp: oldIpMap[p.id],
              ipChangeStatus: 'changing',
              lastResetTime: Date.now(),
              resetStatus: 'resetting',
            }
          : p
      )
    );

    if (resetMethod === 'popup') {
      const res = await runBatchResetWithSingleWindow(urls, (idx, total, currentUrl) => {
        const matched = toReset.find((p) => p.resetUrl === currentUrl);
        if (matched) {
          setCooldowns((prev) => ({ ...prev, [matched.id]: 12 }));
        }
      });
      if (res.popupBlocked) setPopupBlockedWarning(true);
    } else {
      for (const profile of toReset) {
        if (profile.resetUrl) {
          await triggerResetUrl(profile.resetUrl, resetMethod);
          setCooldowns((prev) => ({ ...prev, [profile.id]: 12 }));
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    setIsBulkResetting(false);

    // Verify all selected after 9s
    setTimeout(async () => {
      const now = Date.now();
      const updated = await Promise.all(
        profiles.map(async (p) => {
          if (selectedIds.has(p.id)) {
            const oldIp = oldIpMap[p.id] || p.publicIp;
            const newIp = await probePortPublicIp(p.port, p.host, oldIp);
            if (onAddIpChangeRecord) {
              onAddIpChangeRecord({
                id: `change-${now}-${p.port}`,
                port: p.port,
                oldIp: oldIp || '---',
                newIp,
                timestamp: now,
                isDifferent: newIp !== oldIp,
                employeeName: employees.find((e) => e.id === p.assignedEmployeeId)?.name,
              });
            }
            return {
              ...p,
              publicIp: newIp,
              previousIp: oldIp,
              ipChangeStatus: 'changed' as const,
              lastIpChangedAt: now,
              lastResetTime: now,
              resetStatus: 'success' as const,
            };
          }
          return p;
        })
      );
      onBulkUpdateProfiles(updated);
    }, 9000);
  };

  // Reset ALL
  const handleResetAll = async () => {
    const toReset = profiles.filter((p) => p.resetUrl);
    if (toReset.length === 0 || isBulkResetting) return;

    setIsBulkResetting(true);
    setPopupBlockedWarning(false);

    const oldIpMap: Record<string, string> = {};
    toReset.forEach((p) => {
      oldIpMap[p.id] = p.publicIp || generateRealisticCellularIp(p.port);
    });

    onBulkUpdateProfiles(
      profiles.map((p) =>
        p.resetUrl
          ? {
              ...p,
              previousIp: oldIpMap[p.id],
              ipChangeStatus: 'changing',
              lastResetTime: Date.now(),
              resetStatus: 'resetting',
            }
          : p
      )
    );

    const urls = toReset.map((p) => p.resetUrl).filter((u): u is string => !!u);

    if (resetMethod === 'popup') {
      const res = await runBatchResetWithSingleWindow(urls, (idx, total, currentUrl) => {
        const matched = toReset.find((p) => p.resetUrl === currentUrl);
        if (matched) {
          setCooldowns((prev) => ({ ...prev, [matched.id]: 12 }));
        }
      });
      if (res.popupBlocked) setPopupBlockedWarning(true);
    } else {
      for (const profile of toReset) {
        if (profile.resetUrl) {
          await triggerResetUrl(profile.resetUrl, resetMethod);
          setCooldowns((prev) => ({ ...prev, [profile.id]: 12 }));
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    setIsBulkResetting(false);

    // Update all profiles with fresh IPs after reconnection
    setTimeout(async () => {
      const now = Date.now();
      const updated = await Promise.all(
        profiles.map(async (p) => {
          if (p.resetUrl) {
            const oldIp = oldIpMap[p.id] || p.publicIp;
            const newIp = await probePortPublicIp(p.port, p.host, oldIp);
            if (onAddIpChangeRecord) {
              onAddIpChangeRecord({
                id: `change-${now}-${p.port}`,
                port: p.port,
                oldIp: oldIp || '---',
                newIp,
                timestamp: now,
                isDifferent: newIp !== oldIp,
                employeeName: employees.find((e) => e.id === p.assignedEmployeeId)?.name,
              });
            }
            return {
              ...p,
              publicIp: newIp,
              previousIp: oldIp,
              ipChangeStatus: 'changed' as const,
              lastIpChangedAt: now,
              lastResetTime: now,
              resetStatus: 'success' as const,
            };
          }
          return p;
        })
      );
      onBulkUpdateProfiles(updated);
    }, 9000);
  };

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProfiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProfiles.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-slate-900/85 backdrop-blur-md p-5 rounded-2xl border border-slate-700/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{isVi ? 'Bảng Quản Lý Proxy, Cột IP WAN & Link Reset' : 'Proxy Management & Live IP Table'}</span>
              <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-800">
                {profiles.length} {isVi ? 'cổng proxy' : 'ports'}
              </span>
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
            {isVi
              ? 'Hiển thị trực tiếp Cột IP WAN thực tế, so sánh IP Cũ ➔ Mới và Link Reset tương ứng cho từng cổng.'
              : 'Displays Live Outbound WAN IP, before/after diffs, and corresponding Reset Links.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-start xl:justify-end">
          {/* THE REQUESTED HOME DASHBOARD MONITOR BUTTON */}
          {onOpenDashboardSync && (
            <button
              onClick={onOpenDashboardSync}
              title={isVi ? 'Xem trực tiếp trang chủ http://192.168.1.27/home ngay trong ứng dụng' : 'Inspect live router dashboard'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg transition-colors shadow-sm ring-1 ring-cyan-400/40"
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-200" />
              <span>{isVi ? '🖥️ Soi Trang Chủ 192.168.1.27' : '🖥️ Live Home View'}</span>
            </button>
          )}

          {/* Quick Check All IPs */}
          <button
            onClick={handleCheckAllPorts}
            disabled={isCheckingIp}
            title={isVi ? 'Quét và làm mới toàn bộ dải IP WAN của 31 cổng' : 'Refresh all port IPs'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-800/70 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isCheckingIp ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isVi ? 'Kiểm tra dải IP' : 'Check IPs'}</span>
          </button>

          {/* Load Farm 31 Button */}
          <button
            onClick={onLoadUserFarm}
            title={isVi ? 'Khôi phục đúng 31 proxy từ cổng 4000 đến 4030 của bạn' : 'Load 31 User Proxy Farm'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/60 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isVi ? 'Nạp 31 Proxy (4000-4030)' : '31 Farm'}</span>
          </button>

          {/* Bulk Import button */}
          <button
            onClick={onOpenBulkImport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/70 rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isVi ? 'Dán danh sách' : 'Paste List'}</span>
          </button>

          {/* Add Profile */}
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isVi ? 'Thêm Proxy' : 'New Proxy'}</span>
          </button>

          {/* Export */}
          <button
            onClick={onExport}
            title={isVi ? 'Xuất danh sách JSON' : 'Export JSON'}
            className="p-2 text-neutral-300 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/70 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* View mode toggle */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            <button
              onClick={() => setViewMode('table')}
              title={isVi ? 'Chế độ Bảng đầy đủ cột' : 'Table View'}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'table'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">{isVi ? 'Bảng' : 'Table'}</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title={isVi ? 'Chế độ Thẻ lưới' : 'Card View'}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'cards'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">{isVi ? 'Thẻ' : 'Cards'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RECENT ROTATION NOTIFICATION BANNER */}
      {lastRotationNotice && (
        <div className="bg-emerald-950/80 border border-emerald-500/80 rounded-xl p-3.5 text-xs text-emerald-200 flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white">
                {isVi ? `✅ Cổng :${lastRotationNotice.port} đã đổi sang IP mới!` : `✅ Port :${lastRotationNotice.port} rotated successfully!`}
              </span>
              <span className="mx-2 text-neutral-500">|</span>
              <span className="font-mono text-neutral-400 line-through mr-1.5">{lastRotationNotice.oldIp}</span>
              <span className="text-emerald-400">➔</span>
              <span className="font-mono font-bold text-emerald-300 ml-1.5">{lastRotationNotice.newIp}</span>
              <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-900/60 border border-emerald-700/60 text-emerald-200">
                {lastRotationNotice.carrier}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 shrink-0">
            {lastRotationNotice.time}
          </span>
        </div>
      )}

      {/* POPUP BLOCKED WARNING BANNER */}
      {popupBlockedWarning && (
        <div className="bg-amber-950/80 border border-amber-500/80 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-3 shadow-md">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="font-bold text-amber-300">
              {isVi ? 'Trình duyệt đang chặn mở cửa sổ (Pop-up)' : 'Pop-up blocked'}
            </div>
            <p className="text-[11px] text-neutral-300">
              {isVi
                ? 'Để gửi lệnh đổi IP trực tiếp tới thiết bị LAN 192.168.1.27 mà không bị lỗi Mixed Content, vui lòng cho phép Pop-up trên thanh địa chỉ hoặc đổi cơ chế sang "Mở Tab Mới".'
                : 'Please allow pop-ups for this site or switch reset method to New Tab.'}
            </p>
          </div>
          <button
            onClick={() => handleMethodChange('newtab')}
            className="px-2.5 py-1 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-600 rounded shrink-0"
          >
            {isVi ? 'Dùng Mở Tab Mới' : 'Use New Tab'}
          </button>
        </div>
      )}

      {/* Engine & IP Status Toolbar */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Live Public IP Display */}
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-neutral-400">{isVi ? 'IP Mạng Ngoài Máy Bạn:' : 'Your Device IP:'}</span>
          <span className="font-mono font-bold text-cyan-300 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            {currentPublicIp || (isVi ? 'Đang kiểm tra...' : 'Checking...')}
          </span>
          <button
            onClick={handleManualCheckIp}
            disabled={isCheckingIp}
            title={isVi ? 'Kiểm tra lại IP Public' : 'Check IP'}
            className="p-1 text-neutral-400 hover:text-cyan-300 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isCheckingIp ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Engine switcher */}
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 whitespace-nowrap">{isVi ? 'Cơ chế gửi lệnh Reset:' : 'Reset Engine:'}</span>
          <select
            value={resetMethod}
            onChange={(e) => handleMethodChange(e.target.value as ResetMethod)}
            className="bg-neutral-950 border border-neutral-700 text-cyan-300 font-medium rounded px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="popup">{isVi ? 'Cửa sổ tự động (Runner - Tự đóng)' : 'Auto Popup Runner'}</option>
            <option value="newtab">{isVi ? 'Mở Tab Mới (Direct Tab)' : 'Open in New Tab'}</option>
            <option value="background">{isVi ? 'Chạy ngầm (Background Fetch)' : 'Background Fetch'}</option>
          </select>
        </div>
      </div>

      {/* Control & Batch Operations & Employee Filter Strip */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-neutral-950/60 p-3 rounded-lg border border-neutral-850 text-xs">
        {/* Search & Staff Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isVi ? 'Tìm theo port (VD: 4005), IP WAN, hoặc link reset...' : 'Search port, IP, or reset link...'}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Employee Filter */}
          {employees.length > 0 && (
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1 shrink-0">
              <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="bg-transparent text-neutral-200 text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-neutral-900 text-neutral-200">
                  {isVi ? 'Tất cả nhân viên' : 'All Staff'} ({profiles.length})
                </option>
                {employees.map((emp) => {
                  const count = profiles.filter((p) => p.assignedEmployeeId === emp.id).length;
                  return (
                    <option key={emp.id} value={emp.id} className="bg-neutral-900 text-neutral-200">
                      {emp.code} - {emp.name} ({count})
                    </option>
                  );
                })}
                <option value="unassigned" className="bg-neutral-900 text-neutral-400">
                  {isVi ? 'Chưa gán' : 'Unassigned'} ({profiles.filter((p) => !p.assignedEmployeeId).length})
                </option>
              </select>
            </div>
          )}
        </div>

        {/* Batch Reset Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={handleResetSelected}
              disabled={isBulkResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors shadow-xs disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isBulkResetting ? 'animate-spin' : ''}`} />
              <span>
                {isVi
                  ? `Đổi IP ${selectedIds.size} proxy đã chọn`
                  : `Reset ${selectedIds.size} selected`}
              </span>
            </button>
          )}

          <button
            onClick={handleResetAll}
            disabled={isBulkResetting}
            title={isVi ? 'Gửi lệnh đổi IP tuần tự cho tất cả proxy trong danh sách' : 'Reset all proxies in list'}
            className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-amber-200 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 rounded-md transition-colors disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${isBulkResetting ? 'animate-spin' : ''}`} />
            <span>{isVi ? 'Đổi IP tất cả' : 'Reset All'}</span>
          </button>

          {/* Auto rotate schedule dropdown */}
          <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-800">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-neutral-400 whitespace-nowrap">{isVi ? 'Tự đổi IP:' : 'Auto:'}</span>
            <select
              value={autoRotateMinutes}
              onChange={(e) => setAutoRotateMinutes(Number(e.target.value))}
              className="bg-transparent text-cyan-300 font-medium text-xs focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-neutral-900 text-neutral-300">{isVi ? 'Tắt' : 'Off'}</option>
              <option value={2} className="bg-neutral-900 text-neutral-300">2 {isVi ? 'phút' : 'min'}</option>
              <option value={5} className="bg-neutral-900 text-neutral-300">5 {isVi ? 'phút' : 'min'}</option>
              <option value={10} className="bg-neutral-900 text-neutral-300">10 {isVi ? 'phút' : 'min'}</option>
              <option value={15} className="bg-neutral-900 text-neutral-300">15 {isVi ? 'phút' : 'min'}</option>
              <option value={30} className="bg-neutral-900 text-neutral-300">30 {isVi ? 'phút' : 'min'}</option>
            </select>
            {autoRotateCountdown > 0 && (
              <span className="text-cyan-400 font-mono text-[11px] tabular-nums ml-1">
                ({Math.floor(autoRotateCountdown / 60)}:{(autoRotateCountdown % 60).toString().padStart(2, '0')})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/70 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400 font-medium">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      title={isVi ? 'Chọn tất cả' : 'Select all'}
                      className="text-neutral-400 hover:text-neutral-200"
                    >
                      {selectedIds.size === filteredProfiles.length && filteredProfiles.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-2 w-10 text-center">{isVi ? 'STT' : '#'}</th>
                  <th className="py-3 px-3 min-w-[120px]">{isVi ? 'Cổng Proxy' : 'Proxy Port'}</th>
                  {/* CỘT IP PROXY NỘI BỘ */}
                  <th className="py-3 px-3 min-w-[160px] text-cyan-300 font-semibold bg-cyan-950/20">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>{isVi ? 'CỘT ĐỊA CHỈ IP PROXY' : 'PROXY IP COLUMN'}</span>
                    </div>
                  </th>
                  {/* CỘT IP WAN MẠNG NGOÀI (PUBLIC IP) & TRẠNG THÁI ĐỔI */}
                  <th className="py-3 px-3 min-w-[230px] text-emerald-300 font-semibold bg-emerald-950/20 border-r border-neutral-800">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>{isVi ? 'IP WAN THỰC TẾ & KẾT QUẢ ĐỔI' : 'LIVE WAN IP & ROTATION STATUS'}</span>
                    </div>
                  </th>
                  {/* CỘT LINK RESET TƯƠNG ỨNG */}
                  <th className="py-3 px-3 min-w-[310px] text-amber-300 font-semibold bg-amber-950/20">
                    <div className="flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isVi ? 'CỘT LINK RESET TƯƠNG ỨNG' : 'CORRESPONDING RESET LINK'}</span>
                    </div>
                  </th>
                  {/* CỘT NHÂN VIÊN */}
                  <th className="py-3 px-3 min-w-[130px] text-neutral-300 font-medium">
                    {isVi ? 'Nhân viên phụ trách' : 'Assigned Staff'}
                  </th>
                  <th className="py-3 px-2 w-16 text-center">{isVi ? 'Ping' : 'Ping'}</th>
                  <th className="py-3 px-3 min-w-[100px] text-right pr-4">{isVi ? 'Thao tác' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-sans">
                {filteredProfiles.map((profile, index) => {
                  const badge = protocolBadges[profile.protocol] || protocolBadges.http;
                  const isCurrent = profile.isActive;
                  const isResetting = resettingIds.has(profile.id);
                  const cooldown = cooldowns[profile.id] || 0;
                  const isSelected = selectedIds.has(profile.id);
                  const isTesting = testingId === profile.id;
                  const proxyIpText =
                    profile.protocol === 'direct'
                      ? 'Direct LAN (192.168.1.27)'
                      : `${profile.host}:${profile.port}`;

                  const assignedEmp = employees.find((e) => e.id === profile.assignedEmployeeId);
                  const carrier = getCarrierInfo(profile.publicIp);
                  const isChanging = isResetting || cooldown > 0 || profile.ipChangeStatus === 'changing';

                  return (
                    <tr
                      key={profile.id}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-cyan-950/20 hover:bg-cyan-950/30'
                          : isSelected
                          ? 'bg-neutral-800/40 hover:bg-neutral-800/60'
                          : 'hover:bg-neutral-850/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => toggleSelectOne(profile.id)}
                          className="text-neutral-400 hover:text-neutral-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* STT */}
                      <td className="py-2.5 px-2 text-center font-mono text-neutral-500 text-xs">
                        {(index + 1).toString().padStart(2, '0')}
                      </td>

                      {/* Name & Port */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-semibold text-neutral-200">
                            Port {profile.port}
                          </span>
                          {isCurrent && (
                            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              <span className="hidden sm:inline">{isVi ? 'Đang dùng' : 'Active'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CỘT IP PROXY */}
                      <td className="py-2.5 px-3 bg-cyan-950/10">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-mono text-xs font-semibold text-cyan-200">
                            {proxyIpText}
                          </div>
                          <button
                            onClick={() => handleCopyText(proxyIpText, `ip-${profile.id}`)}
                            title={isVi ? 'Sao chép IP:Port' : 'Copy IP:Port'}
                            className="p-1 text-neutral-400 hover:text-cyan-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded transition-colors"
                          >
                            {copiedId === `ip-${profile.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* CỘT IP WAN MẠNG NGOÀI (PUBLIC IP) & KẾT QUẢ ĐỔI */}
                      <td className="py-2.5 px-3 bg-emerald-950/10 border-r border-neutral-800/40">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-emerald-300">
                                {profile.publicIp || '---'}
                              </span>
                              {carrier && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${carrier.bg} ${carrier.color} ${carrier.border}`}>
                                  {carrier.name}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleCheckSinglePort(profile)}
                              disabled={checkingPortIds.has(profile.id)}
                              title={isVi ? 'Kiểm tra IP thực tế hiện tại của cổng này' : 'Check live WAN IP'}
                              className="p-1 text-neutral-400 hover:text-emerald-300 bg-neutral-900 border border-neutral-800 rounded transition-colors"
                            >
                              <RotateCw className={`w-3 h-3 ${checkingPortIds.has(profile.id) ? 'animate-spin text-emerald-400' : ''}`} />
                            </button>
                          </div>

                          {/* Comparison diff or rotating status */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isChanging ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800 animate-pulse">
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                                <span>{isVi ? `Đang đổi IP (${cooldown}s)...` : `Rotating (${cooldown}s)...`}</span>
                              </span>
                            ) : profile.previousIp && profile.previousIp !== profile.publicIp ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>{isVi ? 'ĐÃ ĐỔI MỚI' : 'NEW IP'}</span>
                                <span className="text-[10px] text-neutral-500 font-mono line-through ml-0.5">
                                  {profile.previousIp}
                                </span>
                              </span>
                            ) : profile.publicIp ? (
                              <span className="text-[10px] text-neutral-500 font-mono">
                                {isVi ? 'Đang hoạt động' : 'Active'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* CỘT LINK RESET TƯƠNG ỨNG */}
                      <td className="py-2.5 px-3 bg-amber-950/10">
                        {profile.resetUrl ? (
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <button
                              onClick={() => handleResetSingle(profile)}
                              disabled={isResetting || cooldown > 0}
                              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors shrink-0 shadow-xs ${
                                cooldown > 0
                                  ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed border border-neutral-700'
                                  : isResetting
                                  ? 'bg-amber-700 text-white animate-pulse'
                                  : 'bg-amber-600 hover:bg-amber-500 text-white'
                              }`}
                            >
                              <RotateCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
                              <span>
                                {cooldown > 0
                                  ? `${isVi ? 'Chờ' : 'Wait'} ${cooldown}s`
                                  : isResetting
                                  ? (isVi ? 'Đang đổi...' : 'Resetting...')
                                  : (isVi ? 'Đổi IP' : 'Reset')}
                              </span>
                            </button>

                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span
                                className="font-mono text-[11px] text-amber-200/90 truncate max-w-[190px]"
                                title={profile.resetUrl}
                              >
                                {profile.resetUrl}
                              </span>

                              <button
                                onClick={() => handleCopyText(profile.resetUrl || '', `reset-${profile.id}`)}
                                title={isVi ? 'Sao chép Link Reset' : 'Copy Reset Link'}
                                className="p-1 text-neutral-400 hover:text-amber-300 bg-neutral-900 border border-neutral-800 rounded transition-colors shrink-0"
                              >
                                {copiedId === `reset-${profile.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>

                              <a
                                href={profile.resetUrl}
                                target="_blank"
                                rel="noreferrer"
                                title={isVi ? 'Mở trực tiếp link reset trong tab mới' : 'Open in new tab'}
                                className="p-1 text-amber-400 hover:text-amber-200 bg-neutral-900 border border-neutral-800 rounded transition-colors shrink-0"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {profile.lastResetTime && (
                              <span className="text-[10px] text-neutral-500 font-mono shrink-0 hidden xl:inline tabular-nums">
                                {new Date(profile.lastResetTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-[11px] italic">
                            {isVi ? '(Chưa có link reset)' : '(No reset link)'}
                          </span>
                        )}
                      </td>

                      {/* NHÂN VIÊN PHỤ TRÁCH */}
                      <td className="py-2.5 px-3">
                        {assignedEmp ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-950 border border-neutral-800"
                            style={{ color: assignedEmp.color }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: assignedEmp.color }}
                            />
                            <span className="truncate max-w-[110px]">{assignedEmp.name}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[11px] italic">
                            {isVi ? 'Chưa gán' : 'Unassigned'}
                          </span>
                        )}
                      </td>

                      {/* Ping / Latency */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {profile.latencyMs !== undefined ? (
                            <span className="font-mono text-emerald-400 text-xs font-medium tabular-nums">
                              {profile.latencyMs}ms
                            </span>
                          ) : (
                            <span className="text-neutral-500 text-xs">-</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {!isCurrent && (
                            <button
                              onClick={() => onSelectActive(profile.id)}
                              title={isVi ? 'Kích hoạt proxy này' : 'Activate proxy'}
                              className="p-1 text-cyan-400 hover:text-white bg-neutral-850 hover:bg-cyan-600 rounded transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onEdit(profile)}
                            title={isVi ? 'Sửa cấu hình' : 'Edit profile'}
                            className="p-1 text-neutral-400 hover:text-neutral-200 bg-neutral-850 hover:bg-neutral-800 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => onDelete(profile.id)}
                              title={isVi ? 'Xóa proxy' : 'Delete'}
                              className="p-1 text-neutral-500 hover:text-rose-400 bg-neutral-850 hover:bg-neutral-800 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((profile) => {
            const badge = protocolBadges[profile.protocol] || protocolBadges.http;
            const isCurrent = profile.isActive;
            const isResetting = resettingIds.has(profile.id);
            const cooldown = cooldowns[profile.id] || 0;
            const assignedEmp = employees.find((e) => e.id === profile.assignedEmployeeId);
            const carrier = getCarrierInfo(profile.publicIp);

            return (
              <div
                key={profile.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  isCurrent
                    ? 'bg-neutral-900/90 border-cyan-500/60 shadow-lg shadow-cyan-950/20'
                    : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                    <h4 className="text-sm font-semibold text-neutral-100">Port {profile.port}</h4>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>{isVi ? 'Đang dùng' : 'Active'}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-850">
                    <div className="text-[10px] text-neutral-500">{isVi ? 'IP Proxy Nội Bộ:' : 'Proxy Address:'}</div>
                    <div className="font-mono font-bold text-cyan-300 text-xs">
                      {profile.host}:{profile.port}
                    </div>
                  </div>

                  <div className="bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-850/60">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-emerald-400 font-semibold">{isVi ? 'IP WAN Thực Tế:' : 'Live WAN IP:'}</div>
                      {carrier && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border ${carrier.bg} ${carrier.color} ${carrier.border}`}>
                          {carrier.name}
                        </span>
                      )}
                    </div>
                    <div className="font-mono font-bold text-emerald-300 text-sm mt-0.5">
                      {profile.publicIp || '---'}
                    </div>
                    {profile.previousIp && profile.previousIp !== profile.publicIp && (
                      <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Đã đổi mới (Cũ: {profile.previousIp})</span>
                      </div>
                    )}
                  </div>

                  {profile.resetUrl && (
                    <div className="bg-amber-950/20 p-2.5 rounded-lg border border-amber-850/50 space-y-2">
                      <div className="text-[10px] text-amber-400 font-medium">{isVi ? 'Link Reset Tương Ứng:' : 'Reset Link:'}</div>
                      <div className="font-mono text-[11px] text-amber-200/90 truncate">{profile.resetUrl}</div>
                      <button
                        onClick={() => handleResetSingle(profile)}
                        disabled={isResetting || cooldown > 0}
                        className="w-full py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <RotateCw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
                        <span>
                          {cooldown > 0
                            ? `${isVi ? 'Chờ' : 'Wait'} ${cooldown}s`
                            : isResetting
                            ? (isVi ? 'Đang đổi...' : 'Resetting...')
                            : (isVi ? 'Đổi IP Này' : 'Reset')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Controls & Employee Badge */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center gap-2">
                    {assignedEmp && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-950 border border-neutral-800"
                        style={{ color: assignedEmp.color }}
                      >
                        <User className="w-3 h-3" />
                        <span>{assignedEmp.name}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isCurrent && (
                      <button
                        onClick={() => onSelectActive(profile.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-neutral-800 hover:bg-cyan-600 rounded transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        <span>{isVi ? 'Bật' : 'Use'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(profile)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-850 border border-neutral-800 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => onDelete(profile.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 bg-neutral-850 border border-neutral-800 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

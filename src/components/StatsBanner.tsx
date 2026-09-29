import React from 'react';
import { ProxyProfile, Employee, Language, ActiveTab } from '../types';
import { Radio, Users, Zap, RotateCw, Monitor, CheckCircle2, ArrowRight } from 'lucide-react';

interface StatsBannerProps {
  profiles: ProxyProfile[];
  employees: Employee[];
  activeProfile: ProxyProfile;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenDashboardSync: () => void;
  onQuickTest: () => void;
  isTesting: boolean;
  lang: Language;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  profiles,
  employees,
  activeProfile,
  activeTab,
  setActiveTab,
  onOpenDashboardSync,
  onQuickTest,
  isTesting,
  lang,
}) => {
  const isVi = lang === 'vi';

  // Count total resets today across employees
  const totalResetsToday = employees.reduce((acc, emp) => acc + (emp.resetCountToday || 0), 0);

  // Count assigned vs unassigned proxies
  const assignedCount = profiles.filter((p) => p.assignedEmployeeId).length;

  return (
    <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Stat 1: Total Proxies */}
      <div
        onClick={() => setActiveTab('profiles')}
        className={`group cursor-pointer rounded-xl p-4 border transition-all duration-200 relative overflow-hidden backdrop-blur-md ${
          activeTab === 'profiles'
            ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/30 ring-1 ring-cyan-500/30'
            : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700/80 hover:bg-neutral-900/90'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/90">
            {isVi ? 'Tổng Proxy Farm' : 'Total Farm Proxies'}
          </span>
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
            <Radio className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white tabular-nums">
            {profiles.length}
          </span>
          <span className="text-xs text-neutral-400 font-mono">
            {isVi ? 'cổng (4000-4030)' : 'ports'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isVi ? 'Đang hoạt động' : 'All ready'}
          </span>
          <span className="group-hover:translate-x-0.5 transition-transform text-cyan-400/80 flex items-center">
            {isVi ? 'Xem danh sách' : 'View'} <ArrowRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>

      {/* Stat 2: Active Proxy */}
      <div className="rounded-xl p-4 border bg-neutral-900/60 border-neutral-800/80 backdrop-blur-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90">
            {isVi ? 'Proxy Đang Kích Hoạt' : 'Active Proxy'}
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2 truncate">
          <span className="text-xl font-bold font-mono text-white tabular-nums">
            :{activeProfile.port}
          </span>
          <span className="text-xs font-semibold text-emerald-300 truncate">
            {activeProfile.name}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-neutral-400 font-mono truncate">
            {activeProfile.host}
          </span>
          {activeProfile.latencyMs !== undefined ? (
            <span className="font-mono text-emerald-400 font-bold tabular-nums">
              {activeProfile.latencyMs}ms
            </span>
          ) : (
            <button
              onClick={onQuickTest}
              disabled={isTesting}
              className="text-cyan-400 hover:text-cyan-300 font-medium underline decoration-cyan-500/40"
            >
              {isTesting ? (isVi ? 'Đang đo...' : 'Testing...') : (isVi ? 'Đo ping' : 'Ping')}
            </button>
          )}
        </div>
      </div>

      {/* Stat 3: Staff Assignment */}
      <div
        onClick={() => setActiveTab('staff')}
        className={`group cursor-pointer rounded-xl p-4 border transition-all duration-200 relative overflow-hidden backdrop-blur-md ${
          activeTab === 'staff'
            ? 'bg-purple-950/40 border-purple-500/50 shadow-md shadow-purple-950/30 ring-1 ring-purple-500/30'
            : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700/80 hover:bg-neutral-900/90'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400/90">
            {isVi ? 'Phân Chia Nhân Viên' : 'Staff Allocation'}
          </span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white tabular-nums">
            {employees.length}
          </span>
          <span className="text-xs text-neutral-400">
            {isVi ? 'nhân sự chia IP' : 'staff members'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
          <span>
            {isVi ? `Đã gán ${assignedCount}/${profiles.length} cổng` : `${assignedCount}/${profiles.length} assigned`}
          </span>
          <span className="group-hover:translate-x-0.5 transition-transform text-purple-400/80 flex items-center">
            {isVi ? 'Vào đổi IP' : 'Portal'} <ArrowRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>

      {/* Stat 4: IP Resets Today & Router Monitor Link */}
      <div
        onClick={onOpenDashboardSync}
        className="group cursor-pointer rounded-xl p-4 border bg-neutral-900/60 border-neutral-800/80 hover:border-amber-500/50 hover:bg-neutral-900/90 transition-all duration-200 backdrop-blur-md relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90">
            {isVi ? 'Đổi IP Hôm Nay' : 'Resets Today'}
          </span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
            <RotateCw className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {totalResetsToday}
          </span>
          <span className="text-xs text-neutral-400 font-mono">
            {isVi ? 'lần đổi thành công' : 'resets logged'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="text-cyan-400 flex items-center gap-1 font-medium">
            <Monitor className="w-3 h-3" />
            <span>{isVi ? 'Soi 192.168.1.27' : 'Monitor Router'}</span>
          </span>
          <span className="group-hover:translate-x-0.5 transition-transform text-amber-400/80 flex items-center">
            {isVi ? 'Mở soi' : 'Open'} <ArrowRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </div>
    </div>
  );
};

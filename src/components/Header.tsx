import React from 'react';
import { ActiveTab, Language, ProxyProfile, ThemeMode } from '../types';
import {
  Globe,
  Radio,
  Sparkles,
  Terminal,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Users,
  Monitor,
  Palette,
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeProfile?: ProxyProfile;
  lang: Language;
  setLang: (lang: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onQuickTest: () => void;
  onOpenDashboardSync?: () => void;
  onOpenVercelDeploy?: () => void;
  isTesting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeProfile,
  lang,
  setLang,
  theme,
  setTheme,
  onQuickTest,
  onOpenDashboardSync,
  onOpenVercelDeploy,
  isTesting,
}) => {
  const isVi = lang === 'vi';

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'profiles',
      label: isVi ? 'Cấu hình Proxy' : 'Proxy Profiles',
      icon: <Radio className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'staff',
      label: isVi ? 'Chia IP Nhân Viên' : 'Staff & Self-Reset',
      icon: <Users className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'tester',
      label: isVi ? 'Kiểm tra & Gửi Request' : 'Inspector & Relay',
      icon: <Terminal className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'generator',
      label: isVi ? 'Sinh mã Cấu hình' : 'Config Generator',
      icon: <Sparkles className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'troubleshooter',
      label: isVi ? 'Hướng dẫn kết nối LAN' : 'LAN Access Guide',
      icon: <ShieldAlert className="w-4 h-4 mr-1.5" />,
    },
    {
      id: 'mirror',
      label: isVi ? 'Xem trước Web' : 'Web Mirror',
      icon: <Globe className="w-4 h-4 mr-1.5" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-md px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-cyan-500/25">
            PX
          </div>
          <a
            href="#profiles"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('profiles');
            }}
            className="text-base font-semibold tracking-tight text-slate-100 hover:text-white transition-colors"
          >
            ProxySwitcher Pro
          </a>
        </div>

        {/* Zone 2: Clean text navigation links / segmented bar */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800/80 backdrop-blur-xs">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-neutral-800 text-cyan-400 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Active Profile Info */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onOpenDashboardSync && (
            <button
              onClick={onOpenDashboardSync}
              title={isVi ? 'Soi trực tiếp trang chủ 192.168.1.27' : 'View live router dashboard'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg transition-colors shadow-sm ring-1 ring-cyan-400/40"
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-200" />
              <span className="hidden sm:inline">{isVi ? 'Soi Trang Chủ' : 'Live Router'}</span>
            </button>
          )}

          {onOpenVercelDeploy && (
            <button
              onClick={onOpenVercelDeploy}
              title={isVi ? 'Kết nối & Triển khai lên Vercel' : 'Deploy & Connect to Vercel'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black border border-slate-700 hover:border-slate-500 rounded-lg transition-colors shadow-sm ring-1 ring-white/10"
            >
              <svg width="11" height="11" viewBox="0 0 116 100" fill="currentColor">
                <path d="M57.5 0L115 100H0L57.5 0Z" />
              </svg>
              <span>Vercel</span>
            </button>
          )}

          {activeProfile && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-md text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-neutral-400">{isVi ? 'Đang dùng:' : 'Active:'}</span>
              <span className="text-neutral-200 font-medium truncate max-w-[140px]">
                {activeProfile.name}
              </span>
            </div>
          )}

          <button
            onClick={onQuickTest}
            disabled={isTesting}
            title={isVi ? 'Kiểm tra ping tới 192.168.1.27' : 'Ping 192.168.1.27'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 rounded-md hover:bg-cyan-900/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">{isVi ? 'Test kết nối' : 'Test Ping'}</span>
          </button>

          {/* Eye-Comfort Theme Selector (Màu Mát Mắt) */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs shadow-sm">
            <Palette className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeMode)}
              title={isVi ? 'Chọn tông màu nền mát mắt chống mỏi' : 'Select eye-comfort theme'}
              className="bg-transparent text-emerald-300 font-bold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="mint" className="bg-[#0b1a17] text-emerald-300">
                🌿 {isVi ? 'Xanh Thảo Mộc (Mát mắt nhất)' : 'Mint Sage (Most Soothing)'}
              </option>
              <option value="ocean" className="bg-[#0c1726] text-sky-300">
                🌊 {isVi ? 'Xanh Biển Êm Dịu' : 'Deep Ocean Cool'}
              </option>
              <option value="nordic" className="bg-[#101724] text-blue-200">
                ❄️ {isVi ? 'Xám Băng Bắc Cực' : 'Nordic Ice Slate'}
              </option>
              <option value="sepia" className="bg-[#171311] text-amber-200">
                ☕ {isVi ? 'Nâu Ấm Lọc Ánh Sáng Xanh' : 'Warm Sepia Night'}
              </option>
              <option value="light" className="bg-[#f3f6f9] text-slate-900">
                ☀️ {isVi ? 'Sáng Sương Mai Mát Dịu' : 'Soft Daylight'}
              </option>
              <option value="charcoal" className="bg-[#09090b] text-neutral-300">
                🌑 {isVi ? 'Đen OLED Tối Giản' : 'Charcoal Dark'}
              </option>
            </select>
          </div>

          <button
            onClick={() => setLang(isVi ? 'en' : 'vi')}
            className="px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-md transition-colors"
            title="Chuyển ngôn ngữ / Switch language"
          >
            {isVi ? 'EN' : 'VI'}
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center gap-1 mt-2.5 pt-2 border-t border-neutral-800 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                isActive
                  ? 'bg-neutral-800 text-cyan-400'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};

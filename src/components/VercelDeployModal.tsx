import React, { useState } from 'react';
import {
  X,
  Check,
  Copy,
  ExternalLink,
  Layers,
  Terminal,
  FileCode,
  ShieldCheck,
  CloudLightning,
  Github,
  Globe,
  Info,
} from 'lucide-react';
import { Language } from '../types';

interface VercelDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const VercelDeployModal: React.FC<VercelDeployModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const isVi = lang === 'vi';
  const [activeTab, setActiveTab] = useState<'github' | 'cli' | 'config' | 'notes'>('github');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const gitCommands = `git init
git add .
git commit -m "feat: setup ProxySwitcher Pro for Vercel"
git branch -M main
# Thay bằng link repo GitHub của bạn:
git remote add origin https://github.com/USERNAME/proxyswitcher-pro.git
git push -u origin main`;

  const cliCommands = `npm install -g vercel
vercel login
vercel --prod`;

  const vercelJsonSample = `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black border border-slate-700 flex items-center justify-center text-white font-bold shadow-md">
              {/* Vercel triangle icon */}
              <svg width="18" height="18" viewBox="0 0 116 100" fill="currentColor">
                <path d="M57.5 0L115 100H0L57.5 0Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isVi ? 'Kết Nối & Triển Khai Vercel' : 'Connect & Deploy to Vercel'}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {isVi ? 'Đã sẵn sàng' : 'Ready'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isVi
                  ? 'Toàn bộ cấu hình vercel.json & Serverless API relay đã được cài đặt hoàn tất'
                  : 'vercel.json and Serverless API proxy functions are configured and ready'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('github')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'github'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>{isVi ? '1. Qua GitHub (Khuyên dùng)' : '1. Via GitHub (Recommended)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('cli')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'cli'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{isVi ? '2. Qua Vercel CLI' : '2. Via Vercel CLI'}</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>{isVi ? '3. File Cấu Hình' : '3. Config Files'}</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>{isVi ? '4. Lưu ý mạng LAN' : '4. LAN & Notes'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-300 flex-1">
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-950/40 to-cyan-950/40 border border-cyan-800/40 rounded-xl p-4 flex items-start gap-3">
                <CloudLightning className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm">
                    {isVi ? 'Kết nối tự động & Miễn phí qua Vercel + GitHub' : 'Automated & Free Deployment'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {isVi
                      ? 'Khi kết nối kho GitHub với Vercel, mỗi lần bạn push code lên, Vercel sẽ tự động build và cập nhật website chỉ trong 20-30 giây với SSL HTTPS miễn phí trọn đời.'
                      : 'Connecting GitHub to Vercel provides instant CI/CD. Every push automatically rebuilds and deploys your web app with free lifetime HTTPS.'}
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="border border-slate-800 bg-slate-950/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h5 className="font-semibold text-white text-xs">
                      {isVi ? 'Đẩy code lên GitHub cá nhân của bạn' : 'Push code to your GitHub repo'}
                    </h5>
                  </div>
                  <button
                    onClick={() => handleCopy(gitCommands, 'git')}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                  >
                    {copiedKey === 'git' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">{isVi ? 'Đã sao chép!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>{isVi ? 'Sao chép lệnh' : 'Copy commands'}</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-black/70 p-3 rounded-lg text-xs font-mono text-cyan-300 border border-slate-800/80 overflow-x-auto whitespace-pre">
                  {gitCommands}
                </pre>
              </div>

              {/* Step 2 */}
              <div className="border border-slate-800 bg-slate-950/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h5 className="font-semibold text-white text-xs">
                    {isVi ? 'Mở Vercel và bấm Import Repo' : 'Open Vercel & Import Repo'}
                  </h5>
                </div>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  {isVi
                    ? 'Truy cập trang tạo dự án mới của Vercel, chọn repo GitHub bạn vừa đẩy lên, Vercel sẽ tự động điền Vite và lệnh build.'
                    : 'Visit the Vercel project import page, choose your GitHub repository, and Vercel will automatically apply Vite settings.'}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="https://vercel.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all ring-1 ring-cyan-400/40"
                  >
                    <span>{isVi ? 'Mở Trang Import Vercel' : 'Open Vercel Import'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href="https://vercel.com/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                  >
                    <span>{isVi ? 'Đăng nhập Vercel' : 'Vercel Login'}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border border-slate-800 bg-slate-950/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h5 className="font-semibold text-white text-xs">
                    {isVi ? 'Bấm Deploy và nhận đường link website' : 'Click Deploy & get live link'}
                  </h5>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isVi
                    ? 'Quá trình build mất khoảng 20-40 giây. Bạn sẽ nhận được link domain dạng: https://proxyswitcher-pro.vercel.app để truy cập ở bất cứ đâu trên điện thoại hay máy tính!'
                    : 'Build takes about 20-40 seconds. You will receive a live URL like https://proxyswitcher-pro.vercel.app accessible anywhere!'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-white text-xs flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    {isVi ? 'Triển khai trực tiếp từ Terminal / Command Prompt' : 'Deploy directly via Terminal'}
                  </h5>
                  <button
                    onClick={() => handleCopy(cliCommands, 'cli')}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                  >
                    {copiedKey === 'cli' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">{isVi ? 'Đã chép!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>{isVi ? 'Sao chép lệnh' : 'Copy commands'}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  {isVi
                    ? 'Chạy 3 dòng lệnh sau trên máy tính của bạn trong thư mục dự án:'
                    : 'Run these 3 commands in the project root on your computer:'}
                </p>
                <pre className="bg-black/80 p-3 rounded-lg text-xs font-mono text-emerald-400 border border-slate-800 overflow-x-auto whitespace-pre">
                  {cliCommands}
                </pre>
                <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                  <p>• <strong>vercel login:</strong> Đăng nhập bằng Email, GitHub hoặc Google.</p>
                  <p>• <strong>vercel --prod:</strong> Build và phát hành phiên bản chính thức lên domain Vercel.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs mb-1">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span>vercel.json</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isVi
                      ? 'Đã cấu hình định tuyến SPA (Single Page Application) và chuyển hướng API serverless.'
                      : 'SPA rewrites and serverless function routes configured.'}
                  </p>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs mb-1">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>/api/proxy.js & /api/download-pac.js</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isVi
                      ? 'Các hàm serverless chạy trực tiếp trên Vercel Edge/Node để relay proxy và cấp file PAC.'
                      : 'Edge/Node serverless functions to relay proxy and generate PAC configs.'}
                  </p>
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-950/70 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">
                    {isVi ? 'Nội dung file vercel.json hiện tại:' : 'Current vercel.json content:'}
                  </span>
                  <button
                    onClick={() => handleCopy(vercelJsonSample, 'vjson')}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700"
                  >
                    {copiedKey === 'vjson' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'vjson' ? (isVi ? 'Đã sao chép' : 'Copied') : (isVi ? 'Sao chép' : 'Copy')}</span>
                  </button>
                </div>
                <pre className="bg-black/80 p-3 rounded-lg text-xs font-mono text-cyan-200 border border-slate-800 overflow-x-auto max-h-48">
                  {vercelJsonSample}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="border border-amber-500/40 bg-amber-950/20 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-amber-300 text-xs">
                      {isVi ? 'Lưu ý khi ping địa chỉ IP LAN 192.168.1.27 từ Vercel' : 'Notice on 192.168.1.27 LAN IP on Vercel'}
                    </h5>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {isVi
                        ? '192.168.1.27 là địa chỉ mạng riêng (LAN RFC 1918) nằm tại nhà hoặc văn phòng bạn. Máy chủ Vercel nằm trên cloud quốc tế nên không thể ping trực tiếp vào mạng dây/wifi nhà bạn trừ khi:'
                        : '192.168.1.27 is a private LAN address. Global Vercel servers cannot directly route into your home WiFi unless:'}
                    </p>
                    <ul className="text-xs text-slate-300 mt-2 space-y-1 list-disc list-inside">
                      <li>{isVi ? 'Trình duyệt của bạn mở giao diện Vercel và dùng script PAC / Extension kết nối trực tiếp.' : 'Your browser uses the PAC script or extension locally.'}</li>
                      <li>{isVi ? 'Dùng Cloudflare Tunnel hoặc Ngrok để map 192.168.1.27 ra một tên miền công khai.' : 'You use Cloudflare Tunnel or Ngrok to expose 192.168.1.27.'}</li>
                      <li>{isVi ? 'Phần quản lý danh sách nhân viên, chia cổng, ghi nhớ cấu hình, đổi IP proxy xoay vòng trên Vercel đều chạy hoàn hảo 100%!' : 'Employee manager, proxy rotation, port split, and PAC downloads work 100% on Vercel!'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>
              {isVi ? 'Framework: Vite React | Ready for Vercel' : 'Framework: Vite React | Ready for Vercel'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              {isVi ? 'Đóng' : 'Close'}
            </button>
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-md transition-all ring-1 ring-cyan-400/40"
            >
              <span>{isVi ? 'Mở Vercel để Deploy' : 'Open Vercel to Deploy'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

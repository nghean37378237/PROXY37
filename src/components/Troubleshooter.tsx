import React from 'react';
import { Language } from '../types';
import { ShieldAlert, CheckCircle2, AlertCircle, ArrowRight, Bookmark, ExternalLink, Network, Lock, Cpu, Globe } from 'lucide-react';

interface TroubleshooterProps {
  lang: Language;
  targetUrl: string;
}

export const Troubleshooter: React.FC<TroubleshooterProps> = ({
  lang,
  targetUrl,
}) => {
  const isVi = lang === 'vi';

  const bookmarkletCode = `javascript:(function(){window.open('${targetUrl}','_blank');})();`;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-100">
              {isVi ? 'Hướng dẫn Định tuyến & Truy cập Mạng LAN (192.168.1.27/home)' : 'LAN Routing & Troubleshooting Guide'}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {isVi
                ? 'Giải quyết các vấn đề chặn Mixed-Content, cấm Private Network Access của Chrome, và các cách đổi Proxy an toàn.'
                : 'Overcome Mixed-Content blocking, Chrome Private Network Access (PNA), and setup secure routing.'}
            </p>
          </div>
        </div>
      </div>

      {/* Network Topology Visualizer */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-neutral-200 mb-3 flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <span>{isVi ? 'Sơ đồ luồng dữ liệu khi thay đổi Proxy' : 'Proxy Routing Architecture'}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center my-4">
          <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <p className="text-xs font-semibold text-neutral-200">
              {isVi ? 'Trình duyệt / Ứng dụng của bạn' : 'Client Browser'}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Gửi yêu cầu tới 192.168.1.27/home
            </p>
          </div>

          <div className="p-4 bg-neutral-950 rounded-lg border border-cyan-900/60 relative">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <p className="text-xs font-semibold text-cyan-300">
              {isVi ? 'ProxySwitcher / Reverse Proxy' : 'Proxy Relay Gateway'}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Đảo header, chuyển tiếp cổng hoặc tunnel SOCKS5
            </p>
          </div>

          <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <p className="text-xs font-semibold text-emerald-300 font-mono">
              http://192.168.1.27/home
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Thiết bị LAN (Router, ESP32, Camera, Server)
            </p>
          </div>
        </div>
      </div>

      {/* Common Hurdles & Solutions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Issue 1: Mixed Content & Private Network Access */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400" />
            <h4 className="text-sm font-semibold text-neutral-200">
              1. {isVi ? 'Lỗi Mixed-Content & PNA trên Chrome' : 'Chrome Mixed-Content & PNA'}
            </h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {isVi
              ? 'Trình duyệt hiện đại (Chrome/Edge) mặc định chặn các trang web HTTPS tải ngầm các link HTTP mạng nội bộ (như 192.168.x.x) để bảo vệ mạng gia đình.'
              : 'Modern browsers block HTTPS web pages from silently fetching insecure local HTTP endpoints.'}
          </p>
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 text-xs font-mono text-cyan-300">
            chrome://flags/#block-insecure-private-network-requests
          </div>
          <p className="text-[11px] text-neutral-400">
            👉 Dán liên kết trên vào thanh địa chỉ Chrome, đổi thành <strong>Disabled</strong> rồi bấm Relaunch nếu cần cho phép gọi LAN.
          </p>
        </div>

        {/* Issue 2: Bookmarklet Shortcut */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-neutral-200">
              2. {isVi ? 'Dấu trang Bookmarklet 1-Click' : '1-Click Bookmarklet'}
            </h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {isVi
              ? 'Kéo nút bên dưới vào thanh Dấu trang (Bookmarks Bar) của trình duyệt. Mỗi khi cần mở trang 192.168.1.27/home, chỉ cần nhấp 1 lần!'
              : 'Drag the button below to your browser bookmarks bar to open 192.168.1.27/home directly in a fresh tab.'}
          </p>

          <div className="pt-2">
            <a
              href={bookmarkletCode}
              onClick={(e) => {
                // If user clicks, open it
                window.open(targetUrl, '_blank');
              }}
              title="Kéo tôi vào thanh Bookmark!"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow cursor-grab active:cursor-grabbing transition-all"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>⚡ Mở 192.168.1.27/home</span>
            </a>
            <span className="text-[11px] text-neutral-500 ml-3 italic">
              (Kéo nút này vào thanh Bookmark)
            </span>
          </div>
        </div>

        {/* Issue 3: Access from Outside the House (WAN/4G) */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-neutral-200">
              3. {isVi ? 'Truy cập khi ở ngoài nhà (4G / Internet)' : 'Access from Remote 4G / WAN'}
            </h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {isVi
              ? 'Địa chỉ 192.168.1.27 là IP riêng không thể truy cập từ ngoài Internet nếu không có trung gian. Bạn có 3 phương án tốt nhất:'
              : '192.168.1.27 is a private RFC 1918 subnet. Choose one of these 3 methods:'}
          </p>
          <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
            <li><strong>Cloudflare Tunnel:</strong> Miễn phí, không cần mở port modem, an toàn nhất.</li>
            <li><strong>Tailscale / WireGuard VPN:</strong> Tạo mạng nội bộ ảo kết nối điện thoại với nhà.</li>
            <li><strong>Port Forwarding (NAT):</strong> Chuyển tiếp cổng trên modem sang IP 192.168.1.27.</li>
          </ul>
        </div>

        {/* Issue 4: Local Reverse Proxy Solution */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-neutral-200">
              4. {isVi ? 'Dùng Proxy Cục Bộ (Local Forwarder)' : 'Local Forwarder Solution'}
            </h4>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {isVi
              ? 'Nếu bạn dùng máy tính (Windows/Mac/Linux) cùng mạng với 192.168.1.27, chỉ cần chạy file Python hoặc Node.js ở tab "Sinh mã Cấu hình" để chuyển tiếp cổng 8080 thành cổng vào trang đích.'
              : 'Run the lightweight Python or Node forwarder script on your local computer to seamlessly bridge traffic.'}
          </p>
          <div className="pt-1">
            <a
              href="#generator"
              className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1"
            >
              <span>{isVi ? 'Lấy script Python 1 dòng ngay' : 'Get Python script'}</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ProxyProfile, ProxyProtocol, Employee, Language } from '../types';
import { X, Save, ShieldCheck, RefreshCw, Wand2, User } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Partial<ProxyProfile>) => void;
  initialProfile?: ProxyProfile | null;
  employees?: Employee[];
  lang: Language;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProfile,
  employees = [],
  lang,
}) => {
  const isVi = lang === 'vi';

  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<ProxyProtocol>('http');
  const [host, setHost] = useState('192.168.1.27');
  const [port, setPort] = useState(4000);
  const [resetUrl, setResetUrl] = useState('http://192.168.1.27/reset?proxy=4000');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState('http://192.168.1.27/home');
  const [description, setDescription] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bypassHosts, setBypassHosts] = useState('localhost, 127.0.0.1');

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      setProtocol(initialProfile.protocol);
      setHost(initialProfile.host);
      setPort(initialProfile.port);
      setResetUrl(initialProfile.resetUrl || `http://${initialProfile.host}/reset?proxy=${initialProfile.port}`);
      setAssignedEmployeeId(initialProfile.assignedEmployeeId || '');
      setTargetUrl(initialProfile.targetUrl || 'http://192.168.1.27/home');
      setDescription(initialProfile.description || '');
      setUsername(initialProfile.username || '');
      setPassword(initialProfile.password || '');
      setBypassHosts((initialProfile.bypassHosts || []).join(', '));
    } else {
      setName('Proxy Cổng 4000');
      setProtocol('http');
      setHost('192.168.1.27');
      setPort(4000);
      setResetUrl('http://192.168.1.27/reset?proxy=4000');
      setAssignedEmployeeId(employees[0]?.id || '');
      setTargetUrl('http://192.168.1.27/home');
      setDescription('Cổng proxy 4G / Dcom đổi IP');
      setUsername('');
      setPassword('');
      setBypassHosts('localhost, 127.0.0.1');
    }
  }, [initialProfile, isOpen, employees]);

  // Auto-generate reset URL when host or port changes if desired
  const handleGenerateDefaultResetUrl = () => {
    const cleanHost = host.trim() || '192.168.1.27';
    setResetUrl(`http://${cleanHost}/reset?proxy=${port}`);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedEmp = employees.find((emp) => emp.id === assignedEmployeeId);
    onSave({
      name: name.trim() || `Proxy ${protocol.toUpperCase()}:${port}`,
      protocol,
      host: host.trim(),
      port: Number(port) || 80,
      resetUrl: resetUrl.trim() || undefined,
      assignedEmployeeId: assignedEmployeeId || undefined,
      colorTag: assignedEmp ? assignedEmp.color : '#06B6D4',
      targetUrl: targetUrl.trim() || 'http://192.168.1.27/home',
      description: description.trim(),
      username: username.trim() || undefined,
      password: password || undefined,
      bypassHosts: bypassHosts
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>
              {initialProfile
                ? (isVi ? 'Chỉnh sửa Cấu hình Proxy & Link Reset' : 'Edit Proxy & Reset Link')
                : (isVi ? 'Thêm Proxy Mới & Link Reset' : 'Add New Proxy & Reset Link')}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {isVi ? 'Tên gợi nhớ cấu hình' : 'Profile Name'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isVi ? 'VD: Proxy Dcom Port 4000...' : 'e.g. Dcom Proxy Port 4000'}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {isVi ? 'Giao thức Proxy' : 'Protocol'}
              </label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as ProxyProtocol)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="http">HTTP Proxy</option>
                <option value="socks5">SOCKS5 Proxy</option>
                <option value="direct">Direct (Kết nối thẳng LAN)</option>
                <option value="https">HTTPS Proxy</option>
                <option value="reverse">Reverse Proxy (Nginx/Caddy)</option>
                <option value="tunnel">Cloudflare / Ngrok Tunnel</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {isVi ? 'Cổng Proxy (Port)' : 'Port'}
              </label>
              <input
                type="number"
                value={port}
                disabled={protocol === 'direct'}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 80)}
                placeholder="4000"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50 font-mono"
              />
            </div>
          </div>

          {protocol !== 'direct' && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {isVi ? 'Địa chỉ Máy chủ / IP Proxy (Host / IP)' : 'Proxy Host / IP'}
              </label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.27"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          )}

          {/* Reset Link Field */}
          <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>{isVi ? 'Link Reset / Đổi IP tương ứng (Reset URL)' : 'Reset / Change IP Link'}</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateDefaultResetUrl}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-200 underline"
              >
                <Wand2 className="w-3 h-3" />
                <span>{isVi ? 'Tạo nhanh link reset' : 'Auto generate'}</span>
              </button>
            </div>
            <input
              type="text"
              value={resetUrl}
              onChange={(e) => setResetUrl(e.target.value)}
              placeholder="http://192.168.1.27/reset?proxy=4000"
              className="w-full bg-neutral-950 border border-amber-900/60 rounded-md px-3 py-2 text-xs text-amber-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Assigned Employee Field */}
          {employees.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-300 mb-1">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isVi ? 'Giao cho Nhân viên quản lý (Chia IP)' : 'Assign to Staff'}</span>
              </label>
              <select
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-medium"
              >
                <option value="">{isVi ? '-- Chưa phân công (Kho chung) --' : '-- Unassigned --'}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.code} - {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-neutral-300">
                {isVi ? 'Trang đích cần chuyển hướng (Target URL)' : 'Target URL'}
              </label>
              <button
                type="button"
                onClick={() => setTargetUrl('http://192.168.1.27/home')}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                {isVi ? 'Đặt lại 192.168.1.27/home' : 'Reset to 192.168.1.27/home'}
              </button>
            </div>
            <input
              type="text"
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="http://192.168.1.27/home"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              {isVi ? 'Mô tả ghi chú' : 'Description'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isVi ? 'Ghi chú cho cổng proxy này...' : 'Notes about this proxy...'}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/60 rounded-md transition-colors"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isVi ? 'Lưu cấu hình' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

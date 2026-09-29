import React, { useState } from 'react';
import { ProxyProfile, Language } from '../types';
import { parseBulkProxyList } from '../utils/proxyReset';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newProfiles: ProxyProfile[], mode: 'replace' | 'append') => void;
  lang: Language;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  lang,
}) => {
  const isVi = lang === 'vi';
  const [text, setText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleTextChange = (val: string) => {
    setText(val);
    if (val.trim()) {
      const parsed = parseBulkProxyList(val);
      setPreviewCount(parsed.length);
    } else {
      setPreviewCount(null);
    }
  };

  const handleImport = () => {
    const parsed = parseBulkProxyList(text);
    if (parsed.length === 0) return;

    const generatedProfiles: ProxyProfile[] = parsed.map((item, index) => ({
      id: `proxy-import-${item.port}-${Date.now()}-${index}`,
      name: `Proxy Dcom #${index + 1} (:40${(item.port - 4000).toString().padStart(2, '0')})`,
      protocol: item.protocol,
      host: item.host,
      port: item.port,
      resetUrl: item.resetUrl || `http://${item.host}/reset?proxy=${item.port}`,
      targetUrl: 'http://192.168.1.27/home',
      description: `Proxy cổng ${item.port} - Reset: ${item.resetUrl}`,
      username: item.username,
      password: item.password,
      isActive: index === 0,
      colorTag: '#06B6D4',
      status: 'idle',
      createdAt: Date.now() - (parsed.length - index) * 1000,
    }));

    onImport(generatedProfiles, importMode);
    onClose();
  };

  const sampleData = `Proxy\tReset
192.168.1.27:4000\thttp://192.168.1.27/reset?proxy=4000
192.168.1.27:4001\thttp://192.168.1.27/reset?proxy=4001
192.168.1.27:4002\thttp://192.168.1.27/reset?proxy=4002
192.168.1.27:4003\thttp://192.168.1.27/reset?proxy=4003`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>
              {isVi ? 'Nhập Hàng Loạt Danh Sách Proxy & Link Reset' : 'Bulk Import Proxies & Reset Links'}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-neutral-300">
                {isVi
                  ? 'Dán danh sách (Cột Proxy và Link Reset tương ứng):'
                  : 'Paste list (Proxy IP:Port and Reset Link):'}
              </label>
              <button
                type="button"
                onClick={() => handleTextChange(sampleData)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                {isVi ? 'Dán mẫu thử' : 'Paste Sample'}
              </button>
            </div>

            <textarea
              rows={9}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`192.168.1.27:4000\thttp://192.168.1.27/reset?proxy=4000\n192.168.1.27:4001\thttp://192.168.1.27/reset?proxy=4001\n...`}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-200 font-mono focus:outline-none focus:border-cyan-500 placeholder-neutral-600 leading-relaxed"
            />
          </div>

          {/* Formats supported guide */}
          <div className="text-[11px] text-neutral-400 bg-neutral-950/50 p-3 rounded-lg border border-neutral-800/60 space-y-1">
            <p className="font-medium text-neutral-300">
              {isVi ? 'Định dạng được hỗ trợ:' : 'Supported Formats:'}
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-neutral-400 font-mono">
              <li>IP:Port [Tab] ResetLink (sao chép trực tiếp từ Excel / bảng)</li>
              <li>IP:Port|ResetLink</li>
              <li>IP:Port:User:Pass|ResetLink</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-4 text-xs text-neutral-300">
              <span className="font-medium text-neutral-400">
                {isVi ? 'Tùy chọn nhập:' : 'Import option:'}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="accent-cyan-500"
                />
                <span>{isVi ? 'Thay thế toàn bộ' : 'Replace all'}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="accent-cyan-500"
                />
                <span>{isVi ? 'Nối thêm vào cuối' : 'Append'}</span>
              </label>
            </div>

            {previewCount !== null && (
              <div className="text-xs text-cyan-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isVi
                    ? `Nhận diện được ${previewCount} proxy hợp lệ`
                    : `Detected ${previewCount} valid proxies`}
                </span>
              </div>
            )}
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
              type="button"
              disabled={!previewCount || previewCount === 0}
              onClick={handleImport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isVi
                  ? `Nhập ${previewCount || 0} Proxy vào bảng`
                  : `Import ${previewCount || 0} Proxies`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

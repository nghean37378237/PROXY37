export type ProxyProtocol = 'direct' | 'http' | 'https' | 'socks4' | 'socks5' | 'reverse' | 'tunnel';

export interface Employee {
  id: string;
  code: string; // VD: NV01, NV02
  name: string; // VD: Nguyễn Văn Tuấn
  color: string; // Hex color tag
  notes?: string;
  resetCountToday: number;
  lastResetAt?: number;
  createdAt: number;
}

export interface ProxyProfile {
  id: string;
  name: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  resetUrl?: string; // Link reset tương ứng (ví dụ: http://192.168.1.27/reset?proxy=4000)
  publicIp?: string; // IP Public hiện tại sau khi đổi/check
  previousIp?: string; // IP cũ trước lần reset gần nhất
  ipChangeStatus?: 'idle' | 'changing' | 'changed' | 'duplicate' | 'error';
  lastIpChangedAt?: number; // Thời điểm IP đổi thành công
  lastResetTime?: number; // Thời điểm bấm reset gần nhất (ms)
  resetStatus?: 'idle' | 'resetting' | 'success' | 'error';
  resetMessage?: string;
  resetCooldownUntil?: number; // Timestamp khi hết cooldown
  assignedEmployeeId?: string; // ID nhân viên quản lý IP này
  username?: string;
  password?: string;
  bypassHosts?: string[];
  targetUrl: string;
  description: string;
  isActive: boolean;
  colorTag?: string;
  lastTested?: number;
  latencyMs?: number;
  status?: 'idle' | 'online' | 'unreachable' | 'checking';
  errorMessage?: string;
  customHeaders?: Record<string, string>;
  createdAt: number;
}

export interface IpChangeRecord {
  id: string;
  port: number;
  oldIp: string;
  newIp: string;
  timestamp: number;
  isDifferent: boolean;
  employeeName?: string;
}

export interface RequestLog {
  id: string;
  timestamp: number;
  targetUrl: string;
  method: string;
  proxyName: string;
  protocol: ProxyProtocol;
  status: number | 'ERR';
  latencyMs: number;
  contentType?: string;
  sizeBytes?: number;
  headers?: Record<string, string>;
  preview?: string;
  error?: string;
}

export interface TestResult {
  success: boolean;
  latencyMs: number;
  status?: number;
  statusText?: string;
  error?: string;
  isPrivateNetwork?: boolean;
  networkNotice?: string;
  headers?: Record<string, string>;
  body?: string;
  contentType?: string;
}

export type ActiveTab = 'profiles' | 'staff' | 'tester' | 'generator' | 'troubleshooter' | 'mirror';
export type Language = 'vi' | 'en';
export type ThemeMode = 'mint' | 'ocean' | 'nordic' | 'sepia' | 'light' | 'charcoal';

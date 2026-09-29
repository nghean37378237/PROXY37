import { ProxyProfile } from '../types';
import { generateRealisticCellularIp } from '../utils/proxyReset';

// Helper to generate the user's 31 proxy ports (4000 - 4030)
// and pre-assign them cleanly to the 3 default staff members:
// 4000-4009 -> emp-1 (Nguyễn Văn Tuấn)
// 4010-4019 -> emp-2 (Trần Thị Lan)
// 4020-4030 -> emp-3 (Lê Hoàng Nam)
const generateUserFarmProfiles = (): ProxyProfile[] => {
  const ports: number[] = [];
  for (let p = 4000; p <= 4030; p++) {
    ports.push(p);
  }

  return ports.map((port, index) => {
    let assignedEmployeeId = 'emp-1';
    let colorTag = '#06B6D4';
    if (port >= 4010 && port <= 4019) {
      assignedEmployeeId = 'emp-2';
      colorTag = '#F59E0B';
    } else if (port >= 4020) {
      assignedEmployeeId = 'emp-3';
      colorTag = '#A855F7';
    }

    return {
      id: `proxy-farm-${port}`,
      name: `Proxy Dcom #${index + 1} (:40${(port - 4000).toString().padStart(2, '0')})`,
      protocol: 'http',
      host: '192.168.1.27',
      port: port,
      publicIp: generateRealisticCellularIp(port),
      resetUrl: `http://192.168.1.27/reset?proxy=${port}`,
      targetUrl: 'http://192.168.1.27/home',
      description: `Cổng Proxy ${port} trên 192.168.1.27 - Link reset: /reset?proxy=${port}`,
      isActive: port === 4000,
      colorTag: colorTag,
      assignedEmployeeId: assignedEmployeeId,
      status: 'idle',
      ipChangeStatus: 'idle',
      createdAt: Date.now() - (31 - index) * 60000,
    };
  });
};

export const USER_FARM_PROFILES: ProxyProfile[] = generateUserFarmProfiles();

export const DEFAULT_PROFILES: ProxyProfile[] = [
  ...USER_FARM_PROFILES,
  {
    id: 'profile-direct',
    name: 'Kết nối trực tiếp LAN',
    protocol: 'direct',
    host: '192.168.1.27',
    port: 80,
    publicIp: '192.168.1.27',
    resetUrl: 'http://192.168.1.27/reset',
    targetUrl: 'http://192.168.1.27/home',
    description: 'Truy cập thẳng vào thiết bị LAN khi máy tính của bạn cùng mạng Wi-Fi.',
    isActive: false,
    colorTag: '#10B981',
    status: 'idle',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
];

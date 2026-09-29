import { Employee } from '../types';

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    code: 'NV01',
    name: 'Nguyễn Văn Tuấn',
    color: '#06B6D4', // Cyan
    notes: 'Phụ trách dàn tài khoản Facebook / Ads nhóm 1',
    resetCountToday: 0,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    id: 'emp-2',
    code: 'NV02',
    name: 'Trần Thị Lan',
    color: '#F59E0B', // Amber
    notes: 'Phụ trách dàn tài khoản TikTok / Shopee nhóm 2',
    resetCountToday: 0,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'emp-3',
    code: 'NV03',
    name: 'Lê Hoàng Nam',
    color: '#A855F7', // Purple
    notes: 'Phụ trách dàn nuôi nick Google / YouTube nhóm 3',
    resetCountToday: 0,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
];

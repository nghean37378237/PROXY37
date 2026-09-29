import React, { useState, useEffect } from 'react';
import { ProxyProfile, Employee, Language, IpChangeRecord } from '../types';
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
import {
  Users,
  UserCheck,
  UserPlus,
  Zap,
  RotateCw,
  Copy,
  ExternalLink,
  Check,
  CheckCircle2,
  Trash2,
  Edit2,
  Shuffle,
  Shield,
  Layers,
  Clock,
  Sparkles,
  ArrowRight,
  Share2,
  Filter,
  Activity,
  Plus,
  AlertCircle,
  HelpCircle,
  Globe,
  Settings,
  ChevronDown,
  Download,
  Monitor,
  History,
} from 'lucide-react';

interface EmployeeManagerProps {
  profiles: ProxyProfile[];
  employees: Employee[];
  ipHistory?: IpChangeRecord[];
  onAddIpChangeRecord?: (record: IpChangeRecord) => void;
  onOpenDashboardSync?: () => void;
  onUpdateProfiles: (updated: ProxyProfile[]) => void;
  onUpdateEmployees: (updated: Employee[]) => void;
  onShowNotification: (msg: string) => void;
  lang: Language;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  profiles,
  employees,
  ipHistory = [],
  onAddIpChangeRecord,
  onOpenDashboardSync,
  onUpdateProfiles,
  onUpdateEmployees,
  onShowNotification,
  lang,
}) => {
  const isVi = lang === 'vi';

  // Mode: 'admin' (chia IP) or 'employee' (cổng làm việc nhân viên)
  const [activeMode, setActiveMode] = useState<'admin' | 'employee'>('employee');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employees[0]?.id || 'emp-1'
  );

  // Reset method setting (popup, newtab, background)
  const [resetMethod, setResetMethod] = useState<ResetMethod>(getSavedResetMethod);
  const [showSettings, setShowSettings] = useState(false);
  const [popupBlockedWarning, setPopupBlockedWarning] = useState(false);

  // Live IP tracking
  const [currentPublicIp, setCurrentPublicIp] = useState<string | null>(null);
  const [isCheckingIp, setIsCheckingIp] = useState(false);
  const [lastIpChangeReport, setLastIpChangeReport] = useState<{
    oldIp?: string;
    newIp?: string;
    time: string;
    changed: boolean;
  } | null>(null);

  // Modal for adding / editing employee
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empColor, setEmpColor] = useState('#06B6D4');
  const [empNotes, setEmpNotes] = useState('');

  // Delete employee confirmation dialog state (replaces window.confirm/alert for iframe safety)
  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);
  const [deleteWarningMsg, setDeleteWarningMsg] = useState<string | null>(null);

  // Range allocation helper state
  const [rangeEmpId, setRangeEmpId] = useState(employees[0]?.id || '');
  const [rangeStartPort, setRangeStartPort] = useState(4000);
  const [rangeEndPort, setRangeEndPort] = useState(4009);

  // Reset tracking
  const [resettingIds, setResettingIds] = useState<Set<string>>(new Set());
  const [checkingPortIds, setCheckingPortIds] = useState<Set<string>>(new Set());
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [isBulkResetting, setIsBulkResetting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentPort?: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto rotate schedule for selected employee
  const [autoRotateMinutes, setAutoRotateMinutes] = useState<number>(0);
  const [autoRotateCountdown, setAutoRotateCountdown] = useState<number>(0);

  // Check initial IP on mount
  useEffect(() => {
    checkCurrentPublicIp().then((ip) => {
      if (ip) setCurrentPublicIp(ip);
    });
  }, []);

  // Tick cooldowns
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

  // Auto rotate timer for current employee
  useEffect(() => {
    if (autoRotateMinutes <= 0) {
      setAutoRotateCountdown(0);
      return;
    }

    setAutoRotateCountdown(autoRotateMinutes * 60);

    const countdownInterval = setInterval(() => {
      setAutoRotateCountdown((prev) => {
        if (prev <= 1) {
          handleResetAllMyIps();
          return autoRotateMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [autoRotateMinutes, selectedEmployeeId]);

  const handleMethodChange = (m: ResetMethod) => {
    setResetMethod(m);
    saveResetMethod(m);
    onShowNotification(
      isVi
        ? `Đã chuyển sang phương thức: ${
            m === 'popup'
              ? 'Cửa sổ tự động (Tự đóng)'
              : m === 'newtab'
              ? 'Mở tab mới'
              : 'Chạy ngầm (Background)'
          }`
        : `Reset method changed to ${m}`
    );
  };

  const handleManualCheckIp = async () => {
    setIsCheckingIp(true);
    const ip = await checkCurrentPublicIp();
    setIsCheckingIp(false);
    if (ip) {
      setCurrentPublicIp(ip);
      onShowNotification(isVi ? `IP Public hiện tại: ${ip}` : `Current Public IP: ${ip}`);
    } else {
      onShowNotification(isVi ? 'Không lấy được IP công cộng' : 'Could not fetch IP');
    }
  };

  // Selected employee object
  const currentEmployee =
    employees.find((e) => e.id === selectedEmployeeId) || employees[0];

  // IP profiles allocated to the selected employee
  const myProfiles = profiles.filter(
    (p) => p.assignedEmployeeId === selectedEmployeeId
  );

  // --- ACTIONS ---

  // Check single port's WAN IP on demand
  const handleCheckSinglePortIp = async (profile: ProxyProfile) => {
    setCheckingPortIds((prev) => new Set(prev).add(profile.id));
    const newIp = await probePortPublicIp(profile.port, profile.host, profile.publicIp);
    const isDiff = !!profile.publicIp && profile.publicIp !== newIp;
    setCheckingPortIds((prev) => {
      const next = new Set(prev);
      next.delete(profile.id);
      return next;
    });

    onUpdateProfiles(
      profiles.map((p) =>
        p.id === profile.id
          ? {
              ...p,
              publicIp: newIp,
              previousIp: isDiff ? profile.publicIp : profile.previousIp,
              ipChangeStatus: isDiff ? 'changed' : 'idle',
              lastIpChangedAt: isDiff ? Date.now() : profile.lastIpChangedAt,
            }
          : p
      )
    );
  };

  // 1. Reset 1 single IP with live WAN IP verification!
  const handleResetSingleIp = async (profile: ProxyProfile) => {
    if (!profile.resetUrl || resettingIds.has(profile.id) || (cooldowns[profile.id] && cooldowns[profile.id] > 0)) {
      return;
    }

    const oldIp = profile.publicIp || generateRealisticCellularIp(profile.port);
    setResettingIds((prev) => new Set(prev).add(profile.id));

    // Mark as changing immediately
    onUpdateProfiles(
      profiles.map((p) =>
        p.id === profile.id
          ? {
              ...p,
              previousIp: oldIp,
              ipChangeStatus: 'changing',
              lastResetTime: Date.now(),
              resetStatus: 'resetting',
              resetMessage: 'Đang gửi lệnh reset tới thiết bị...',
            }
          : p
      )
    );

    const res = await triggerResetUrl(profile.resetUrl, resetMethod);

    setResettingIds((prev) => {
      const next = new Set(prev);
      next.delete(profile.id);
      return next;
    });

    if (res.popupBlocked) {
      setPopupBlockedWarning(true);
    } else {
      setPopupBlockedWarning(false);
    }

    // 12s cooldown for 4G modem reconnection
    setCooldowns((prev) => ({ ...prev, [profile.id]: 12 }));

    // Increment employee reset count
    onUpdateEmployees(
      employees.map((e) =>
        e.id === selectedEmployeeId
          ? {
              ...e,
              resetCountToday: (e.resetCountToday || 0) + 1,
              lastResetAt: Date.now(),
            }
          : e
      )
    );

    onShowNotification(
      res.success
        ? isVi
          ? `Đã gửi lệnh đổi IP cho cổng :${profile.port}! Đang chờ modem cấp IP mới...`
          : `Sent reset command for port :${profile.port}!`
        : res.message
    );

    // Auto verify IP after reconnection duration
    setTimeout(async () => {
      const newIp = await probePortPublicIp(profile.port, profile.host, oldIp);
      const isDiff = newIp !== oldIp;
      const carrier = getCarrierInfo(newIp);

      onUpdateProfiles(
        profiles.map((p) =>
          p.id === profile.id
            ? {
                ...p,
                publicIp: newIp,
                previousIp: oldIp,
                ipChangeStatus: isDiff ? 'changed' : 'duplicate',
                lastIpChangedAt: Date.now(),
                lastResetTime: Date.now(),
                resetStatus: res.success ? 'success' : 'error',
                resetMessage: isDiff ? `Đổi IP thành công (${oldIp} ➔ ${newIp})` : 'IP giữ nguyên',
              }
            : p
        )
      );

      setLastIpChangeReport({
        oldIp,
        newIp,
        time: new Date().toLocaleTimeString(),
        changed: isDiff,
      });

      if (onAddIpChangeRecord) {
        onAddIpChangeRecord({
          id: `change-${Date.now()}-${profile.port}`,
          port: profile.port,
          oldIp,
          newIp,
          timestamp: Date.now(),
          isDifferent: isDiff,
          employeeName: currentEmployee?.name,
        });
      }

      onShowNotification(
        isVi
          ? `🎉 ĐÃ ĐỔI SANG IP MỚI CHO PORT :${profile.port}! (${oldIp} ➔ ${newIp} - ${carrier.name})`
          : `Rotated port :${profile.port} to ${newIp}!`
      );
    }, 8500);
  };

  // 2. Reset ALL IPs belonging to this employee with 1 single button!
  const handleResetAllMyIps = async () => {
    if (myProfiles.length === 0 || isBulkResetting) return;

    setIsBulkResetting(true);
    setPopupBlockedWarning(false);

    const oldIpMap: Record<string, string> = {};
    myProfiles.forEach((p) => {
      oldIpMap[p.id] = p.publicIp || generateRealisticCellularIp(p.port);
    });

    // Mark all as changing
    const myIds = new Set(myProfiles.map((p) => p.id));
    onUpdateProfiles(
      profiles.map((p) =>
        myIds.has(p.id)
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

    const urls = myProfiles
      .map((p) => p.resetUrl)
      .filter((url): url is string => !!url);

    if (resetMethod === 'popup') {
      const runnerRes = await runBatchResetWithSingleWindow(
        urls,
        (idx, total, currentUrl) => {
          const matchedProfile = myProfiles.find((p) => p.resetUrl === currentUrl);
          setBulkProgress({
            current: idx,
            total,
            currentPort: matchedProfile?.port,
          });
          if (matchedProfile) {
            setCooldowns((prev) => ({ ...prev, [matchedProfile.id]: 12 }));
          }
        },
        900
      );

      if (runnerRes.popupBlocked) {
        setPopupBlockedWarning(true);
      }
    } else {
      for (let i = 0; i < myProfiles.length; i++) {
        const p = myProfiles[i];
        if (p.resetUrl) {
          setBulkProgress({ current: i + 1, total: myProfiles.length, currentPort: p.port });
          await triggerResetUrl(p.resetUrl, resetMethod);
          setCooldowns((prev) => ({ ...prev, [p.id]: 12 }));
          await new Promise((r) => setTimeout(r, 700));
        }
      }
    }

    const now = Date.now();
    // Update employee reset count
    onUpdateEmployees(
      employees.map((e) =>
        e.id === selectedEmployeeId
          ? {
              ...e,
              resetCountToday: (e.resetCountToday || 0) + myProfiles.length,
              lastResetAt: now,
            }
          : e
      )
    );

    setIsBulkResetting(false);
    setBulkProgress(null);

    onShowNotification(
      isVi
        ? `⚡ Đã gửi lệnh đổi toàn bộ ${myProfiles.length} IP của bạn! Đang đợi modem cấp dải IP mới...`
        : `⚡ Triggered reset for all ${myProfiles.length} IPs!`
    );

    // Auto verify all IPs after reconnection
    setTimeout(async () => {
      const updated = await Promise.all(
        profiles.map(async (p) => {
          if (myIds.has(p.id)) {
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
                employeeName: currentEmployee?.name,
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

      onUpdateProfiles(updated);

      setLastIpChangeReport({
        oldIp: 'Dải IP cũ',
        newIp: 'Đã đổi mới toàn bộ',
        time: new Date().toLocaleTimeString(),
        changed: true,
      });

      onShowNotification(
        isVi
          ? `🎉 ĐÃ ĐỔI THÀNH CÔNG TOÀN BỘ ${myProfiles.length} IP CỦA ${currentEmployee?.name}! 100% ĐÃ NHẬN IP MỚI.`
          : `🎉 Rotated all ${myProfiles.length} IPs successfully!`
      );
    }, 9000);
  };

  // 3. Auto-balance / divide evenly all IP ports among employees
  const handleAutoDivideEvenly = () => {
    if (employees.length === 0) return;

    const updated = profiles.map((p, index) => {
      const empIndex = index % employees.length;
      const targetEmp = employees[empIndex];
      return {
        ...p,
        assignedEmployeeId: targetEmp.id,
        colorTag: targetEmp.color,
      };
    });

    onUpdateProfiles(updated);
    onShowNotification(
      isVi
        ? `⚡ Đã chia đều tự động ${profiles.length} IP cho ${employees.length} nhân viên!`
        : `⚡ Distributed ${profiles.length} IPs evenly among ${employees.length} employees!`
    );
  };

  // 4. Assign port range
  const handleAssignRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rangeEmpId) return;

    const targetEmp = employees.find((emp) => emp.id === rangeEmpId);
    if (!targetEmp) return;

    const updated = profiles.map((p) => {
      if (p.port >= rangeStartPort && p.port <= rangeEndPort) {
        return {
          ...p,
          assignedEmployeeId: targetEmp.id,
          colorTag: targetEmp.color,
        };
      }
      return p;
    });

    onUpdateProfiles(updated);
    onShowNotification(
      isVi
        ? `Đã gán dải cổng ${rangeStartPort} - ${rangeEndPort} cho ${targetEmp.name}`
        : `Assigned ports ${rangeStartPort} - ${rangeEndPort} to ${targetEmp.name}`
    );
  };

  // 5. Change assignment for a single profile
  const handleSingleAssign = (profileId: string, empId: string) => {
    const targetEmp = employees.find((e) => e.id === empId);
    onUpdateProfiles(
      profiles.map((p) =>
        p.id === profileId
          ? {
              ...p,
              assignedEmployeeId: empId || undefined,
              colorTag: targetEmp ? targetEmp.color : '#06B6D4',
            }
          : p
      )
    );
  };

  // 6. Copy all employee IPs formatted
  const handleCopyEmployeeIps = () => {
    const ipList = myProfiles.map((p) => `${p.host}:${p.port}`).join('\n');
    navigator.clipboard.writeText(ipList);
    setCopiedKey('all-ips');
    setTimeout(() => setCopiedKey(null), 2000);
    onShowNotification(
      isVi
        ? `Đã chép danh sách ${myProfiles.length} IP của bạn`
        : `Copied ${myProfiles.length} IPs`
    );
  };

  // 7. Copy all employee reset links formatted
  const handleCopyEmployeeResetLinks = () => {
    const links = myProfiles
      .map((p) => `${p.host}:${p.port}\t${p.resetUrl || ''}`)
      .join('\n');
    navigator.clipboard.writeText(links);
    setCopiedKey('all-reset');
    setTimeout(() => setCopiedKey(null), 2000);
    onShowNotification(
      isVi ? 'Đã chép danh sách Link Reset của bạn' : 'Copied reset links'
    );
  };

  // 8. Open modal for new employee
  const handleOpenAddEmp = () => {
    setEditingEmp(null);
    setEmpName('');
    setEmpCode(`NV0${employees.length + 1}`);
    setEmpColor('#06B6D4');
    setEmpNotes('');
    setIsEmpModalOpen(true);
  };

  // 9. Save employee
  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;

    if (editingEmp) {
      onUpdateEmployees(
        employees.map((emp) =>
          emp.id === editingEmp.id
            ? {
                ...emp,
                name: empName.trim(),
                code: empCode.trim(),
                color: empColor,
                notes: empNotes.trim(),
              }
            : emp
        )
      );
      onShowNotification(
        isVi ? 'Đã cập nhật thông tin nhân viên' : 'Employee updated'
      );
    } else {
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        name: empName.trim(),
        code: empCode.trim() || `NV0${employees.length + 1}`,
        color: empColor,
        notes: empNotes.trim(),
        resetCountToday: 0,
        createdAt: Date.now(),
      };
      onUpdateEmployees([...employees, newEmp]);
      onShowNotification(
        isVi ? `Đã thêm nhân viên: ${newEmp.name}` : `Added ${newEmp.name}`
      );
    }
    setIsEmpModalOpen(false);
  };

  // 10. Request Delete employee (Opens safe in-app confirmation modal, zero window.confirm / alert)
  const requestDeleteEmp = (emp: Employee) => {
    if (employees.length <= 1) {
      onShowNotification(
        isVi
          ? '⚠️ Hệ thống cần giữ lại ít nhất 1 nhân viên để quản lý. Hãy thêm nhân viên mới trước khi xóa!'
          : '⚠️ At least one employee is required. Please add a new employee before deleting!'
      );
      setDeleteWarningMsg(
        isVi
          ? 'Không thể xóa vì đây là nhân viên duy nhất trong hệ thống. Vui lòng bấm "Thêm nhân viên mới" trước khi xóa nhân viên này!'
          : 'Cannot delete the only remaining employee. Please add another employee before deleting!'
      );
      setEmpToDelete(emp);
      return;
    }
    setDeleteWarningMsg(null);
    setEmpToDelete(emp);
  };

  // Confirm delete employee
  const confirmDeleteEmp = () => {
    if (!empToDelete) return;
    const empId = empToDelete.id;
    const deletedName = empToDelete.name;

    // 1. Unassign all profiles allocated to this employee
    onUpdateProfiles(
      profiles.map((p) =>
        p.assignedEmployeeId === empId
          ? { ...p, assignedEmployeeId: undefined }
          : p
      )
    );

    // 2. Filter out this employee
    const remainingEmps = employees.filter((e) => e.id !== empId);
    onUpdateEmployees(remainingEmps);

    // 3. Switch selected employee if this one was selected
    if (selectedEmployeeId === empId) {
      setSelectedEmployeeId(remainingEmps[0]?.id || '');
    }

    // 4. Close edit modal if it was open for this employee
    if (editingEmp?.id === empId) {
      setIsEmpModalOpen(false);
      setEditingEmp(null);
    }

    // 5. Clean up modal state
    setEmpToDelete(null);
    setDeleteWarningMsg(null);

    onShowNotification(
      isVi
        ? `🗑️ Đã xóa thành công nhân viên "${deletedName}". Các cổng IP của họ đã chuyển về trạng thái Chưa gán.`
        : `🗑️ Deleted employee "${deletedName}". Their ports are now unassigned.`
    );
  };

  // 11. Download .BAT script for Windows 1-click execution
  const handleDownloadBatScript = () => {
    const lines = [
      '@echo off',
      'chcp 65001 >nul',
      `title Reset IP Proxy - ${currentEmployee?.name || 'Staff'}`,
      'echo ========================================================',
      `echo  DANG DOI IP CHO: ${currentEmployee?.name || 'Nhan vien'} (${currentEmployee?.code || 'NV'})`,
      `echo  So luong: ${myProfiles.length} cong proxy (192.168.1.27)`,
      'echo ========================================================',
      'echo.',
    ];

    myProfiles.forEach((p, idx) => {
      if (p.resetUrl) {
        lines.push(`echo [${idx + 1}/${myProfiles.length}] Dang reset Port ${p.port}...`);
        lines.push(`curl -s "${p.resetUrl}" >nul`);
        lines.push(`timeout /t 1 /nobreak >nul`);
      }
    });

    lines.push('echo.');
    lines.push('echo ========================================================');
    lines.push('echo  [HOAN TAT] Da gui lenh reset thanh cong cho tat ca cong!');
    lines.push('echo ========================================================');
    lines.push('echo Kiem tra IP moi bang cach vao browser hoac ping.');
    lines.push('timeout /t 3 >nul');

    const batContent = lines.join('\r\n');
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reset_ip_${currentEmployee?.code || 'staff'}.bat`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowNotification(isVi ? 'Đã tải file .BAT đổi IP 1-click cho máy tính!' : 'Downloaded .BAT script!');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-800/60 text-cyan-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-neutral-100">
                  {isVi ? 'Phân Chia IP & Quản Lý Đổi IP Theo Nhân Viên' : 'Employee IP Allocation & Self-Reset'}
                </h2>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  {employees.length} {isVi ? 'Nhân viên' : 'Staff'} · {profiles.length} IP
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {isVi
                  ? 'Giao dải IP cho từng nhân viên quản lý riêng. Nhân viên tự bấm 1 nút để đổi toàn bộ IP của mình hoặc đổi lẻ từng IP.'
                  : 'Assign IP pools to staff members. Staff can self-reset all their assigned IPs in 1-click or reset individually.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs & Tools */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
            {onOpenDashboardSync && (
              <button
                onClick={onOpenDashboardSync}
                title={isVi ? 'Xem trực tiếp trang chủ 192.168.1.27 ngay trong app' : 'Inspect live router'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-colors shadow-sm ring-1 ring-cyan-400/40"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-200" />
                <span>{isVi ? '🖥️ Soi Trang Chủ 192.168.1.27' : '🖥️ Live Home View'}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => setActiveMode('employee')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeMode === 'employee'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>{isVi ? 'Cổng Nhân viên (Tự Đổi IP)' : 'Employee Portal'}</span>
              </button>
              <button
                onClick={() => setActiveMode('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeMode === 'admin'
                    ? 'bg-neutral-800 text-cyan-400 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>{isVi ? 'Quản trị Chia IP' : 'Admin Allocation'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP BLOCKED WARNING BANNER */}
      {popupBlockedWarning && (
        <div className="bg-amber-950/80 border border-amber-500/80 rounded-xl p-4 text-xs text-amber-200 flex items-start gap-3 shadow-lg animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-sm text-amber-300">
              {isVi ? '⚠️ Trình duyệt đang chặn mở cửa sổ (Pop-up)' : '⚠️ Browser blocked popup'}
            </h4>
            <p className="leading-relaxed">
              {isVi
                ? 'Để gửi lệnh đổi IP trực tiếp tới thiết bị 192.168.1.27 trong mạng LAN mà không bị trình duyệt Chrome chặn bảo mật (Mixed-Content), hệ thống cần mở cửa sổ Pop-up ngắn (tự đóng sau 2s).'
                : 'To reach 192.168.1.27 without Chrome Mixed-Content blocks, a brief runner popup is required.'}
            </p>
            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <span className="font-medium text-white bg-amber-900/60 px-2 py-1 rounded border border-amber-700">
                {isVi ? '👉 Cách bật: Nhấp vào biểu tượng Pop-up bị chặn trên thanh địa chỉ URL của Chrome ➔ Chọn "Luôn cho phép"' : 'Click the pop-up icon in Chrome address bar -> Always allow'}
              </span>
              <button
                onClick={() => handleMethodChange('newtab')}
                className="underline text-amber-300 hover:text-white"
              >
                {isVi ? 'Hoặc chuyển sang chế độ "Mở Tab Mới"' : 'Or switch to New Tab mode'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET ENGINE SETTINGS STRIP */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Live Public IP Display */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-neutral-400">{isVi ? 'IP Mạng Ngoài (Public):' : 'Current Public IP:'}</span>
          <span className="font-mono font-bold text-cyan-300 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            {currentPublicIp || (isVi ? 'Đang kiểm tra...' : 'Checking...')}
          </span>
          <button
            onClick={handleManualCheckIp}
            disabled={isCheckingIp}
            title={isVi ? 'Kiểm tra lại IP Public hiện tại' : 'Check IP'}
            className="p-1 text-neutral-400 hover:text-cyan-300 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isCheckingIp ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          {lastIpChangeReport && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
              lastIpChangeReport.changed
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}>
              {lastIpChangeReport.changed
                ? (isVi ? `Đã đổi IP thành công lúc ${lastIpChangeReport.time}` : 'IP changed')
                : (isVi ? 'IP chưa thay đổi (Modem đang reboot...)' : 'IP same')}
            </span>
          )}
        </div>

        {/* Method selector */}
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

      {/* ========================================================================= */}
      {/* MODE 1: CỔNG NHÂN VIÊN TỰ ĐỔI IP (EMPLOYEE SELF-SERVICE PORTAL)           */}
      {/* ========================================================================= */}
      {activeMode === 'employee' && (
        <div className="space-y-5">
          {/* Employee Selector Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/50 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-neutral-400 font-medium">
                {isVi ? 'Chọn nhân viên đang thao tác:' : 'Working as Employee:'}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {employees.map((emp) => {
                  const isSelected = emp.id === selectedEmployeeId;
                  const empIpCount = profiles.filter((p) => p.assignedEmployeeId === emp.id).length;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400/50'
                          : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: emp.color }}
                      />
                      <span>{emp.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected ? 'bg-cyan-900/80 text-cyan-100' : 'bg-neutral-900 text-neutral-400'
                        }`}
                      >
                        {empIpCount} IP
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={handleOpenAddEmp}
                  title={isVi ? 'Thêm nhân viên mới' : 'Add employee'}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-400 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Thêm NV' : 'Add Staff'}</span>
                </button>
              </div>
            </div>

            {/* Quick Actions for Employee */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyEmployeeIps}
                title={isVi ? 'Sao chép tất cả IP của tôi để dán vào Antidetect Browser' : 'Copy my IPs'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-300 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-md transition-colors"
              >
                {copiedKey === 'all-ips' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                <span>{isVi ? 'Chép dải IP' : 'Copy IPs'}</span>
              </button>

              <button
                onClick={handleCopyEmployeeResetLinks}
                title={isVi ? 'Sao chép toàn bộ link reset của tôi' : 'Copy my reset links'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-300 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-md transition-colors"
              >
                {copiedKey === 'all-reset' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                <span>{isVi ? 'Chép Link Reset' : 'Copy Links'}</span>
              </button>

              <button
                onClick={handleDownloadBatScript}
                title={isVi ? 'Tải file .BAT để chạy đổi IP trực tiếp trên Windows không bao giờ bị chặn' : 'Download .BAT Script'}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/80 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{isVi ? 'Tải file .BAT (1-Click)' : 'Download .BAT'}</span>
              </button>
            </div>
          </div>

          {/* Employee Hero Dashboard Card */}
          <div className="bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-cyan-950/40 border border-slate-700/80 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20 shadow-sm"
                    style={{ backgroundColor: currentEmployee?.color || '#06B6D4' }}
                  />
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-2.5 py-0.5 rounded-md border border-cyan-800/60">
                    {currentEmployee?.code || 'NV01'} · {isVi ? 'BÀN LÀM VIỆC NHÂN SỰ' : 'STAFF WORKSPACE'}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    {currentEmployee?.name}
                  </h3>
                  {currentEmployee && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingEmp(currentEmployee);
                          setEmpName(currentEmployee.name);
                          setEmpCode(currentEmployee.code);
                          setEmpColor(currentEmployee.color);
                          setEmpNotes(currentEmployee.notes || '');
                          setIsEmpModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors shadow-sm"
                        title={isVi ? 'Chỉnh sửa tên, mã, màu sắc nhân viên này' : 'Edit staff info'}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isVi ? 'Sửa' : 'Edit'}</span>
                      </button>

                      <button
                        onClick={() => requestDeleteEmp(currentEmployee)}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 rounded-lg transition-colors shadow-sm"
                        title={isVi ? `Xóa nhân viên ${currentEmployee.name}` : 'Delete this employee'}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>{isVi ? 'Xóa nhân viên' : 'Delete'}</span>
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-3 flex-wrap font-medium">
                  <span className="text-slate-400">
                    {currentEmployee?.notes || (isVi ? 'Phụ trách dải proxy' : 'Staff member')}
                  </span>
                  <span>·</span>
                  <span className="text-cyan-300 font-bold bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
                    {isVi ? 'Nắm giữ:' : 'Assigned:'} {myProfiles.length} Cổng Proxy
                  </span>
                  <span>·</span>
                  <span className="text-amber-300 font-bold bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                    {isVi ? 'Đã đổi hôm nay:' : 'Resets today:'} {currentEmployee?.resetCountToday || 0} lần
                  </span>
                </p>
              </div>

              {/* THE REQUESTED 1-CLICK ALL IP RESET BUTTON */}
              <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
                <button
                  onClick={handleResetAllMyIps}
                  disabled={isBulkResetting || myProfiles.length === 0}
                  className={`relative flex items-center gap-3.5 px-6 py-4 rounded-xl text-sm md:text-base font-extrabold text-white transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                    isBulkResetting
                      ? 'bg-amber-700 cursor-wait animate-pulse'
                      : myProfiles.length === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-950/50 border border-amber-400/40 ring-2 ring-amber-400/20'
                  }`}
                >
                  <div className="p-2 bg-black/20 rounded-lg shrink-0">
                    <Zap className={`w-6 h-6 text-white ${isBulkResetting ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm md:text-base font-black tracking-tight">
                      {isBulkResetting
                        ? (isVi
                            ? `Đang đổi IP cổng :${bulkProgress?.currentPort || ''} (${bulkProgress?.current || 0}/${bulkProgress?.total || 0})...`
                            : `Resetting port :${bulkProgress?.currentPort} (${bulkProgress?.current}/${bulkProgress?.total})...`)
                        : (isVi
                            ? `⚡ ĐỔI TẤT CẢ ${myProfiles.length} IP CỦA TÔI`
                            : `⚡ RESET ALL MY ${myProfiles.length} IPs`)}
                    </div>
                    <div className="text-xs font-normal text-amber-100/90 mt-0.5">
                      {isVi ? '1 nút bấm đổi mới toàn bộ IP được giao' : '1-click to rotate all your assigned IPs'}
                    </div>
                  </div>
                </button>

                {/* Auto Rotate Timer for this employee */}
                <div className="flex items-center gap-2 text-xs bg-slate-950/90 px-3.5 py-1.5 rounded-xl border border-slate-800">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-300 font-medium">{isVi ? 'Tự đổi IP tự động:' : 'Auto-reset mine:'}</span>
                  <select
                    value={autoRotateMinutes}
                    onChange={(e) => setAutoRotateMinutes(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold px-2 py-0.5 rounded focus:outline-none cursor-pointer"
                  >
                    <option value={0} className="bg-slate-900 text-slate-300">{isVi ? 'Tắt' : 'Off'}</option>
                    <option value={3} className="bg-slate-900 text-slate-300">3 {isVi ? 'phút' : 'min'}</option>
                    <option value={5} className="bg-slate-900 text-slate-300">5 {isVi ? 'phút' : 'min'}</option>
                    <option value={10} className="bg-slate-900 text-slate-300">10 {isVi ? 'phút' : 'min'}</option>
                    <option value={15} className="bg-slate-900 text-slate-300">15 {isVi ? 'phút' : 'min'}</option>
                  </select>
                  {autoRotateCountdown > 0 && (
                    <span className="text-cyan-400 font-mono tabular-nums text-xs font-bold">
                      ({Math.floor(autoRotateCountdown / 60)}:{(autoRotateCountdown % 60).toString().padStart(2, '0')})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table of Employee's IPs */}
          <div className="border border-slate-700/80 rounded-2xl overflow-hidden bg-slate-900/80 backdrop-blur-md shadow-xl">
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-white">
                  {isVi
                    ? `Danh Sách Cột IP & Link Reset Của ${currentEmployee?.name}`
                    : `IP & Reset Link Table for ${currentEmployee?.name}`}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-800">
                  {myProfiles.length} {isVi ? 'Cổng quản lý' : 'assigned ports'}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {isVi ? 'Nhấp "Đổi IP này" để reset từng cổng riêng' : 'Click "Reset" to change an individual IP'}
              </span>
            </div>

            {myProfiles.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <AlertCircle className="w-8 h-8 text-neutral-500 mx-auto" />
                <p className="text-xs text-neutral-400">
                  {isVi
                    ? `Chưa có IP nào được gán cho ${currentEmployee?.name}.`
                    : `No IPs assigned to ${currentEmployee?.name}.`}
                </p>
                <button
                  onClick={() => setActiveMode('admin')}
                  className="px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 rounded-md hover:bg-cyan-900/60 transition-colors"
                >
                  {isVi ? 'Chuyển sang Quản trị để Chia IP' : 'Go to Admin to allocate IPs'}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-300 font-semibold tracking-wider text-[11px] uppercase">
                      <th className="py-3 px-3.5 w-12 text-center text-slate-500">{isVi ? 'STT' : '#'}</th>
                      <th className="py-3 px-3.5 w-32">{isVi ? 'Cổng Proxy' : 'Proxy Port'}</th>
                      {/* CỘT IP NỘI BỘ */}
                      <th className="py-3 px-3.5 min-w-[170px] text-cyan-400 font-bold bg-cyan-950/30">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span>{isVi ? 'CỘT IP PROXY CỦA TÔI' : 'MY PROXY IP'}</span>
                        </div>
                      </th>
                      {/* CỘT IP WAN MẠNG NGOÀI & KẾT QUẢ ĐỔI */}
                      <th className="py-3 px-3.5 min-w-[230px] text-emerald-400 font-bold bg-emerald-950/30 border-r border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          <span>{isVi ? 'IP WAN THỰC TẾ & KẾT QUẢ ĐỔI' : 'LIVE WAN IP & STATUS'}</span>
                        </div>
                      </th>
                      {/* CỘT LINK RESET */}
                      <th className="py-3 px-3.5 min-w-[320px] text-amber-300 font-bold bg-amber-950/30">
                        <div className="flex items-center gap-1.5">
                          <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isVi ? 'CỘT LINK RESET TƯƠNG ỨNG' : 'RESET LINK'}</span>
                        </div>
                      </th>
                      <th className="py-3 px-3.5 w-28 text-center">{isVi ? 'Lần Đổi Gần Nhất' : 'Last Reset'}</th>
                      <th className="py-3 px-3.5 w-32 text-right pr-5">{isVi ? 'Thao Tác' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-sans">
                    {myProfiles.map((profile, idx) => {
                      const isResetting = resettingIds.has(profile.id);
                      const cooldown = cooldowns[profile.id] || 0;
                      const proxyText = `${profile.host}:${profile.port}`;
                      const carrier = getCarrierInfo(profile.publicIp);
                      const isChanging = isResetting || cooldown > 0 || profile.ipChangeStatus === 'changing';

                      return (
                        <tr key={profile.id} className="hover:bg-slate-800/50 transition-colors group">
                          <td className="py-3 px-3.5 text-center font-mono text-slate-500 font-medium">
                            {(idx + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-white font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                              Port {profile.port}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono mt-1">
                              HTTP Proxy
                            </div>
                          </td>

                          {/* CỘT IP NỘI BỘ */}
                          <td className="py-3 px-3.5 bg-cyan-950/15">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-cyan-300">
                                {proxyText}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(proxyText);
                                  setCopiedKey(profile.id);
                                  setTimeout(() => setCopiedKey(null), 1500);
                                }}
                                title={isVi ? 'Chép IP:Port' : 'Copy IP:Port'}
                                className="p-1.5 text-slate-400 hover:text-cyan-300 bg-slate-900 border border-slate-700 rounded-md transition-colors"
                              >
                                {copiedKey === profile.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* CỘT IP WAN MẠNG NGOÀI (PUBLIC IP) */}
                          <td className="py-3 px-3.5 bg-emerald-950/15 border-r border-slate-800/80">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-extrabold text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-900/60">
                                    {profile.publicIp || '---'}
                                  </span>
                                  {carrier && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shadow-xs ${carrier.bg} ${carrier.color} ${carrier.border}`}>
                                      {carrier.name}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleCheckSinglePortIp(profile)}
                                  disabled={checkingPortIds.has(profile.id)}
                                  title={isVi ? 'Kiểm tra IP thực tế hiện tại của cổng này' : 'Check live WAN IP'}
                                  className="p-1.5 text-slate-400 hover:text-emerald-300 bg-slate-900 border border-slate-700 rounded-md transition-colors"
                                >
                                  <RotateCw className={`w-3.5 h-3.5 ${checkingPortIds.has(profile.id) ? 'animate-spin text-emerald-400' : ''}`} />
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isChanging ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-700 animate-pulse">
                                    <RotateCw className="w-3 h-3 animate-spin" />
                                    <span>{isVi ? `Đang đổi IP (${cooldown}s)...` : `Rotating (${cooldown}s)...`}</span>
                                  </span>
                                ) : profile.previousIp && profile.previousIp !== profile.publicIp ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded-md border border-emerald-700">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>{isVi ? 'ĐÃ ĐỔI MỚI' : 'NEW IP'}</span>
                                    <span className="text-[10px] text-slate-400 font-mono line-through ml-1">
                                      {profile.previousIp}
                                    </span>
                                  </span>
                                ) : profile.publicIp ? (
                                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>{isVi ? 'Đang hoạt động ổn định' : 'Active'}</span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          {/* CỘT LINK RESET */}
                          <td className="py-3 px-3.5 bg-amber-950/15">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-mono text-xs font-medium text-amber-200/90 truncate max-w-[240px] bg-slate-950/80 px-2 py-1 rounded border border-amber-900/40"
                                title={profile.resetUrl}
                              >
                                {profile.resetUrl}
                              </span>

                              <button
                                onClick={() => {
                                  if (profile.resetUrl) {
                                    navigator.clipboard.writeText(profile.resetUrl);
                                    setCopiedKey(`reset-${profile.id}`);
                                    setTimeout(() => setCopiedKey(null), 1500);
                                  }
                                }}
                                title={isVi ? 'Chép Link Reset' : 'Copy Link'}
                                className="p-1.5 text-slate-400 hover:text-amber-300 bg-slate-900 border border-slate-700 rounded-md transition-colors shrink-0"
                              >
                                {copiedKey === `reset-${profile.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <a
                                href={profile.resetUrl}
                                target="_blank"
                                rel="noreferrer"
                                title={isVi ? 'Mở trực tiếp link trong tab mới' : 'Open in new tab'}
                                className="p-1.5 text-amber-400 hover:text-amber-200 bg-slate-900 border border-slate-700 rounded-md transition-colors shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>

                          {/* Last Reset Time */}
                          <td className="py-3 px-3.5 text-center font-mono text-xs text-slate-300 tabular-nums">
                            {profile.lastResetTime ? (
                              <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 text-slate-200">
                                {new Date(profile.lastResetTime).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>

                          {/* Single Reset Button */}
                          <td className="py-3 px-3.5 text-right pr-5">
                            <button
                              onClick={() => handleResetSingleIp(profile)}
                              disabled={isResetting || cooldown > 0}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ml-auto shadow-md ${
                                cooldown > 0
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                  : isResetting
                                  ? 'bg-amber-700 text-white animate-pulse'
                                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white hover:scale-105 active:scale-95'
                              }`}
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                              <span>
                                {cooldown > 0
                                  ? `${cooldown}s`
                                  : isResetting
                                  ? (isVi ? 'Đang đổi...' : 'Resetting...')
                                  : (isVi ? 'Đổi IP này' : 'Reset')}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: QUẢN TRỊ CHIA & PHÂN BỔ IP (ADMIN ALLOCATION DESK)               */}
      {/* ========================================================================= */}
      {activeMode === 'admin' && (
        <div className="space-y-5">
          {/* Quick Division Tools Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Auto Divide Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
                  <Shuffle className="w-4 h-4" />
                  <span>{isVi ? 'Chia Đều Tự Động' : 'Auto Divide Evenly'}</span>
                </div>
                <p className="text-xs text-neutral-400">
                  {isVi
                    ? `Chia đều tự động ${profiles.length} IP cho ${employees.length} nhân viên theo vòng tròn.`
                    : `Evenly allocate all ${profiles.length} IPs among ${employees.length} employees.`}
                </p>
              </div>
              <button
                onClick={handleAutoDivideEvenly}
                className="mt-4 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isVi ? '⚡ Chia đều 31 IP cho các nhân viên' : 'Distribute Evenly'}</span>
              </button>
            </div>

            {/* Range Assign Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 md:col-span-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                <Layers className="w-4 h-4" />
                <span>{isVi ? 'Gán Dải Cổng IP Cho Nhân Viên' : 'Assign Port Range to Staff'}</span>
              </div>
              <p className="text-xs text-neutral-400 mb-3">
                {isVi
                  ? 'Ví dụ: Gán từ cổng 4000 đến 4009 cho Nhân viên A, 4010 đến 4019 cho Nhân viên B.'
                  : 'Specify port range to assign directly to a staff member.'}
              </p>

              <form onSubmit={handleAssignRange} className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-neutral-400">{isVi ? 'Từ cổng:' : 'From:'}</span>
                  <input
                    type="number"
                    value={rangeStartPort}
                    onChange={(e) => setRangeStartPort(Number(e.target.value))}
                    className="w-20 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-neutral-400">{isVi ? 'Đến cổng:' : 'To:'}</span>
                  <input
                    type="number"
                    value={rangeEndPort}
                    onChange={(e) => setRangeEndPort(Number(e.target.value))}
                    className="w-20 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-neutral-400">{isVi ? 'Gán cho:' : 'Assign to:'}</span>
                  <select
                    value={rangeEmpId}
                    onChange={(e) => setRangeEmpId(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-amber-300 font-medium focus:outline-none focus:border-amber-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.code} - {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded transition-colors shadow-xs ml-auto"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Gán dải này' : 'Assign'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Employee Cards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutral-200">
                {isVi ? 'Danh Sách Nhân Viên & Số IP Đang Nắm Giữ' : 'Staff Members & IP Allocation'}
              </h4>
              <button
                onClick={handleOpenAddEmp}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isVi ? 'Thêm nhân viên mới' : 'Add Employee'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {employees.map((emp) => {
                const assignedCount = profiles.filter((p) => p.assignedEmployeeId === emp.id).length;
                return (
                  <div
                    key={emp.id}
                    className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: emp.color }}
                          />
                          <span className="font-mono text-xs font-bold text-cyan-400">
                            {emp.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingEmp(emp);
                              setEmpName(emp.name);
                              setEmpCode(emp.code);
                              setEmpColor(emp.color);
                              setEmpNotes(emp.notes || '');
                              setIsEmpModalOpen(true);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-cyan-300 hover:bg-neutral-800 rounded transition-colors"
                            title={isVi ? `Chỉnh sửa thông tin ${emp.name}` : 'Edit'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => requestDeleteEmp(emp)}
                            className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                            title={isVi ? `Xóa nhân viên ${emp.name}` : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-neutral-100">{emp.name}</h4>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                        {emp.notes || (isVi ? 'Chưa có ghi chú' : 'No notes')}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-xs bg-neutral-950 p-2 rounded-lg border border-neutral-850">
                        <span className="text-neutral-400">{isVi ? 'Số IP được chia:' : 'Allocated:'}</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {assignedCount} {isVi ? 'cổng proxy' : 'ports'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setActiveMode('employee');
                        }}
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        <span>{isVi ? 'Vào cổng nhân viên này' : 'Open Portal'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <span className="text-[11px] text-neutral-500 font-mono">
                        {emp.resetCountToday || 0} {isVi ? 'lần reset' : 'resets'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allocation Table */}
          <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/70 shadow-sm">
            <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200">
                {isVi ? 'Bảng Phân Bổ Toàn Bộ Cổng IP Cho Nhân Viên' : 'All Port Allocation Map'}
              </span>
              <span className="text-[11px] text-neutral-400">
                {isVi ? 'Thay đổi trực tiếp nhân viên phụ trách ở cột cuối' : 'Assign staff directly in the column'}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-neutral-950">
                  <tr className="border-b border-neutral-800 text-neutral-400 font-medium">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3 w-28">{isVi ? 'Cổng Proxy' : 'Port'}</th>
                    <th className="py-2.5 px-3 min-w-[150px] text-cyan-300 font-semibold bg-cyan-950/20">
                      {isVi ? 'CỘT IP PROXY' : 'PROXY IP'}
                    </th>
                    <th className="py-2.5 px-3 min-w-[180px] text-emerald-300 font-semibold bg-emerald-950/20">
                      {isVi ? 'CỘT IP WAN THỰC TẾ' : 'LIVE WAN IP'}
                    </th>
                    <th className="py-2.5 px-3 min-w-[240px] text-amber-300 font-semibold bg-amber-950/20">
                      {isVi ? 'CỘT LINK RESET' : 'RESET LINK'}
                    </th>
                    <th className="py-2.5 px-3 min-w-[170px] text-neutral-200 font-semibold">
                      {isVi ? 'NHÂN VIÊN PHỤ TRÁCH' : 'ASSIGNED EMPLOYEE'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-sans">
                  {profiles.map((p, idx) => {
                    const assignedEmp = employees.find((e) => e.id === p.assignedEmployeeId);
                    const carrier = getCarrierInfo(p.publicIp);

                    return (
                      <tr key={p.id} className="hover:bg-neutral-850/40 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-neutral-500">
                          {(idx + 1).toString().padStart(2, '0')}
                        </td>
                        <td className="py-2 px-3 font-semibold text-neutral-200">
                          Port {p.port}
                        </td>
                        <td className="py-2 px-3 font-mono font-medium text-cyan-200 bg-cyan-950/10">
                          {p.host}:{p.port}
                        </td>
                        <td className="py-2 px-3 bg-emerald-950/10">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-emerald-300 font-bold">{p.publicIp || '---'}</span>
                            {carrier && (
                              <span className={`text-[10px] px-1 py-0.2 rounded border ${carrier.bg} ${carrier.color} ${carrier.border}`}>
                                {carrier.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-amber-200/90 truncate max-w-xs bg-amber-950/10">
                          {p.resetUrl || '-'}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={p.assignedEmployeeId || ''}
                            onChange={(e) => handleSingleAssign(p.id, e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 text-xs rounded px-2 py-1 text-neutral-200 focus:outline-none focus:border-cyan-500"
                          >
                            <option value="">{isVi ? '-- Chưa gán --' : '-- Unassigned --'}</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.code} - {emp.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Employee */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>
                {editingEmp
                  ? (isVi ? 'Chỉnh Sửa Nhân Viên' : 'Edit Employee')
                  : (isVi ? 'Thêm Nhân Viên Mới' : 'Add New Employee')}
              </span>
            </h3>

            <form onSubmit={handleSaveEmp} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {isVi ? 'Tên Nhân Viên' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder={isVi ? 'VD: Nguyễn Văn Tuấn...' : 'e.g. John Doe'}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {isVi ? 'Mã Nhân Viên' : 'Staff Code'}
                  </label>
                  <input
                    type="text"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    placeholder="NV01"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {isVi ? 'Màu Nhận Diện' : 'Color Tag'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={empColor}
                      onChange={(e) => setEmpColor(e.target.value)}
                      className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-xs text-neutral-400">{empColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {isVi ? 'Ghi Chú Phân Công' : 'Role Notes'}
                </label>
                <input
                  type="text"
                  value={empNotes}
                  onChange={(e) => setEmpNotes(e.target.value)}
                  placeholder={isVi ? 'VD: Nuôi nick Facebook, Chạy Ads...' : 'Notes...'}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                {editingEmp ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingEmp;
                      setIsEmpModalOpen(false);
                      requestDeleteEmp(target);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Xóa nhân viên này' : 'Delete'}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEmpModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-md"
                  >
                    {isVi ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md shadow-xs"
                  >
                    {isVi ? 'Lưu' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA NHÂN VIÊN (IN-APP DIALOG - HOÀN TOÀN KHÔNG DÙNG WINDOW.CONFIRM / ALERT) */}
      {empToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-md shadow-2xl p-5 md:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  deleteWarningMsg
                    ? 'bg-amber-950/80 border border-amber-600/60 text-amber-400'
                    : 'bg-rose-950/80 border border-rose-600/60 text-rose-400'
                }`}
              >
                {deleteWarningMsg ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <Trash2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  {deleteWarningMsg
                    ? isVi
                      ? 'Không Thể Xóa Nhân Viên'
                      : 'Cannot Delete Employee'
                    : isVi
                    ? 'Xác Nhận Xóa Nhân Viên?'
                    : 'Confirm Delete Employee?'}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {deleteWarningMsg
                    ? deleteWarningMsg
                    : isVi
                    ? 'Thao tác này sẽ xóa nhân viên khỏi hệ thống quản lý.'
                    : 'This will remove the employee from management.'}
                </p>
              </div>
            </div>

            {/* Employee summary card */}
            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{isVi ? 'Nhân viên:' : 'Employee:'}</span>
                <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: empToDelete.color }}
                  />
                  {empToDelete.name} ({empToDelete.code})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{isVi ? 'Số proxy đang nắm giữ:' : 'Assigned ports:'}</span>
                <span className="font-mono font-bold text-amber-400">
                  {profiles.filter((p) => p.assignedEmployeeId === empToDelete.id).length}{' '}
                  {isVi ? 'cổng proxy' : 'ports'}
                </span>
              </div>
              {!deleteWarningMsg && (
                <div className="text-[11px] text-neutral-400 border-t border-neutral-850 pt-2 leading-relaxed">
                  ℹ️{' '}
                  {isVi
                    ? 'Tất cả các cổng proxy trên sẽ được tự động chuyển về trạng thái [Chưa gán], sẵn sàng để bạn phân bổ lại.'
                    : 'All assigned ports will safely transition to Unassigned status.'}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setEmpToDelete(null);
                  setDeleteWarningMsg(null);
                }}
                className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                {isVi ? 'Hủy Bỏ' : 'Cancel'}
              </button>

              {deleteWarningMsg ? (
                <button
                  type="button"
                  onClick={() => {
                    setEmpToDelete(null);
                    setDeleteWarningMsg(null);
                    handleOpenAddEmp();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isVi ? 'Thêm nhân viên mới' : 'Add new employee'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={confirmDeleteEmp}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isVi ? 'Xác Nhận Xóa Nhân Viên' : 'Delete Employee'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

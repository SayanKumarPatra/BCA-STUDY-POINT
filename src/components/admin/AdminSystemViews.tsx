import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Settings,
  Layers,
  Laptop,
  History,
  RefreshCw,
  Trash2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Monitor,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { Semester, DeviceBinding, AdminAuditLog } from '../../types';
import { api } from '../../services/api';
import { exportCsv, formatDateTimeIST, formatInr, type DateRangePreset } from './adminTypes';
import { ConfirmModal } from './AdminModals';

// =========================================================================
// 1. REPORTS VIEW
// =========================================================================

interface AdminReportsViewProps {
  dateRange: DateRangePreset;
  customStartDate: string;
  customEndDate: string;
  onChangeDateRange: (range: DateRangePreset) => void;
  onChangeCustomDates: (start: string, end: string) => void;
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  dateRange,
  customStartDate,
  customEndDate,
  onChangeDateRange,
  onChangeCustomDates,
}) => {
  const [report, setReport] = useState<{
    summary: {
      totalOrders: number;
      verifiedOrders: number;
      pendingOrders: number;
      rejectedOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
    };
    topSubjects: Array<{ productId: string; subjectCode: string; subjectName: string; count: number }>;
    packageBreakdown: Array<{ packageName: string; count: number; revenue: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getAdminReports({
        range: dateRange,
        startDate: customStartDate,
        endDate: customEndDate,
      })
      .then((res) => setReport(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dateRange, customStartDate, customEndDate]);

  const handleExportReport = () => {
    if (!report) return;
    exportCsv(
      `bca_sales_report_${dateRange}.csv`,
      ['Subject Code', 'Subject Name', 'Units Sold'],
      report.topSubjects.map((s) => [s.subjectCode, s.subjectName, s.count])
    );
  };

  const maxSubj = Math.max(1, ...(report?.topSubjects || []).map((s) => s.count));

  return (
    <div className="space-y-5">
      {/* Header & Date Selector */}
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD34E]/15 border border-[#FFE7A3]/30 text-[#FFD34E] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Sales & Product Analytics Report
              </h2>
              <p className="text-xs text-white/65">
                Computed strictly from actual verified & pending orders in the database.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            disabled={!report}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#FFE7A3] bg-white/10 hover:bg-white/20 border border-[#FFE7A3]/30 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Subject CSV</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeDateRange(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                dateRange === opt.id
                  ? 'btn-gold-primary shadow-sm'
                  : 'bg-black/35 text-white/75 hover:text-[#FFE7A3] border border-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs text-white/75">
            <Calendar className="w-3.5 h-3.5 text-[#FFD34E]" />
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onChangeCustomDates(e.target.value, customEndDate)}
              className="px-2.5 py-1.5 rounded-lg bg-black/45 border border-white/20 text-white text-xs [color-scheme:dark]"
            />
            <span>to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onChangeCustomDates(customStartDate, e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-black/45 border border-white/20 text-white text-xs [color-scheme:dark]"
            />
          </div>
        )}
      </div>

      {/* Report KPIs */}
      {loading && !report ? (
        <div className="liquid-glass-card rounded-2xl p-10 text-center text-xs text-white/60">
          Loading real report metrics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="liquid-glass-card rounded-2xl p-4">
              <span className="text-[11px] font-bold uppercase text-[#FFE7A3]/70 block">Verified Revenue</span>
              <span className="text-2xl font-black text-[#FFD34E] tabular-nums mt-1 block">
                {formatInr(report?.summary.totalRevenue)}
              </span>
            </div>
            <div className="liquid-glass-card rounded-2xl p-4">
              <span className="text-[11px] font-bold uppercase text-[#FFE7A3]/70 block">Total Orders</span>
              <span className="text-2xl font-black text-white tabular-nums mt-1 block">
                {report?.summary.totalOrders || 0}
              </span>
              <span className="text-[11px] text-white/60">
                {report?.summary.verifiedOrders || 0} verified · {report?.summary.pendingOrders || 0} pending
              </span>
            </div>
            <div className="liquid-glass-card rounded-2xl p-4">
              <span className="text-[11px] font-bold uppercase text-[#FFE7A3]/70 block">Avg Order Value</span>
              <span className="text-2xl font-black text-[#FFE7A3] tabular-nums mt-1 block">
                {formatInr(report?.summary.averageOrderValue)}
              </span>
            </div>
            <div className="liquid-glass-card rounded-2xl p-4">
              <span className="text-[11px] font-bold uppercase text-[#FFE7A3]/70 block">Rejected / Failed</span>
              <span className="text-2xl font-black text-rose-300 tabular-nums mt-1 block">
                {report?.summary.rejectedOrders || 0}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Purchased Subjects */}
            <div className="liquid-glass-card rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Top Purchased Subjects</h3>
              {(report?.topSubjects || []).length > 0 ? (
                <div className="space-y-3">
                  {report!.topSubjects.map((s) => (
                    <div key={s.productId} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white/90 truncate">
                          <span className="font-mono font-bold text-[#FFD34E] mr-1.5">
                            {s.subjectCode}
                          </span>
                          {s.subjectName}
                        </span>
                        <span className="font-bold text-[#FFE7A3] tabular-nums shrink-0">
                          {s.count} sold
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-black/40 border border-white/10 overflow-hidden">
                        <div
                          style={{ width: `${Math.round((s.count / maxSubj) * 100)}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-[#FFCE47] to-[#D99B00]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/50 py-8 text-center">No subject sales recorded yet.</p>
              )}
            </div>

            {/* Package Combination Breakdown */}
            <div className="liquid-glass-card rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Package & Bundle Breakdown</h3>
              {(report?.packageBreakdown || []).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/15 text-[11px] text-[#FFE7A3]/80 uppercase">
                        <th className="py-2 pr-3">Package Tier</th>
                        <th className="py-2 px-3 text-right">Orders</th>
                        <th className="py-2 pl-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {report!.packageBreakdown.map((pkg) => (
                        <tr key={pkg.packageName} className="hover:bg-white/5">
                          <td className="py-2.5 pr-3 font-semibold text-white">{pkg.packageName}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-white/75">
                            {pkg.count}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-black text-[#FFD34E] tabular-nums">
                            {formatInr(pkg.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-white/50 py-8 text-center">No package orders recorded yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// =========================================================================
// 2. SETTINGS VIEW (Semesters, Connected Devices, Audit Logs, Maintenance)
// =========================================================================

interface AdminSettingsViewProps {
  semesters: Semester[];
  devices: DeviceBinding[];
  auditLogs: AdminAuditLog[];
  onRefresh: () => void;
  onSyncAllToFirebase: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  semesters,
  devices,
  auditLogs,
  onRefresh,
  onSyncAllToFirebase,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'semesters' | 'devices' | 'audit' | 'system'>('semesters');

  // Add Semester State
  const [addingSem, setAddingSem] = useState(false);
  const [semNumber, setSemNumber] = useState(4);
  const [semTitle, setSemTitle] = useState('');
  const [semDesc, setSemDesc] = useState('');

  // Device Search & Reset State
  const [deviceSearch, setDeviceSearch] = useState('');
  const [resetTarget, setResetTarget] = useState<DeviceBinding | null>(null);
  const [resetReason, setResetReason] = useState('Student verified device replacement request');
  const [deleteDeviceTarget, setDeleteDeviceTarget] = useState<DeviceBinding | null>(null);

  // Audit Search & Clear Data Confirm
  const [auditSearch, setAuditSearch] = useState('');
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredDevices = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        (d.studentName || '').toLowerCase().includes(q) ||
        (d.userEmail || '').toLowerCase().includes(q) ||
        (d.os || '').toLowerCase().includes(q) ||
        (d.browser || '').toLowerCase().includes(q)
    );
  }, [devices, deviceSearch]);

  const filteredLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        (l.action || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  const deviceBreakdown = useMemo(() => {
    let mobile = 0;
    let desktop = 0;
    devices.forEach((d) => {
      const s = `${d.os} ${d.deviceDescription}`.toLowerCase();
      if (/android|iphone|ipad|mobile/.test(s)) mobile += 1;
      else desktop += 1;
    });
    return { total: devices.length, mobile, desktop };
  }, [devices]);

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSemester({
        semesterNumber: Number(semNumber),
        title: semTitle.trim(),
        academicYear: `Year ${Math.ceil(Number(semNumber) / 2)}`,
        description: semDesc.trim(),
      });
      onNotify(`Semester "${semTitle.trim()}" created.`);
      setAddingSem(false);
      setSemTitle('');
      setSemDesc('');
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to add semester', true);
    }
  };

  const handleToggleSemester = async (sem: Semester) => {
    try {
      await api.updateSemester(sem.id, { published: !sem.published });
      onNotify(`${sem.title} ${sem.published ? 'hidden' : 'published'}.`);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to toggle semester', true);
    }
  };

  const handleResetDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setIsProcessing(true);
    try {
      await api.resetDevice(resetTarget.userId, resetReason.trim());
      onNotify(`Reset bound device for ${resetTarget.studentName}.`);
      setResetTarget(null);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to reset device', true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deleteDeviceTarget) return;
    setIsProcessing(true);
    try {
      await api.deleteDevice(deleteDeviceTarget.userId);
      onNotify(`Removed device binding for ${deleteDeviceTarget.studentName}.`);
      setDeleteDeviceTarget(null);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to delete device binding', true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearTestData = async () => {
    setIsProcessing(true);
    try {
      const res = await api.clearTestData();
      onNotify(res.message || 'Test data cleared.');
      setConfirmClearData(false);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to clear test data', true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Subtabs */}
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD34E]/15 border border-[#FFE7A3]/30 text-[#FFD34E] flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              System Settings, Security & Semesters
            </h2>
            <p className="text-xs text-white/65">
              Manage academic semesters, 1:1 device security locks, admin audit logs, and Firebase synchronization.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'semesters', label: `Semesters (${semesters.length})`, icon: Layers },
              { id: 'devices', label: `Device Bindings (${devices.length})`, icon: Laptop },
              { id: 'audit', label: `Audit Logs (${auditLogs.length})`, icon: History },
              { id: 'system', label: 'Firebase & Maintenance', icon: ShieldCheck },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  subTab === t.id
                    ? 'btn-gold-primary shadow-sm'
                    : 'bg-black/35 text-white/75 hover:text-[#FFE7A3] border border-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Semesters Sub-tab */}
      {subTab === 'semesters' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAddingSem(!addingSem)}
              className="btn-gold-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Semester</span>
            </button>
          </div>

          {addingSem && (
            <form
              onSubmit={handleAddSemester}
              className="liquid-glass-card rounded-2xl border border-[#FFE7A3]/35 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Sem Number</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={semNumber}
                  onChange={(e) => setSemNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/15 text-white focus:outline-none focus:border-[#FFD34E]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={semTitle}
                  onChange={(e) => setSemTitle(e.target.value)}
                  placeholder="BCA Semester 4"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Description</label>
                <input
                  type="text"
                  value={semDesc}
                  onChange={(e) => setSemDesc(e.target.value)}
                  placeholder="Solved Question Banks"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                />
              </div>
              <button
                type="submit"
                className="btn-gold-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Save Semester
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {semesters.map((s) => (
              <div
                key={s.id}
                className="liquid-glass-card rounded-2xl p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#FFD34E]">
                    {s.academicYear} · Sem {s.semesterNumber}
                  </span>
                  <h4 className="text-sm font-bold text-white">{s.title}</h4>
                  <p className="text-xs text-white/65">{s.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSemester(s)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border shrink-0 ${
                    s.published
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                      : 'bg-white/10 text-white/65 border-white/15'
                  }`}
                >
                  {s.published ? 'Published' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Connected Devices Sub-tab */}
      {subTab === 'devices' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="liquid-glass-card rounded-2xl p-4">
              <span className="text-[11px] font-bold text-[#FFE7A3]/70 uppercase block">Total Devices</span>
              <span className="text-xl font-black text-white tabular-nums">{deviceBreakdown.total}</span>
            </div>
            <div className="liquid-glass-card rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#FFE7A3]/70 uppercase block">Mobile</span>
                <span className="text-xl font-black text-[#FFD34E] tabular-nums">{deviceBreakdown.mobile}</span>
              </div>
              <Smartphone className="w-5 h-5 text-[#FFD34E]" />
            </div>
            <div className="liquid-glass-card rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#FFE7A3]/70 uppercase block">Desktop</span>
                <span className="text-xl font-black text-[#FFE7A3] tabular-nums">{deviceBreakdown.desktop}</span>
              </div>
              <Monitor className="w-5 h-5 text-[#FFE7A3]" />
            </div>
          </div>

          <div className="liquid-glass-card rounded-2xl p-4 space-y-3">
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#FFD34E]/80 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                placeholder="Filter by student name, email, OS..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-black/45 border border-white/15 text-white placeholder-white/45 focus:outline-none focus:border-[#FFD34E]"
              />
            </div>

            <div className="divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden bg-black/25">
              {filteredDevices.map((d) => (
                <div
                  key={d.id}
                  className="p-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/5 text-xs"
                >
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{d.studentName}</div>
                      <div className="text-[11px] text-white/60 truncate">{d.userEmail}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white/90 truncate">
                        {d.os} · {d.browser}
                      </div>
                      <div className="text-[10px] font-mono text-white/45 truncate">IP: {d.lastIp}</div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-start justify-between gap-1 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          d.registrationStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                            : 'bg-white/10 text-white/65'
                        }`}
                      >
                        {d.registrationStatus}
                      </span>
                      <span className="text-[11px] text-white/65 truncate max-w-full">
                        {formatDateTimeIST(d.lastSeenAt)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end gap-1.5 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
                    <button
                      type="button"
                      onClick={() => setResetTarget(d)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#FFE7A3] bg-white/10 hover:bg-white/20 border border-[#FFE7A3]/30 cursor-pointer shrink-0"
                    >
                      Reset Lock
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteDeviceTarget(d)}
                      className="p-1.5 rounded-lg text-rose-200 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/35 cursor-pointer shrink-0"
                      title="Delete Device Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredDevices.length === 0 && (
                <div className="py-8 text-center text-xs text-white/50">
                  No bound devices found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Audit Logs Sub-tab */}
      {subTab === 'audit' && (
        <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#FFD34E]/80 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search action or details..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-black/45 border border-white/15 text-white placeholder-white/45 focus:outline-none focus:border-[#FFD34E]"
            />
          </div>

          <div className="divide-y divide-white/10 max-h-[520px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#FFD34E]/15 text-[#FFD34E] border border-[#FFE7A3]/30 mr-2">
                    {log.action}
                  </span>
                  <span className="text-white/85 font-medium">{log.details}</span>
                </div>
                <span className="text-[11px] text-white/50 whitespace-nowrap">
                  {formatDateTimeIST(log.timestamp)}
                </span>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <p className="py-8 text-center text-xs text-white/50">No audit logs found.</p>
            )}
          </div>
        </div>
      )}

      {/* 4. System & Firebase Maintenance Sub-tab */}
      {subTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="liquid-glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              <h3 className="text-sm font-bold text-white">Firebase RTDB Synchronization</h3>
            </div>
            <p className="text-xs text-white/75 leading-relaxed">
              Connected to existing project <code className="font-mono font-bold text-[#FFD34E]">bcastudypoint-cdfdf</code>. Every Admin Panel save updates the server database and syncs immediately to Firebase RTDB for all live visitors.
            </p>
            <button
              type="button"
              onClick={onSyncAllToFirebase}
              className="btn-gold-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Force Catalog Sync</span>
            </button>
          </div>

          <div className="liquid-glass-card rounded-2xl border border-rose-400/35 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-300" />
              <h3 className="text-sm font-bold text-white">Clean Test Orders & Sessions</h3>
            </div>
            <p className="text-xs text-white/75 leading-relaxed">
              Clears only explicit dummy/test orders (<code className="font-mono text-rose-200">dummy</code>, <code className="font-mono text-rose-200">test_</code>, etc.) without deleting real students, products, banners, packages, or verified orders.
            </p>
            <button
              type="button"
              onClick={() => setConfirmClearData(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Test Data Safely</span>
            </button>
          </div>
        </div>
      )}

      {/* Reset Device Reason Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="liquid-glass-master rounded-3xl max-w-md w-full p-5 border border-[#FFE7A3]/35 shadow-2xl text-left text-white">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/15">
              <h3 className="text-sm font-bold text-white">
                Reset Device Lock — {resetTarget.studentName}
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="p-1 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetDevice} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Reset Reason</label>
                <input
                  type="text"
                  required
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/15 text-white focus:outline-none focus:border-[#FFD34E]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white/80 bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-gold-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isProcessing ? 'Resetting...' : 'Reset Binding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteDeviceTarget)}
        title="Remove Device Binding"
        description={`Delete device record for ${deleteDeviceTarget?.studentName}?`}
        confirmLabel="Remove Binding"
        isProcessing={isProcessing}
        onCancel={() => setDeleteDeviceTarget(null)}
        onConfirm={handleDeleteDevice}
      />

      <ConfirmModal
        isOpen={confirmClearData}
        title="Clear Test Orders & Logs"
        description="This removes only synthetic test/dummy orders while keeping real customer orders, products, banners, and packages intact."
        confirmLabel="Clear Test Data"
        isProcessing={isProcessing}
        onCancel={() => setConfirmClearData(false)}
        onConfirm={handleClearTestData}
      />
    </div>
  );
};

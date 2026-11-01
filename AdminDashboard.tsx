"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  Search,
  Download,
  Filter,
  RefreshCw,
  PlusCircle,
  Eye,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  BarChart3,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

interface AttendanceRecord {
  id: number;
  userId: number;
  timestamp: string;
  type: string;
  status: string;
  confidenceScore: number;
  verificationMethod: string;
  snapshotUrl: string | null;
  deviceInfo: string | null;
  locationTag: string | null;
  notes: string | null;
  user: {
    id: number;
    employeeId: string;
    name: string;
    email: string;
    role: string;
    department: string;
    photoUrl: string | null;
    shiftStart: string;
    shiftEnd: string;
  };
}

interface StatsData {
  totalRegistered: number;
  activeEmployees: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onTimeCount: number;
  onTimeRate: number;
  attendanceRate: number;
  avgConfidence: number;
}

export default function AdminDashboard({
  onSwitchToRegister,
  onSwitchToCheckIn,
}: {
  onSwitchToRegister?: () => void;
  onSwitchToCheckIn?: () => void;
}) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("today"); // 'today' | '7days' | '30days' | 'all'
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  // Modals
  const [selectedSnapshot, setSelectedSnapshot] = useState<AttendanceRecord | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualUserId, setManualUserId] = useState<string>("");
  const [manualType, setManualType] = useState<"check_in" | "check_out">("check_in");
  const [manualNotes, setManualNotes] = useState<string>("Admin manual verification");
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);
  const [isResettingData, setIsResettingData] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes, usersRes] = await Promise.all([
        fetch("/api/attendance/stats"),
        fetch(`/api/attendance?date=${dateFilter}&limit=200`),
        fetch("/api/users"),
      ]);

      const statsJson = await statsRes.json();
      const logsJson = await logsRes.json();
      const usersJson = await usersRes.json();

      if (statsJson.success) {
        setStats(statsJson.stats);
        setHourlyData(statsJson.hourlyDistribution || []);
        setDepartmentData(statsJson.departmentStats || []);
        setTrendData(statsJson.past7Days || []);
      }

      if (logsJson.success) {
        setLogs(logsJson.logs || []);
      }

      if (usersJson.success) {
        setAllUsersList(usersJson.users || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter logs in memory
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !searchQuery ||
        log.user?.name.toLowerCase().includes(q) ||
        log.user?.employeeId.toLowerCase().includes(q) ||
        log.user?.department.toLowerCase().includes(q) ||
        (log.locationTag && log.locationTag.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "check_out" && log.type === "check_out") ||
        (statusFilter === "on_time" && log.status === "on_time" && log.type === "check_in") ||
        (statusFilter === "late" && log.status === "late" && log.type === "check_in");

      const matchDept = deptFilter === "all" || log.user?.department === deptFilter;

      return matchQuery && matchStatus && matchDept;
    });
  }, [logs, searchQuery, statusFilter, deptFilter]);

  // Paginated records
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      "Log ID",
      "Employee ID",
      "Employee Name",
      "Department",
      "Role",
      "Timestamp",
      "Type",
      "Status",
      "Biometric Confidence",
      "Verification Method",
      "Location Terminal",
      "Notes",
    ];

    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.user?.employeeId || ""}"`,
      `"${l.user?.name || ""}"`,
      `"${l.user?.department || ""}"`,
      `"${l.user?.role || ""}"`,
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.type}"`,
      `"${l.status}"`,
      `"${(l.confidenceScore * 100).toFixed(1)}%"`,
      `"${l.verificationMethod}"`,
      `"${l.locationTag || ""}"`,
      `"${l.notes || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FRS_Attendance_Report_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit manual attendance override
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUserId) return;
    setIsSubmittingManual(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualUserId,
          type: manualType,
          overrideNotes: manualNotes,
          locationTag: "Admin Manual Override Console",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsManualModalOpen(false);
        setManualNotes("Admin manual verification");
        fetchDashboardData();
      } else {
        alert(data.error || "Failed to submit override");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Reset database with fresh sample data
  const handleResetData = async () => {
    if (!confirm("Reset database with fresh sample employees and realistic attendance records?")) return;
    setIsResettingData(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResettingData(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Attendance Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Live Monitoring
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric facial recognition telemetry and workforce presence overview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-colors border border-slate-700"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            <span>Manual Override</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-colors border border-slate-700"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={handleResetData}
            disabled={isResettingData}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-950 text-slate-400 text-xs font-mono hover:text-cyan-400 border border-slate-800 transition-colors"
            title="Reset & seed sample data"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isResettingData ? "Resetting..." : "Demo Seed"}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Registered */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats?.totalRegistered ?? 8}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            <span className="text-emerald-400 font-bold">{stats?.activeEmployees ?? 8}</span> Active Staff
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-emerald-500/20 shadow-lg backdrop-blur-md bg-gradient-to-br from-emerald-950/20 to-slate-900/80">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Present Today</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats?.presentCount ?? 5}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            <span className="text-emerald-300 font-bold">{stats?.attendanceRate ?? 63}%</span> Turnout Rate
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Absent Today</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{stats?.absentCount ?? 3}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">Pending Check-in</div>
        </div>

        {/* Late Arrivals */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Late Arrivals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{stats?.lateCount ?? 1}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">After 09:15 AM</div>
        </div>

        {/* On-Time Arrival Rate */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">On-Time Rate</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">{stats?.onTimeRate ?? 80}%</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">Punctuality Score</div>
        </div>

        {/* Biometric Confidence */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Biometric Match</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">{stats?.avgConfidence ?? 97.4}%</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">Avg AI Accuracy</div>
        </div>
      </div>

      {/* Analytics Visualizations: Hourly Distribution & 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Check-In Pattern (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Peak Check-In Arrival Hours (Today)</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">07:00 — 18:00</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="onTime" name="On-Time Arrival" fill="#06b6d4" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="late" name="Late Arrival" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Attendance Trend (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">7-Day Attendance Trend</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Past Week</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="present"
                  name="Present Count"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#presentGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Attendance Logs Table with Live Filters */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Biometric Attendance Logs</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {filteredLogs.length} Records
                </span>
              </h2>
              <p className="text-xs text-slate-400">Search, filter, inspect snapshots, or export audit logs.</p>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              {[
                { id: "today", label: "Today" },
                { id: "7days", label: "7 Days" },
                { id: "30days", label: "30 Days" },
                { id: "all", label: "All History" },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDateFilter(d.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    dateFilter === d.id
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Status / Department Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by employee name, ID, or department..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="on_time">✅ On-Time Arrival</option>
                <option value="late">⚠️ Late Arrival</option>
                <option value="check_out">🚪 Check-Out Log</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="sm:col-span-3">
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="all">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Operations">Operations</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Type & Status</th>
                <th className="py-3 px-4">AI Biometric Match</th>
                <th className="py-3 px-4">Location Terminal</th>
                <th className="py-3 px-4 text-right">Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {paginatedLogs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const formattedDate = dateObj.toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const formattedTime = dateObj.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            log.snapshotUrl ||
                            log.user?.photoUrl ||
                            "https://api.dicebear.com/7.x/avataaars/svg?seed=user"
                          }
                          alt={log.user?.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">{log.user?.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.user?.employeeId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{log.user?.department}</div>
                      <div className="text-[10px] text-slate-400">{log.user?.role}</div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-white">{formattedTime}</div>
                      <div className="text-[10px] text-slate-400">{formattedDate}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {log.type === "check_out" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <span>🚪 Check-Out</span>
                        </span>
                      ) : log.status === "late" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Late Arrival</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>On-Time</span>
                        </span>
                      )}
                    </td>

                    {/* AI Biometric Confidence */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-950 rounded-full h-1.5 border border-slate-800 overflow-hidden">
                          <div
                            className="bg-cyan-400 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (log.confidenceScore || 0.95) * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-cyan-300 text-xs font-bold">
                          {((log.confidenceScore || 0.95) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono capitalize">
                        {log.verificationMethod.replace("_", " ")}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-slate-300 text-[11px] font-mono">
                      {log.locationTag || "HQ Main Kiosk"}
                    </td>

                    {/* Snapshot Zoom Trigger */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedSnapshot(log)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                        title="View face snapshot & audit details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                    No attendance records found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to{" "}
            <strong className="text-white">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> of{" "}
            <strong className="text-white">{filteredLogs.length}</strong> entries
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-semibold text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Inspector Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Facial Recognition Verification Audit</span>
              </h3>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center space-y-3">
              <img
                src={
                  selectedSnapshot.snapshotUrl ||
                  selectedSnapshot.user?.photoUrl ||
                  "https://api.dicebear.com/7.x/avataaars/svg?seed=user"
                }
                alt="Captured Snapshot"
                className="w-48 h-48 rounded-2xl object-cover border-2 border-cyan-500/60 shadow-xl"
              />
              <div className="text-center">
                <h4 className="text-lg font-extrabold text-white">{selectedSnapshot.user?.name}</h4>
                <p className="text-xs text-cyan-400 font-mono">{selectedSnapshot.user?.employeeId} • {selectedSnapshot.user?.department}</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Match Confidence:</span>
                <span className="text-emerald-400 font-bold">
                  {((selectedSnapshot.confidenceScore || 0.95) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-white">
                  {new Date(selectedSnapshot.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={selectedSnapshot.status === "late" ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                  {selectedSnapshot.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="text-white capitalize">{selectedSnapshot.verificationMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Terminal:</span>
                <span className="text-white">{selectedSnapshot.locationTag || "HQ Terminal"}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedSnapshot(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Close Audit View
            </button>
          </div>
        </div>
      )}

      {/* Manual Check-in Override Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <span>Manual Attendance Override</span>
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Employee
                </label>
                <select
                  required
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {allUsersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.employeeId}) - {u.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Attendance Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualType("check_in")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      manualType === "check_in"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    }`}
                  >
                    Check-In
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType("check_out")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      manualType === "check_out"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    }`}
                  >
                    Check-Out
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Override Reason / Notes
                </label>
                <input
                  type="text"
                  required
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Remote meeting / camera hardware glitch"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual || !manualUserId}
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingManual ? "Recording..." : "Save Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

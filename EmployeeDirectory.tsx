"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  UserPlus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Shield,
  Sparkles,
  RefreshCw,
  Edit2,
  Check,
  AlertCircle,
} from "lucide-react";

interface Employee {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  photoUrl: string | null;
  shiftStart: string;
  shiftEnd: string;
  isActive: boolean;
  phone: string | null;
  createdAt: string;
}

export default function EmployeeDirectory({
  onAddNew,
  onTestUser,
}: {
  onAddNew: () => void;
  onTestUser?: (user: Employee) => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user: Employee) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === user.id ? { ...e, isActive: !e.isActive } : e))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEmployee = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the facial recognition registry?`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setEmployees((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      e.name.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q);
    const matchesDept = selectedDept === "all" || e.department === selectedDept;
    return matchesQuery && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-white tracking-tight">Staff & Biometric Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {employees.length} Enrolled Staff
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage employee shift assignments, biometric activation status, and profiles.
          </p>
        </div>

        <button
          onClick={onAddNew}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-extrabold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Enroll New Employee</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg backdrop-blur-md grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, employee ID, role, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
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

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-3">
              {/* Avatar & Badges */}
              <div className="flex items-start justify-between">
                <div className="relative">
                  <img
                    src={
                      emp.photoUrl ||
                      "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(emp.name)
                    }
                    alt={emp.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 group-hover:border-cyan-400 transition-colors shadow-md"
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                      emp.isActive ? "bg-emerald-400" : "bg-slate-500"
                    }`}
                  />
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950 text-cyan-300 border border-slate-800">
                    {emp.employeeId}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      emp.isActive
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {emp.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div>
                <h3 className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                  {emp.name}
                </h3>
                <p className="text-xs text-slate-300 font-medium">{emp.role}</p>
                <p className="text-[11px] text-cyan-400/90 font-mono mt-0.5">{emp.department}</p>
              </div>

              {/* Shift Hours & Contact */}
              <div className="space-y-1 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Shift Schedule:</span>
                  <span className="text-slate-200">
                    {emp.shiftStart} - {emp.shiftEnd}
                  </span>
                </div>
                <div className="flex items-center justify-between truncate">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-300 truncate max-w-[130px]">{emp.email}</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <button
                onClick={() => toggleUserStatus(emp)}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                  emp.isActive
                    ? "bg-slate-800 text-slate-300 border-slate-700 hover:text-rose-400 hover:border-rose-500/40"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                }`}
              >
                {emp.isActive ? "Deactivate" : "Activate"}
              </button>

              <div className="flex items-center space-x-1">
                {onTestUser && (
                  <button
                    onClick={() => onTestUser(emp)}
                    title="Simulate Face Scan with this profile"
                    className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => deleteEmployee(emp.id, emp.name)}
                  title="Remove Employee"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredEmployees.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
            No enrolled employees found matching search query.
          </div>
        )}
      </div>
    </div>
  );
}

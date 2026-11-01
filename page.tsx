"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import FacialCheckIn from "@/components/FacialCheckIn";
import AdminDashboard from "@/components/AdminDashboard";
import UserRegistration from "@/components/UserRegistration";
import EmployeeDirectory from "@/components/EmployeeDirectory";
import KioskSettings from "@/components/KioskSettings";
import { ShieldCheck, Cpu, Activity, Sparkles } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"checkin" | "dashboard" | "register" | "employees" | "settings">("checkin");
  const [orgName, setOrgName] = useState<string>("ApexVision FRS");
  const [systemOnline, setSystemOnline] = useState<boolean>(true);

  // Fetch settings for org name
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings?.organizationName) {
          setOrgName(data.settings.organizationName);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#080d1a] bg-gradient-to-b from-[#080d1a] via-[#0d1424] to-[#080d1a] text-slate-100">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        orgName={orgName}
      />

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "checkin" && (
          <FacialCheckIn
            onSwitchToDashboard={() => setActiveTab("dashboard")}
            onSwitchToRegister={() => setActiveTab("register")}
          />
        )}

        {activeTab === "dashboard" && (
          <AdminDashboard
            onSwitchToRegister={() => setActiveTab("register")}
            onSwitchToCheckIn={() => setActiveTab("checkin")}
          />
        )}

        {activeTab === "register" && (
          <UserRegistration
            onEnrolledSuccess={(user) => {
              // Can switch or stay on view
            }}
          />
        )}

        {activeTab === "employees" && (
          <EmployeeDirectory
            onAddNew={() => setActiveTab("register")}
            onTestUser={(user) => {
              setActiveTab("checkin");
            }}
          />
        )}

        {activeTab === "settings" && <KioskSettings />}
      </main>

      {/* Futuristic Enterprise Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] text-slate-300">
              FRS Biometric Core v2.6 • Neural Matcher Online (128-D L2 Cosine)
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>AES-256 Biometric Vector Encryption</span>
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">PostgreSQL + Drizzle Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

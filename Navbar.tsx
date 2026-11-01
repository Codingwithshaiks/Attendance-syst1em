"use client";

import React, { useState, useEffect } from "react";
import {
  Scan,
  LayoutDashboard,
  UserPlus,
  Users,
  Settings,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { soundEffects } from "@/lib/audio";

interface NavbarProps {
  activeTab: "checkin" | "dashboard" | "register" | "employees" | "settings";
  setActiveTab: (tab: "checkin" | "dashboard" | "register" | "employees" | "settings") => void;
  orgName?: string;
  isKioskMode?: boolean;
  toggleKioskMode?: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  orgName = "ApexVision FRS",
  isKioskMode = false,
  toggleKioskMode,
}: NavbarProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.setSoundEnabled(next);
    if (next) soundEffects.playScanPing();
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("checkin")}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white font-bold">
              <Scan className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                  {orgName}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  FRS Live
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono hidden sm:block">AI Biometric Attendance Portal</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("checkin")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "checkin"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Face Check-In</span>
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("register")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "register"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll Face</span>
            </button>

            <button
              onClick={() => setActiveTab("employees")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "employees"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff List</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "settings"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Right Action Tools & Live Clock */}
          <div className="flex items-center space-x-3">
            {/* Live Clock Display */}
            <div className="hidden lg:flex flex-col items-end px-3 py-1 bg-slate-950/80 rounded-lg border border-slate-800 text-right font-mono">
              <span className="text-sm font-bold text-cyan-400 tracking-wider">{currentTime || "--:--:--"}</span>
              <span className="text-[10px] text-slate-400">{currentDate}</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundEnabled ? "Sound enabled (Click to mute)" : "Sound muted (Click to enable)"}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? "bg-slate-800/80 text-cyan-400 border-slate-700 hover:bg-slate-700"
                  : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={handleToggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("checkin")}
            className={`flex flex-col items-center py-1 px-2 rounded-md ${
              activeTab === "checkin" ? "text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            <Scan className="w-4 h-4 mb-0.5" />
            <span>Check-In</span>
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center py-1 px-2 rounded-md ${
              activeTab === "dashboard" ? "text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`flex flex-col items-center py-1 px-2 rounded-md ${
              activeTab === "register" ? "text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            <UserPlus className="w-4 h-4 mb-0.5" />
            <span>Enroll</span>
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`flex flex-col items-center py-1 px-2 rounded-md ${
              activeTab === "employees" ? "text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span>Staff</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center py-1 px-2 rounded-md ${
              activeTab === "settings" ? "text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span>Config</span>
          </button>
        </div>
      </div>
    </header>
  );
}

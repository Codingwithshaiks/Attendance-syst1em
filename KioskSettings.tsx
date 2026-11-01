"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  Clock,
  Volume2,
  Sliders,
  Building,
  Save,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
} from "lucide-react";
import { soundEffects } from "@/lib/audio";

export default function KioskSettings() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  // Settings State
  const [orgName, setOrgName] = useState<string>("Apex Cybernetics HQ");
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.72);
  const [livenessCheckEnabled, setLivenessCheckEnabled] = useState<boolean>(true);
  const [workStartTime, setWorkStartTime] = useState<string>("09:00");
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(15);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState<boolean>(true);
  const [kioskPasscode, setKioskPasscode] = useState<string>("1234");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setOrgName(s.organizationName || "Apex Cybernetics HQ");
        setConfidenceThreshold(s.confidenceThreshold ?? 0.72);
        setLivenessCheckEnabled(s.livenessCheckEnabled ?? true);
        setWorkStartTime(s.workStartTime || "09:00");
        setGracePeriodMinutes(s.gracePeriodMinutes ?? 15);
        setSoundEffectsEnabled(s.soundEffectsEnabled ?? true);
        setKioskPasscode(s.kioskModePasscode || "1234");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName,
          confidenceThreshold: parseFloat(confidenceThreshold.toString()),
          livenessCheckEnabled,
          workStartTime,
          gracePeriodMinutes: parseInt(gracePeriodMinutes.toString(), 10),
          soundEffectsEnabled,
          kioskModePasscode: kioskPasscode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        soundEffects.setSoundEnabled(soundEffectsEnabled);
        soundEffects.playSuccessTone();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSeed = async () => {
    if (!confirm("Are you sure you want to re-seed the database with clean sample employees and attendance logs?")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        soundEffects.playSuccessTone();
        alert("Database successfully reset and seeded!");
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">FRS System & Biometric Engine Settings</h1>
            <p className="text-xs text-slate-400">
              Configure facial recognition thresholds, shift grace parameters, and kiosk behavior.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Biometric Engine Settings */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Fingerprint className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Biometric AI Matcher Configuration</h3>
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">
                Minimum Match Confidence Threshold
              </label>
              <span className="font-mono text-cyan-400 font-bold">
                {Math.round(confidenceThreshold * 100)}% (Cosine: {confidenceThreshold.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.01"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Recommended: <strong>72% - 80%</strong>. Higher values require precise facial alignment; lower values allow faster tolerance.
            </p>
          </div>

          {/* Liveness Check Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">Anti-Spoofing & Liveness Check</span>
              <span className="text-[10px] text-slate-400">
                Detects micro-texture & illumination reflections to block printed photos
              </span>
            </div>
            <input
              type="checkbox"
              checked={livenessCheckEnabled}
              onChange={(e) => setLivenessCheckEnabled(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          {/* Sound & Speech */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-white block">Synthesizer Chimes & Voice Feedback</span>
              <span className="text-[10px] text-slate-400">
                Plays positive check-in audio chimes and voice name greeting
              </span>
            </div>
            <input
              type="checkbox"
              checked={soundEffectsEnabled}
              onChange={(e) => setSoundEffectsEnabled(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Card 2: Shift Policy & Organization Branding */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Shift & Punctuality Policy</h3>
          </div>

          {/* Org Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Work Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Standard Work Start
              </label>
              <input
                type="time"
                value={workStartTime}
                onChange={(e) => setWorkStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Grace Period (Mins)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={gracePeriodMinutes}
                onChange={(e) => setGracePeriodMinutes(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Arrivals after {workStartTime} + {gracePeriodMinutes} mins are flagged as <strong>Late Arrival</strong>.
          </p>

          {/* Kiosk Mode Pin */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kiosk Lock Passcode
            </label>
            <input
              type="password"
              value={kioskPasscode}
              onChange={(e) => setKioskPasscode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Submit & Demo Reset Buttons */}
        <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={handleResetSeed}
            disabled={resetting}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 text-xs font-mono border border-slate-800 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{resetting ? "Resetting Sample Data..." : "Reset Sample Data & Logs"}</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Configuration"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

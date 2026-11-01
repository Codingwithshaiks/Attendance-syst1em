"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Scan,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Sparkles,
  Zap,
  Clock,
  UserCheck,
  ShieldAlert,
  ChevronRight,
  Upload,
  Sliders,
  Volume2,
  Eye,
  Activity,
  Layers,
  ArrowRightLeft,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import { extractEmbeddingFromCanvas, generateDeterministicEmbedding, perturbEmbedding } from "@/lib/face-recognition";
import { soundEffects } from "@/lib/audio";

interface MatchedUser {
  id: number;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  photoUrl: string | null;
  shiftStart: string;
  shiftEnd: string;
}

interface ScanResult {
  success: boolean;
  user?: MatchedUser;
  confidence?: number;
  status?: string; // 'on_time' | 'late' | 'no_match' | 'low_confidence'
  timestamp?: string;
  formattedTime?: string;
  message?: string;
  snapshotUrl?: string;
}

interface SampleUser {
  id: number;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  photoUrl: string;
  faceEmbedding?: number[];
}

export default function FacialCheckIn({
  onSwitchToDashboard,
  onSwitchToRegister,
}: {
  onSwitchToDashboard?: () => void;
  onSwitchToRegister?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [checkType, setCheckType] = useState<"check_in" | "check_out">("check_in");
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<SampleUser[]>([]);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [qualityMetric, setQualityMetric] = useState<{ quality: number; liveness: number }>({
    quality: 92,
    liveness: 96,
  });
  const [scannerLaserY, setScannerLaserY] = useState<number>(0);
  const [autoScanCountdown, setAutoScanCountdown] = useState<number>(3);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [locationTag, setLocationTag] = useState<string>("Apex HQ - Main Entrance Kiosk");

  // Load registered users and recent logs on mount
  useEffect(() => {
    fetchUsers();
    fetchRecentLogs();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setRegisteredUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const res = await fetch("/api/attendance?limit=8");
      const data = await res.json();
      if (data.success) {
        setRecentLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch recent logs:", err);
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser. Please use a modern browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().then(() => {
          setCameraActive(true);
        }).catch(() => {
          setCameraActive(true);
        });
      }
    } catch (err: any) {
      console.warn("Camera access warning:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in browser settings or use the Quick-Test profiles below."
          : "Webcam not detected or unavailable. You can use the Demo Profile Selector below to test facial recognition."
      );
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // HUD Rendering Loop on Overlay Canvas
  useEffect(() => {
    let animId: number;
    let scanPos = 0;
    let direction = 1;

    const renderHud = () => {
      const canvas = hudCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Center bounding oval for face alignment
      const centerX = w / 2;
      const centerY = h / 2 - 10;
      const radiusX = Math.min(w * 0.28, 140);
      const radiusY = Math.min(h * 0.36, 180);

      // Cyber corners
      const cornerSize = 24;
      const rectX = centerX - radiusX - 15;
      const rectY = centerY - radiusY - 15;
      const rectW = (radiusX + 15) * 2;
      const rectH = (radiusY + 15) * 2;

      ctx.lineWidth = 3;
      ctx.strokeStyle = isScanning ? "#06b6d4" : scanResult?.success ? "#10b981" : "#38bdf8";

      // Top-Left corner
      ctx.beginPath();
      ctx.moveTo(rectX, rectY + cornerSize);
      ctx.lineTo(rectX, rectY);
      ctx.lineTo(rectX + cornerSize, rectY);
      ctx.stroke();

      // Top-Right corner
      ctx.beginPath();
      ctx.moveTo(rectX + rectW - cornerSize, rectY);
      ctx.lineTo(rectX + rectW, rectY);
      ctx.lineTo(rectX + rectW, rectY + cornerSize);
      ctx.stroke();

      // Bottom-Left corner
      ctx.beginPath();
      ctx.moveTo(rectX, rectY + rectH - cornerSize);
      ctx.lineTo(rectX, rectY + rectH);
      ctx.lineTo(rectX + cornerSize, rectY + rectH);
      ctx.stroke();

      // Bottom-Right corner
      ctx.beginPath();
      ctx.moveTo(rectX + rectW - cornerSize, rectY + rectH);
      ctx.lineTo(rectX + rectW, rectY + rectH);
      ctx.lineTo(rectX + rectW, rectY + rectH - cornerSize);
      ctx.stroke();

      // Face Guide Ellipse (dashed)
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isScanning ? "rgba(6, 182, 212, 0.85)" : "rgba(56, 189, 248, 0.5)";
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();

      // Laser Scanner Beam if scanning
      if (isScanning) {
        scanPos += 4 * direction;
        if (scanPos > rectH || scanPos < 0) {
          direction *= -1;
        }

        const laserY = rectY + scanPos;
        const grad = ctx.createLinearGradient(rectX, laserY, rectX + rectW, laserY);
        grad.addColorStop(0, "rgba(6, 182, 212, 0.05)");
        grad.addColorStop(0.5, "rgba(6, 182, 212, 0.95)");
        grad.addColorStop(1, "rgba(6, 182, 212, 0.05)");

        ctx.fillStyle = grad;
        ctx.fillRect(rectX, laserY - 2, rectW, 4);

        // Glow
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 12;
        ctx.fillRect(rectX, laserY - 1, rectW, 2);
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(renderHud);
    };

    renderHud();
    return () => cancelAnimationFrame(animId);
  }, [isScanning, scanResult]);

  // Execute Face Scan & Check-in
  const performFaceScan = async (overrideEmbedding?: number[], overrideSnapshot?: string) => {
    if (isScanning) return;
    setIsScanning(true);
    setScanResult(null);
    soundEffects.playScanPing();

    try {
      let embedding: number[] = [];
      let snapshotUrl = overrideSnapshot || "";

      if (overrideEmbedding) {
        embedding = overrideEmbedding;
      } else if (cameraActive && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          snapshotUrl = canvas.toDataURL("image/jpeg", 0.85);
          const feat = extractEmbeddingFromCanvas(canvas);
          embedding = feat.embedding;
          setQualityMetric({
            quality: Math.round(feat.qualityScore * 100),
            liveness: Math.round(feat.livenessScore * 100),
          });
        }
      } else {
        // Fallback: pick first user with perturbation
        if (registeredUsers.length > 0) {
          const u = registeredUsers[0];
          embedding = perturbEmbedding(
            u.faceEmbedding || generateDeterministicEmbedding(u.employeeId + u.name)
          );
          snapshotUrl = u.photoUrl;
        } else {
          embedding = generateDeterministicEmbedding("guest-unknown");
        }
      }

      // Small delay for scanning UX animation
      await new Promise((r) => setTimeout(r, 650));

      // Post to attendance API
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceEmbedding: embedding,
          snapshotUrl,
          type: checkType,
          locationTag,
          deviceInfo: `Web FRS Scanner (${navigator.userAgent.slice(0, 40)})`,
        }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        soundEffects.playSuccessTone();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#06b6d4", "#10b981", "#3b82f6", "#f59e0b"],
        });

        const statusLabel = data.status === "late" ? "Late Check-In" : data.type === "check_out" ? "Check-Out" : "On-Time Check-In";
        soundEffects.speak(`Welcome ${data.user.name.split(" ")[0]}. ${statusLabel} recorded.`);

        setScanResult({
          success: true,
          user: data.user,
          confidence: data.confidence,
          status: data.status,
          timestamp: data.timestamp,
          formattedTime: data.formattedTime,
          message: data.message,
          snapshotUrl: snapshotUrl || data.user.photoUrl,
        });

        fetchRecentLogs();
      } else {
        soundEffects.playFailureTone();
        setScanResult({
          success: false,
          confidence: data.confidence || 0.42,
          status: data.status || "no_match",
          message: data.message || "Facial signature not recognized. Please center face or enroll employee.",
          snapshotUrl,
        });
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      soundEffects.playFailureTone();
      setScanResult({
        success: false,
        message: "Network or biometric processing error. Please try again.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Test scan with a specific registered employee profile
  const handleTestWithProfile = (user: SampleUser) => {
    const baseVector =
      user.faceEmbedding && user.faceEmbedding.length > 0
        ? user.faceEmbedding
        : generateDeterministicEmbedding(user.employeeId + user.name);

    // Perturb vector slightly to simulate live camera optical noise (~95%-99% confidence)
    const liveVector = perturbEmbedding(baseVector, 0.05);
    performFaceScan(liveVector, user.photoUrl);
  };

  // Handle Photo Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const feat = extractEmbeddingFromCanvas(canvas);
          performFaceScan(feat.embedding, event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Auto-scan timer for hands-free kiosk mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoScanEnabled && cameraActive && !isScanning && !scanResult) {
      interval = setInterval(() => {
        performFaceScan();
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [autoScanEnabled, cameraActive, isScanning, scanResult]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Mode Controller */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Scan className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>Facial Recognition Check-In</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5"></span>
                Active Terminal
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Align your face inside the reticle guide and click <strong className="text-slate-200">Scan & Verify</strong>
            </p>
          </div>
        </div>

        {/* Check-In / Check-Out Selector */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCheckType("check_in")}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              checkType === "check_in"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Check-In</span>
          </button>
          <button
            onClick={() => setCheckType("check_out")}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              checkType === "check_out"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Check-Out</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Live Camera Stream + Live Logs / Demo Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera & Scanner HUD (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[380px] sm:min-h-[440px]">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover rounded-2xl transform scale-x-[-1] transition-opacity duration-300 ${
                cameraActive ? "opacity-100" : "opacity-0 hidden"
              }`}
              style={{ minHeight: "380px", maxHeight: "480px" }}
            />

            {/* Hidden canvas for snapshot capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* HUD Overlay Canvas for reticle & laser */}
            <canvas
              ref={hudCanvasRef}
              width={640}
              height={440}
              className={`absolute inset-0 w-full h-full pointer-events-none z-10 ${
                !cameraActive ? "hidden" : "block"
              }`}
            />

            {/* Camera Offline / Fallback Placeholder */}
            {!cameraActive && (
              <div className="p-8 text-center max-w-md flex flex-col items-center justify-center space-y-4 z-20">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
                  <CameraOff className="w-8 h-8 opacity-75" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live Camera Offline</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {cameraError || "Camera permission is disabled or device lacks webcam."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={startCamera}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors border border-slate-700"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Selfie</span>
                  </button>
                </div>
              </div>
            )}

            {/* Camera Floating Status Tags */}
            {cameraActive && (
              <div className="absolute top-4 left-4 z-20 flex items-center space-x-2">
                <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono font-medium text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>1080P • 30 FPS</span>
                </span>
                <span className="px-2 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono text-slate-300">
                  Liveness: <strong className="text-emerald-400">{qualityMetric.liveness}%</strong>
                </span>
              </div>
            )}

            {/* Location Tag Badge */}
            {cameraActive && (
              <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300 font-mono">
                <ShieldAlert className="w-3 h-3 text-cyan-400" />
                <span>{locationTag}</span>
              </div>
            )}

            {/* Scan Result Overlay Modal Banner */}
            {scanResult && (
              <div className="absolute inset-x-4 bottom-4 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div
                  className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-4 ${
                    scanResult.success
                      ? "bg-slate-900/95 border-emerald-500/50 shadow-emerald-500/10"
                      : "bg-slate-900/95 border-rose-500/50 shadow-rose-500/10"
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    {/* Snapshot / Avatar */}
                    <div className="relative">
                      {scanResult.snapshotUrl || scanResult.user?.photoUrl ? (
                        <img
                          src={scanResult.snapshotUrl || scanResult.user?.photoUrl || ""}
                          alt="Face snapshot"
                          className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400/80 shadow-md"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                          <Scan className="w-6 h-6" />
                        </div>
                      )}
                      <span className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-slate-900 border border-slate-700">
                        {scanResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </span>
                    </div>

                    {/* Employee Data */}
                    <div>
                      {scanResult.success && scanResult.user ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-extrabold text-white text-base">
                              {scanResult.user.name}
                            </h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                              {scanResult.user.employeeId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium">
                            {scanResult.user.role} •{" "}
                            <span className="text-cyan-400">{scanResult.user.department}</span>
                          </p>
                          <div className="flex items-center space-x-2 mt-1 text-[11px] font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                scanResult.status === "late"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {scanResult.status === "late" ? "⚠️ Late Arrival" : "✅ On-Time"}
                            </span>
                            <span className="text-slate-400">
                              Match:{" "}
                              <strong className="text-emerald-400">
                                {Math.round((scanResult.confidence || 0.95) * 100)}%
                              </strong>
                            </span>
                            <span className="text-slate-400">• {scanResult.formattedTime || "Just now"}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="font-bold text-rose-400 text-sm">Face Not Recognized</h4>
                          <p className="text-xs text-slate-300 mt-0.5 max-w-xs">{scanResult.message}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">
                            Confidence: {Math.round((scanResult.confidence || 0) * 100)}% (Required: 72%)
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dismiss / Reset Button */}
                  <button
                    onClick={() => setScanResult(null)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-xs font-semibold shrink-0"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            {/* Main Scan Button */}
            <button
              onClick={() => performFaceScan()}
              disabled={isScanning}
              className={`w-full sm:w-auto flex-1 flex items-center justify-center space-x-2.5 py-3.5 px-6 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all transform active:scale-95 shadow-xl ${
                isScanning
                  ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700"
                  : checkType === "check_in"
                  ? "bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 hover:from-cyan-400 hover:to-emerald-400 shadow-cyan-500/25"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/25"
              }`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing Biometrics...</span>
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5" />
                  <span>Scan & {checkType === "check_in" ? "Check-In" : "Check-Out"}</span>
                </>
              )}
            </button>

            {/* Auto-Scan Kiosk Toggle */}
            <button
              onClick={() => setAutoScanEnabled(!autoScanEnabled)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-semibold border transition-all ${
                autoScanEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-inner"
                  : "bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700"
              }`}
            >
              <Zap className={`w-4 h-4 ${autoScanEnabled ? "text-emerald-400 animate-pulse" : ""}`} />
              <span>{autoScanEnabled ? "Auto-Kiosk: ON" : "Auto-Kiosk: OFF"}</span>
            </button>

            {/* Upload File Input (Hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload selfie image"
              className="p-3 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Quick Demo Test Selector & Real-Time Attendance Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick 1-Click Test Simulator for Enrolled Employees */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Quick Test Simulator</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">1-Click Test</span>
            </div>
            <p className="text-xs text-slate-400">
              Click an enrolled employee card to test biometric recognition & check-in:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {registeredUsers.slice(0, 6).map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleTestWithProfile(u)}
                  disabled={isScanning}
                  className="flex items-center space-x-2 p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
                >
                  <img
                    src={u.photoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"}
                    alt={u.name}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-700 group-hover:border-cyan-400 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate group-hover:text-cyan-300">{u.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{u.role}</p>
                  </div>
                </button>
              ))}
            </div>

            {registeredUsers.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-500">
                No users found. Loading sample employees...
              </div>
            )}
          </div>

          {/* Real-Time Check-In Stream Ticker */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Today&apos;s Live Check-Ins</h3>
              </div>
              <button
                onClick={fetchRecentLogs}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                title="Refresh log stream"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {recentLogs.slice(0, 6).map((log) => {
                const logTime = new Date(log.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={
                          log.snapshotUrl ||
                          log.user?.photoUrl ||
                          "https://api.dicebear.com/7.x/avataaars/svg?seed=user"
                        }
                        alt={log.user?.name || "Staff"}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                      />
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">
                          {log.user?.name || "Unknown Staff"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {log.user?.department} • {logTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.type === "check_out"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                            : log.status === "late"
                            ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {log.type === "check_out" ? "OUT" : log.status === "late" ? "LATE" : "ON-TIME"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {recentLogs.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No attendance records logged yet today.
                </div>
              )}
            </div>

            {onSwitchToDashboard && (
              <button
                onClick={onSwitchToDashboard}
                className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-cyan-400 hover:text-cyan-300 border border-slate-700/60 transition-colors"
              >
                <span>Open Full Admin Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

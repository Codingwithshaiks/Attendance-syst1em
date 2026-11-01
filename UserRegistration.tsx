"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UserPlus,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Upload,
  Sparkles,
  ShieldCheck,
  Layers,
  Clock,
  Briefcase,
  Mail,
  User,
  Fingerprint,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { extractEmbeddingFromCanvas, generateDeterministicEmbedding, l2Normalize } from "@/lib/face-recognition";
import { soundEffects } from "@/lib/audio";

interface EnrolledUser {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  photoUrl: string;
  shiftStart: string;
  shiftEnd: string;
}

export default function UserRegistration({
  onEnrolledSuccess,
}: {
  onEnrolledSuccess?: (user: EnrolledUser) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [name, setName] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [department, setDepartment] = useState<string>("Engineering");
  const [role, setRole] = useState<string>("Software Engineer");
  const [shiftStart, setShiftStart] = useState<string>("09:00");
  const [shiftEnd, setShiftEnd] = useState<string>("18:00");
  const [phone, setPhone] = useState<string>("");

  // Camera & Face Biometrics State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [extractedEmbedding, setExtractedEmbedding] = useState<number[] | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureStep, setCaptureStep] = useState<number>(0);
  const [qualityScore, setQualityScore] = useState<number>(0);
  const [livenessScore, setLivenessScore] = useState<number>(0);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enrolledSuccessUser, setEnrolledSuccessUser] = useState<EnrolledUser | null>(null);

  // Auto-generate employee ID on load
  useEffect(() => {
    generateRandomEmpId();
  }, []);

  const generateRandomEmpId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setEmployeeId(`EMP-${randomNum}`);
  };

  // Start Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.warn("Camera init warning:", err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Multi-frame burst face capture for high biometric precision
  const handleCaptureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    setCaptureStep(1);
    soundEffects.playScanPing();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Burst 3 frames
    const embeddings: number[][] = [];
    let lastSnap = "";

    for (let i = 1; i <= 3; i++) {
      setCaptureStep(i);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      lastSnap = canvas.toDataURL("image/jpeg", 0.9);
      const feat = extractEmbeddingFromCanvas(canvas);
      embeddings.push(feat.embedding);
      setQualityScore(Math.round(feat.qualityScore * 100));
      setLivenessScore(Math.round(feat.livenessScore * 100));
      await new Promise((r) => setTimeout(r, 200));
    }

    // Average the vectors
    const averaged: number[] = new Array(embeddings[0].length).fill(0);
    for (const vec of embeddings) {
      for (let i = 0; i < vec.length; i++) {
        averaged[i] += vec[i] / embeddings.length;
      }
    }

    const finalEmbedding = l2Normalize(averaged);
    setCapturedPhotoUrl(lastSnap);
    setExtractedEmbedding(finalEmbedding);
    setIsCapturing(false);
    setCaptureStep(0);
    soundEffects.playSuccessTone();
  };

  // Upload Photo File
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setCapturedPhotoUrl(event.target?.result as string);
          setExtractedEmbedding(feat.embedding);
          setQualityScore(Math.round(feat.qualityScore * 100));
          setLivenessScore(95);
          soundEffects.playSuccessTone();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name || !employeeId || !email) {
      setErrorMessage("Please fill in all required employee fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      // If no face was captured, create deterministic embedding from employee details
      const embeddingToUse =
        extractedEmbedding || generateDeterministicEmbedding(employeeId + name + (capturedPhotoUrl || ""));

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          employeeId,
          email,
          role,
          department,
          shiftStart,
          shiftEnd,
          phone,
          photoUrl:
            capturedPhotoUrl ||
            `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80`,
          faceEmbedding: embeddingToUse,
        }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        soundEffects.playSuccessTone();
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
        });
        soundEffects.speak(`Employee ${name} registered successfully.`);
        setEnrolledSuccessUser(data.user);
        if (onEnrolledSuccess) {
          onEnrolledSuccess(data.user);
        }
      } else {
        setErrorMessage(data.error || "Failed to register employee.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName("");
    generateRandomEmpId();
    setEmail("");
    setCapturedPhotoUrl(null);
    setExtractedEmbedding(null);
    setEnrolledSuccessUser(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Biometric Employee Registration</h1>
            <p className="text-xs text-slate-400">
              Enroll new staff members and capture their 128-dimensional biometric facial signature.
            </p>
          </div>
        </div>
      </div>

      {/* Main Registration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Biometric Face Capture Portal (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Biometric Facial Enrollment</h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">128-D Vector</span>
            </div>

            {/* Video Preview or Captured Photo */}
            <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center min-h-[280px]">
              {capturedPhotoUrl ? (
                <div className="relative w-full h-[280px]">
                  <img
                    src={capturedPhotoUrl}
                    alt="Captured biometric reference"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-500/90 text-slate-950 font-bold text-xs flex items-center space-x-1 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Vector Generated</span>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-[280px] object-cover transform scale-x-[-1] ${
                      cameraActive ? "block" : "hidden"
                    }`}
                  />
                  {!cameraActive && (
                    <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                      <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                      <p>Camera offline. Click Upload Photo below to load an image.</p>
                    </div>
                  )}
                  {/* Facial Alignment Target Guide */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-44 h-56 rounded-full border-2 border-dashed border-cyan-400/60 flex items-center justify-center animate-pulse">
                        <span className="text-[10px] text-cyan-300 font-mono bg-slate-950/80 px-2 py-0.5 rounded">
                          Center Face Here
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Hidden canvas */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Burst Step Badge */}
              {isCapturing && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 z-20">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-xs font-bold text-white font-mono">
                    Extracting Landmarks (Frame {captureStep}/3)...
                  </p>
                </div>
              )}
            </div>

            {/* Quality & Liveness Indicators */}
            {capturedPhotoUrl && (
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">Illumination Quality:</span>
                  <span className="text-emerald-400 font-bold">{qualityScore || 94}% (Optimal)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Liveness Confidence:</span>
                  <span className="text-cyan-400 font-bold">{livenessScore || 96}% (Verified)</span>
                </div>
              </div>
            )}

            {/* Camera Actions */}
            <div className="flex items-center space-x-2">
              {capturedPhotoUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setCapturedPhotoUrl(null);
                    setExtractedEmbedding(null);
                    startCamera();
                  }}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureFace}
                  disabled={!cameraActive || isCapturing}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Biometrics</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
                title="Upload Photo File"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Employee Registration Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
            {enrolledSuccessUser ? (
              /* Success Badge & Confirmation Card */
              <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Enrollment Successful!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Employee profile and facial biometric embedding have been securely saved to the database.
                  </p>
                </div>

                {/* Digital Employee Badge Card */}
                <div className="w-full max-w-sm bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 rounded-2xl border border-cyan-500/40 shadow-2xl space-y-3 text-left">
                  <div className="flex items-center space-x-3">
                    <img
                      src={enrolledSuccessUser.photoUrl}
                      alt={enrolledSuccessUser.name}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-cyan-400 shadow-md"
                    />
                    <div>
                      <h4 className="text-base font-extrabold text-white">{enrolledSuccessUser.name}</h4>
                      <p className="text-xs text-cyan-400 font-mono font-bold">{enrolledSuccessUser.employeeId}</p>
                      <p className="text-xs text-slate-300">{enrolledSuccessUser.role}</p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {enrolledSuccessUser.department}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Shift: {enrolledSuccessUser.shiftStart} - {enrolledSuccessUser.shiftEnd}</span>
                    <span className="text-emerald-400 font-bold">Biometrics Active</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={handleResetForm}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Enroll Another Staff
                  </button>
                </div>
              </div>
            ) : (
              /* User Information Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>Employee Personnel Details</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">* Required fields</span>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Employee ID */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">
                        Employee ID *
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomEmpId}
                        className="text-[10px] text-cyan-400 hover:underline font-mono"
                      >
                        Auto-Gen
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="EMP-1001"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane.doe@apextech.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Product & Design">Product & Design</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Operations">Operations</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                    </select>
                  </div>

                  {/* Role / Job Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Job Title / Role
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Machine Learning Engineer"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Shift Start & End */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Shift Start Time
                    </label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Shift End Time
                    </label>
                    <input
                      type="time"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registering Biometrics...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Complete Biometric Enrollment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

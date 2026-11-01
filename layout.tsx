import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApexVision FRS | Facial Recognition Attendance System",
  description: "Enterprise mobile-responsive Facial Recognition System (FRS) for real-time biometric employee attendance, liveness detection, and analytics dashboard.",
  keywords: ["Facial Recognition", "Biometric Attendance", "FRS", "Computer Vision", "AI Check-in", "Workforce Analytics"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950 font-sans">
        {children}
      </body>
    </html>
  );
}

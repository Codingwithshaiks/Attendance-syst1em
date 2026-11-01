import { db } from "./index";
import { users, departments, attendanceLogs, systemSettings } from "./schema";
import { count, eq } from "drizzle-orm";
import { generateDeterministicEmbedding } from "@/lib/face-recognition";

export const SAMPLE_EMPLOYEES = [
  {
    employeeId: "EMP-1001",
    name: "Dr. Sarah Mitchell",
    email: "sarah.mitchell@apextech.io",
    role: "Lead AI Research Scientist",
    department: "Engineering",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    phone: "+1 (555) 234-8901",
    pinCode: "1001",
    isActive: true,
  },
  {
    employeeId: "EMP-1002",
    name: "Alex Thorne",
    email: "alex.thorne@apextech.io",
    role: "Principal Frontend Architect",
    department: "Engineering",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    phone: "+1 (555) 345-9012",
    pinCode: "1002",
    isActive: true,
  },
  {
    employeeId: "EMP-1003",
    name: "Marcus Vance",
    email: "marcus.vance@apextech.io",
    role: "Head of Product Design",
    department: "Product & Design",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    phone: "+1 (555) 456-0123",
    pinCode: "1003",
    isActive: true,
  },
  {
    employeeId: "EMP-1004",
    name: "Elena Rostova",
    email: "elena.rostova@apextech.io",
    role: "VP of People & Culture",
    department: "Human Resources",
    photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
    shiftStart: "08:30",
    shiftEnd: "17:30",
    phone: "+1 (555) 567-1234",
    pinCode: "1004",
    isActive: true,
  },
  {
    employeeId: "EMP-1005",
    name: "David Chen",
    email: "david.chen@apextech.io",
    role: "Senior Cloud Infrastructure Engineer",
    department: "Engineering",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    shiftStart: "09:30",
    shiftEnd: "18:30",
    phone: "+1 (555) 678-2345",
    pinCode: "1005",
    isActive: true,
  },
  {
    employeeId: "EMP-1006",
    name: "Priya Patel",
    email: "priya.patel@apextech.io",
    role: "Director of Global Operations",
    department: "Operations",
    photoUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80",
    shiftStart: "08:00",
    shiftEnd: "17:00",
    phone: "+1 (555) 789-3456",
    pinCode: "1006",
    isActive: true,
  },
  {
    employeeId: "EMP-1007",
    name: "Jordan Hayes",
    email: "jordan.hayes@apextech.io",
    role: "Growth Marketing Lead",
    department: "Marketing",
    photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    phone: "+1 (555) 890-4567",
    pinCode: "1007",
    isActive: true,
  },
  {
    employeeId: "EMP-1008",
    name: "Carlos Rivera",
    email: "carlos.rivera@apextech.io",
    role: "Enterprise Solutions Executive",
    department: "Sales",
    photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    phone: "+1 (555) 901-5678",
    pinCode: "1008",
    isActive: true,
  },
];

export async function ensureDatabaseSeeded() {
  try {
    const userCountResult = await db.select({ count: count() }).from(users);
    const userCount = Number(userCountResult[0]?.count || 0);

    // Seed departments if empty
    const deptCountResult = await db.select({ count: count() }).from(departments);
    if (Number(deptCountResult[0]?.count || 0) === 0) {
      const depts = [
        { name: "Engineering", code: "ENG", description: "Software, AI, and Infrastructure" },
        { name: "Product & Design", code: "PRD", description: "Product Management and UX/UI Design" },
        { name: "Human Resources", code: "HR", description: "Talent Acquisition and Employee Relations" },
        { name: "Operations", code: "OPS", description: "Global Facilities and IT Infrastructure" },
        { name: "Marketing", code: "MKT", description: "Growth, Brand, and Communications" },
        { name: "Sales", code: "SLS", description: "Enterprise and Account Management" },
      ];
      for (const d of depts) {
        await db.insert(departments).values(d).onConflictDoNothing();
      }
    }

    // Seed system settings if empty
    const settingsCountResult = await db.select({ count: count() }).from(systemSettings);
    if (Number(settingsCountResult[0]?.count || 0) === 0) {
      await db.insert(systemSettings).values({
        organizationName: "Apex Cybernetics HQ",
        confidenceThreshold: 0.72,
        livenessCheckEnabled: true,
        workStartTime: "09:00",
        gracePeriodMinutes: 15,
        autoCaptureIntervalMs: 2500,
        kioskModePasscode: "1234",
        soundEffectsEnabled: true,
      });
    }

    if (userCount === 0) {
      console.log("Seeding sample employees and face descriptors...");
      const createdUsers = [];

      for (const emp of SAMPLE_EMPLOYEES) {
        const embedding = generateDeterministicEmbedding(emp.employeeId + emp.name);
        const [u] = await db
          .insert(users)
          .values({
            ...emp,
            faceEmbedding: embedding,
          })
          .returning();
        createdUsers.push(u);
      }

      // Create attendance logs for today
      const today = new Date();
      
      // 1. Dr. Sarah Mitchell - Checked in early today (8:45 AM)
      const t1 = new Date(today);
      t1.setHours(8, 46, 12, 0);
      await db.insert(attendanceLogs).values({
        userId: createdUsers[0].id,
        timestamp: t1,
        type: "check_in",
        status: "on_time",
        confidenceScore: 0.984,
        verificationMethod: "facial_live",
        snapshotUrl: createdUsers[0].photoUrl,
        deviceInfo: "Main Terminal Kiosk #1 (Chrome 128 / macOS)",
        locationTag: "Apex HQ - Lobby Portal A",
        notes: "Automated biometric match verified (98.4%)",
      });

      // 2. Alex Thorne - Checked in on time (8:58 AM)
      const t2 = new Date(today);
      t2.setHours(8, 58, 30, 0);
      await db.insert(attendanceLogs).values({
        userId: createdUsers[1].id,
        timestamp: t2,
        type: "check_in",
        status: "on_time",
        confidenceScore: 0.967,
        verificationMethod: "facial_live",
        snapshotUrl: createdUsers[1].photoUrl,
        deviceInfo: "Mobile Web Scanner (iOS Safari)",
        locationTag: "Apex HQ - South Entrance",
        notes: "Liveness verification passed: 0.97",
      });

      // 3. Marcus Vance - Checked in slightly late (9:28 AM)
      const t3 = new Date(today);
      t3.setHours(9, 28, 15, 0);
      await db.insert(attendanceLogs).values({
        userId: createdUsers[2].id,
        timestamp: t3,
        type: "check_in",
        status: "late",
        confidenceScore: 0.952,
        verificationMethod: "facial_live",
        snapshotUrl: createdUsers[2].photoUrl,
        deviceInfo: "Main Terminal Kiosk #2 (Linux Touch)",
        locationTag: "Apex HQ - Lobby Portal B",
        notes: "Late arrival recorded (+28 mins)",
      });

      // 4. Elena Rostova - Checked in (8:25 AM)
      const t4 = new Date(today);
      t4.setHours(8, 25, 40, 0);
      await db.insert(attendanceLogs).values({
        userId: createdUsers[3].id,
        timestamp: t4,
        type: "check_in",
        status: "on_time",
        confidenceScore: 0.991,
        verificationMethod: "facial_live",
        snapshotUrl: createdUsers[3].photoUrl,
        deviceInfo: "HR Floor Tablet Scanner",
        locationTag: "Apex HQ - 4th Floor HR",
        notes: "Standard biometric scan",
      });

      // 5. David Chen - Checked in (9:10 AM)
      const t5 = new Date(today);
      t5.setHours(9, 10, 5, 0);
      await db.insert(attendanceLogs).values({
        userId: createdUsers[4].id,
        timestamp: t5,
        type: "check_in",
        status: "on_time",
        confidenceScore: 0.978,
        verificationMethod: "facial_live",
        snapshotUrl: createdUsers[4].photoUrl,
        deviceInfo: "Main Terminal Kiosk #1",
        locationTag: "Apex HQ - Lobby Portal A",
        notes: "Automated biometric match verified",
      });

      // Seed previous days logs for richer analytics charts
      for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - dayOffset);

        for (let i = 0; i < 6; i++) {
          const user = createdUsers[i];
          const checkInTime = new Date(pastDate);
          const isLate = Math.random() < 0.2;
          checkInTime.setHours(isLate ? 9 : 8, Math.floor(Math.random() * 50) + 10, 0, 0);

          await db.insert(attendanceLogs).values({
            userId: user.id,
            timestamp: checkInTime,
            type: "check_in",
            status: isLate ? "late" : "on_time",
            confidenceScore: 0.93 + Math.random() * 0.06,
            verificationMethod: "facial_live",
            snapshotUrl: user.photoUrl,
            deviceInfo: "Main Terminal Kiosk #1",
            locationTag: "Apex HQ - Lobby Portal A",
            createdAt: checkInTime,
          });

          // Check out in evening
          const checkOutTime = new Date(pastDate);
          checkOutTime.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 59), 0, 0);
          await db.insert(attendanceLogs).values({
            userId: user.id,
            timestamp: checkOutTime,
            type: "check_out",
            status: "on_time",
            confidenceScore: 0.94 + Math.random() * 0.05,
            verificationMethod: "facial_live",
            snapshotUrl: user.photoUrl,
            deviceInfo: "Main Terminal Kiosk #1",
            locationTag: "Apex HQ - Exit Gate 1",
            createdAt: checkOutTime,
          });
        }
      }

      console.log("Database seeded successfully!");
    }
  } catch (err) {
    console.error("Error ensuring seed data:", err);
  }
}

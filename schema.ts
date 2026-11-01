import { pgTable, text, serial, timestamp, doublePrecision, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("Staff"), // e.g. Senior Software Engineer, Product Designer, HR Specialist, Admin
  department: text("department").notNull().default("Engineering"),
  photoUrl: text("photo_url"),
  // Stores 64-128 floating point feature vector representing biometric facial descriptor
  faceEmbedding: jsonb("face_embedding").$type<number[]>(),
  shiftStart: text("shift_start").notNull().default("09:00"),
  shiftEnd: text("shift_end").notNull().default("18:00"),
  isActive: boolean("is_active").notNull().default(true),
  phone: text("phone"),
  pinCode: text("pin_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendanceLogs = pgTable("attendance_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  type: text("type").notNull().default("check_in"), // 'check_in' | 'check_out'
  status: text("status").notNull().default("on_time"), // 'on_time' | 'late' | 'early_departure' | 'overtime'
  confidenceScore: doublePrecision("confidence_score").notNull().default(0.95), // 0.0 - 1.0 (e.g. 0.96 = 96%)
  verificationMethod: text("verification_method").notNull().default("facial_live"), // 'facial_live' | 'facial_photo' | 'manual_override' | 'kiosk'
  snapshotUrl: text("snapshot_url"),
  deviceInfo: text("device_info"),
  locationTag: text("location_tag").default("HQ Main Entrance Kiosk"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  organizationName: text("organization_name").notNull().default("Apex Cybernetics HQ"),
  confidenceThreshold: doublePrecision("confidence_threshold").notNull().default(0.72),
  livenessCheckEnabled: boolean("liveness_check_enabled").notNull().default(true),
  workStartTime: text("work_start_time").notNull().default("09:00"),
  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(15),
  autoCaptureIntervalMs: integer("auto_capture_interval_ms").notNull().default(2500),
  kioskModePasscode: text("kiosk_mode_passcode").notNull().default("1234"),
  soundEffectsEnabled: boolean("sound_effects_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  attendanceLogs: many(attendanceLogs),
}));

export const attendanceLogsRelations = relations(attendanceLogs, ({ one }) => ({
  user: one(users, {
    fields: [attendanceLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type NewAttendanceLog = typeof attendanceLogs.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;

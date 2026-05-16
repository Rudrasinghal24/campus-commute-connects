import { pgTable, text, integer, boolean, bigint } from "drizzle-orm/pg-core";

export const studentsTable = pgTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  rollNo: text("roll_no").notNull().unique(),
  branch: text("branch").notNull(),
  semester: text("semester").notNull(),
  phone: text("phone").notNull().unique(),
  parentPhone: text("parent_phone").notNull().unique(),
  routeId: text("route_id").notNull(),
  pickupPoint: text("pickup_point").notNull(),
  seatNo: text("seat_no").notNull(),
  photo: text("photo"),
  feesPaid: boolean("fees_paid").notNull().default(false),
  passwordHash: text("password_hash").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const busesTable = pgTable("buses", {
  id: text("id").primaryKey(),
  number: text("number").notNull(),
  capacity: integer("capacity").notNull(),
  routeId: text("route_id").notNull(),
  driver: text("driver").notNull(),
  conductor: text("conductor").notNull(),
});

export const routesTable = pgTable("routes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  stops: text("stops").notNull(),
  fare: integer("fare").notNull(),
});

export const tripsTable = pgTable("trips", {
  id: text("id").primaryKey(),
  busId: text("bus_id").notNull(),
  routeId: text("route_id").notNull(),
  status: text("status").notNull().default("active"),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  endedAt: bigint("ended_at", { mode: "number" }),
});

export const attendanceLogsTable = pgTable("attendance_logs", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  type: text("type").notNull(),
  ts: bigint("ts", { mode: "number" }).notNull(),
  busId: text("bus_id").notNull(),
  verified: boolean("verified").notNull().default(false),
  conductorOverride: boolean("conductor_override").notNull().default(false),
});

export const paymentsTable = pgTable("payments", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  amount: integer("amount").notNull(),
  ts: bigint("ts", { mode: "number" }).notNull(),
  status: text("status").notNull().default("paid"),
});

export const suspiciousEntriesTable = pgTable("suspicious_entries", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  reason: text("reason").notNull(),
  ts: bigint("ts", { mode: "number" }).notNull(),
  busId: text("bus_id").notNull(),
  capturedImage: text("captured_image"),
  seatNo: text("seat_no"),
  resolved: boolean("resolved").notNull().default(false),
});

export const conductorOverridesTable = pgTable("conductor_overrides", {
  id: text("id").primaryKey(),
  suspiciousEntryId: text("suspicious_entry_id").notNull(),
  studentId: text("student_id").notNull(),
  conductorName: text("conductor_name").notNull(),
  remarks: text("remarks").notNull(),
  ts: bigint("ts", { mode: "number" }).notNull(),
  attendanceType: text("attendance_type").notNull(),
});

export type DbStudent = typeof studentsTable.$inferSelect;
export type DbBus = typeof busesTable.$inferSelect;
export type DbRoute = typeof routesTable.$inferSelect;
export type DbTrip = typeof tripsTable.$inferSelect;
export type DbAttendanceLog = typeof attendanceLogsTable.$inferSelect;
export type DbPayment = typeof paymentsTable.$inferSelect;
export type DbSuspiciousEntry = typeof suspiciousEntriesTable.$inferSelect;
export type DbConductorOverride = typeof conductorOverridesTable.$inferSelect;

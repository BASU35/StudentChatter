import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  university: text("university"),
  isOnline: boolean("is_online").default(false),
  lastActive: timestamp("last_active").defaultNow(),
});

// Report table schema
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: serial("reporter_id").references(() => users.id),
  reportedId: serial("reported_id").references(() => users.id),
  reason: text("reason").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Message schema (for in-memory storage)
export type Message = {
  id: string;
  senderId: number;
  receiverId: number;
  text: string;
  timestamp: Date;
};

// ChatRoom schema (for in-memory storage)
export type ChatRoom = {
  id: string;
  participants: [number, number];
  createdAt: Date;
  active: boolean;
};

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  university: true,
});

export const insertReportSchema = createInsertSchema(reports).pick({
  reporterId: true,
  reportedId: true,
  reason: true,
  details: true,
});

// Custom schemas for validation
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const emailVerificationSchema = z.object({
  email: z.string().email().refine(email => {
    // Common educational domains
    const eduDomains = ['.edu', '.ac.uk', '.edu.au', '.ac.nz', '.edu.sg', '.ac.za'];
    return eduDomains.some(domain => email.toLowerCase().endsWith(domain));
  }, { message: 'Must be a valid educational email address' })
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;

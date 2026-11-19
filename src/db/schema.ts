import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  role: text('role').notNull(), 
  email: text('email').unique(),
  password: text('password'),
  doctorId: text('doctor_id').unique(),
  mobileNumber: text('mobile_number'),
  profilePhotoUrl: text('profile_photo_url'),
});

export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').references(() => users.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  mode: text('mode').notNull(), 
  symptoms: jsonb('symptoms').notNull(),
  aiDiagnosis: text('ai_diagnosis').notNull(),
  severity: text('severity').notNull(),
  status: text('status').notNull(),
  transcript: jsonb('transcript').notNull(),
  prescription: text('prescription'),
  patientLocation: jsonb('patient_location'),
  doctorNotes: text('doctor_notes'),
});

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').references(() => users.id).notNull(),
  doctorId: uuid('doctor_id').references(() => users.id).notNull(),
  date: timestamp('date').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull(),
  paymentStatus: text('payment_status').notNull(),
  amount: integer('amount').notNull(),
});

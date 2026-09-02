import { int, json, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

export const accountRoleValues = ["user", "admin", "child", "teacher", "parent"] as const;
export type AccountRole = (typeof accountRoleValues)[number];

/** Core identity managed by Manus OAuth. Roles are assigned through the Reader Leader onboarding flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", accountRoleValues).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const readerClasses = mysqlTable("readerClasses", {
  id: int("id").autoincrement().primaryKey(),
  teacherUserId: int("teacherUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  joinCode: varchar("joinCode", { length: 12 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const childProfiles = mysqlTable("childProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("displayName", { length: 80 }).notNull(),
  bookBand: varchar("bookBand", { length: 80 }).notNull().default("Level 3 · Sky Blue"),
  familyCode: varchar("familyCode", { length: 12 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const classEnrollments = mysqlTable("classEnrollments", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("classId").notNull().references(() => readerClasses.id, { onDelete: "cascade" }),
  childProfileId: int("childProfileId").notNull().references(() => childProfiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [unique("class_child_unique").on(table.classId, table.childProfileId)]);

export const familyLinks = mysqlTable("familyLinks", {
  id: int("id").autoincrement().primaryKey(),
  parentUserId: int("parentUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  childProfileId: int("childProfileId").notNull().references(() => childProfiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [unique("parent_child_unique").on(table.parentUserId, table.childProfileId)]);

export const readingMaterials = mysqlTable("readingMaterials", {
  id: int("id").autoincrement().primaryKey(),
  teacherUserId: int("teacherUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  readingLevel: varchar("readingLevel", { length: 80 }).notNull(),
  sourceText: text("sourceText").notNull(),
  sourceFilename: varchar("sourceFilename", { length: 255 }),
  storageKey: varchar("storageKey", { length: 512 }),
  status: mysqlEnum("status", ["draft", "assigned"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExerciseQuestion = { prompt: string; options: string[]; answer: string; explanation: string };
export type ExerciseSet = { vocabulary: { word: string; childFriendlyMeaning: string }[]; questions: ExerciseQuestion[]; activity: string };

export const readingExercises = mysqlTable("readingExercises", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull().unique().references(() => readingMaterials.id, { onDelete: "cascade" }),
  exerciseSet: json("exerciseSet").$type<ExerciseSet>().notNull(),
  modelName: varchar("modelName", { length: 80 }).notNull(),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const materialAssignments = mysqlTable("materialAssignments", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("classId").notNull().references(() => readerClasses.id, { onDelete: "cascade" }),
  materialId: int("materialId").notNull().references(() => readingMaterials.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
}, table => [unique("assigned_material_class_unique").on(table.classId, table.materialId)]);

export type StoredIntervention = { word: string; action: "prompt" | "model" | "stay_silent" | "teacher_review"; note: string };

export const readingSessions = mysqlTable("readingSessions", {
  id: int("id").autoincrement().primaryKey(),
  childProfileId: int("childProfileId").notNull().references(() => childProfiles.id, { onDelete: "cascade" }),
  materialId: int("materialId").references(() => readingMaterials.id, { onDelete: "set null" }),
  storyTitle: varchar("storyTitle", { length: 180 }).notNull(),
  transcript: text("transcript").notNull(),
  accuracy: int("accuracy").notNull(),
  wordsCorrectPerMinute: int("wordsCorrectPerMinute").notNull(),
  durationSeconds: int("durationSeconds").notNull(),
  audioStorageKey: varchar("audioStorageKey", { length: 512 }),
  completed: int("completed").notNull().default(1),
  practiceWords: json("practiceWords").$type<string[]>().notNull(),
  interventions: json("interventions").$type<StoredIntervention[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizAnswer = { questionIndex: number; selectedAnswer: string; correct: boolean };

export const quizAttempts = mysqlTable("quizAttempts", {
  id: int("id").autoincrement().primaryKey(),
  childProfileId: int("childProfileId").notNull().references(() => childProfiles.id, { onDelete: "cascade" }),
  materialId: int("materialId").notNull().references(() => readingMaterials.id, { onDelete: "cascade" }),
  answers: json("answers").$type<QuizAnswer[]>().notNull(),
  score: int("score").notNull(),
  totalQuestions: int("totalQuestions").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ReadingMaterial = typeof readingMaterials.$inferSelect;
export type ReadingSession = typeof readingSessions.$inferSelect;

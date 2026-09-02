import { and, desc, eq, inArray } from "drizzle-orm";
import {
  AccountRole,
  childProfiles,
  classEnrollments,
  familyLinks,
  materialAssignments,
  readerClasses,
  readingExercises,
  readingMaterials,
  readingSessions,
  type ExerciseSet,
  type StoredIntervention,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

export type AuthenticatedReader = { id: number; role: AccountRole };

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Reader Leader data is temporarily unavailable.");
  return db;
}

export function isTeacher(role: AccountRole) {
  return role === "teacher" || role === "admin";
}

export async function setUserRole(userId: number, role: "child" | "teacher" | "parent") {
  const db = await requireDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("Account not found.");
  if (user.role !== "user" && user.role !== role && user.role !== "admin") {
    throw new Error("This account already has a Reader Leader role.");
  }
  if (user.role !== "admin") await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getChildProfileForUser(userId: number) {
  const db = await requireDb();
  const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.userId, userId)).limit(1);
  return profile;
}

export async function createChildProfile(userId: number, displayName: string, familyCode: string) {
  const db = await requireDb();
  const [existing] = await db.select().from(childProfiles).where(eq(childProfiles.userId, userId)).limit(1);
  if (existing) return existing;
  await db.insert(childProfiles).values({ userId, displayName, familyCode });
  const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.userId, userId)).limit(1);
  if (!profile) throw new Error("Could not create child profile.");
  return profile;
}

export async function createClassForTeacher(teacherUserId: number, name: string, joinCode: string) {
  const db = await requireDb();
  const [existing] = await db.select().from(readerClasses).where(eq(readerClasses.teacherUserId, teacherUserId)).limit(1);
  if (existing) return existing;
  await db.insert(readerClasses).values({ teacherUserId, name, joinCode });
  const [readerClass] = await db.select().from(readerClasses).where(eq(readerClasses.teacherUserId, teacherUserId)).limit(1);
  if (!readerClass) throw new Error("Could not create class.");
  return readerClass;
}

export async function linkParentToFamily(parentUserId: number, familyCode: string) {
  const db = await requireDb();
  const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.familyCode, familyCode)).limit(1);
  if (!profile) throw new Error("We could not find a child profile with that family code.");
  await db.insert(familyLinks).values({ parentUserId, childProfileId: profile.id }).onDuplicateKeyUpdate({ set: { parentUserId } });
  return profile;
}

export async function enrollChildInClass(childUserId: number, joinCode: string) {
  const db = await requireDb();
  const profile = await getChildProfileForUser(childUserId);
  if (!profile) throw new Error("Create a child profile before joining a class.");
  const [readerClass] = await db.select().from(readerClasses).where(eq(readerClasses.joinCode, joinCode)).limit(1);
  if (!readerClass) throw new Error("We could not find a class with that code.");
  await db.insert(classEnrollments).values({ classId: readerClass.id, childProfileId: profile.id }).onDuplicateKeyUpdate({ set: { classId: readerClass.id } });
  return readerClass;
}

export async function mayAccessChildProfile(viewer: AuthenticatedReader, childProfileId: number) {
  if (viewer.role === "admin") return true;
  const db = await requireDb();
  if (viewer.role === "child") {
    const [row] = await db.select({ id: childProfiles.id }).from(childProfiles).where(and(eq(childProfiles.id, childProfileId), eq(childProfiles.userId, viewer.id))).limit(1);
    return Boolean(row);
  }
  if (viewer.role === "parent") {
    const [row] = await db.select({ id: familyLinks.id }).from(familyLinks).where(and(eq(familyLinks.childProfileId, childProfileId), eq(familyLinks.parentUserId, viewer.id))).limit(1);
    return Boolean(row);
  }
  if (viewer.role === "teacher") {
    const [row] = await db.select({ id: classEnrollments.id }).from(classEnrollments)
      .innerJoin(readerClasses, eq(classEnrollments.classId, readerClasses.id))
      .where(and(eq(classEnrollments.childProfileId, childProfileId), eq(readerClasses.teacherUserId, viewer.id))).limit(1);
    return Boolean(row);
  }
  return false;
}

export async function createReadingMaterial(input: { teacherUserId: number; title: string; readingLevel: string; sourceText: string; sourceFilename?: string; storageKey?: string }) {
  const db = await requireDb();
  await db.insert(readingMaterials).values(input);
  const [material] = await db.select().from(readingMaterials).where(and(eq(readingMaterials.teacherUserId, input.teacherUserId), eq(readingMaterials.title, input.title))).orderBy(desc(readingMaterials.id)).limit(1);
  if (!material) throw new Error("Could not save reading material.");
  return material;
}

export async function listTeacherMaterials(teacherUserId: number) {
  const db = await requireDb();
  return db.select().from(readingMaterials).where(eq(readingMaterials.teacherUserId, teacherUserId)).orderBy(desc(readingMaterials.createdAt));
}

export async function listAssignedMaterialsForChild(childUserId: number) {
  const db = await requireDb();
  return db.select({
    id: readingMaterials.id,
    title: readingMaterials.title,
    readingLevel: readingMaterials.readingLevel,
    sourceText: readingMaterials.sourceText,
    exerciseSet: readingExercises.exerciseSet,
  }).from(childProfiles)
    .innerJoin(classEnrollments, eq(childProfiles.id, classEnrollments.childProfileId))
    .innerJoin(materialAssignments, eq(classEnrollments.classId, materialAssignments.classId))
    .innerJoin(readingMaterials, eq(materialAssignments.materialId, readingMaterials.id))
    .leftJoin(readingExercises, eq(readingMaterials.id, readingExercises.materialId))
    .where(and(eq(childProfiles.userId, childUserId), eq(readingMaterials.status, "assigned")))
    .orderBy(desc(materialAssignments.assignedAt));
}

export async function saveGeneratedExercises(materialId: number, exerciseSet: ExerciseSet, modelName: string) {
  const db = await requireDb();
  await db.insert(readingExercises).values({ materialId, exerciseSet, modelName }).onDuplicateKeyUpdate({ set: { exerciseSet, modelName } });
  const [exercise] = await db.select().from(readingExercises).where(eq(readingExercises.materialId, materialId)).limit(1);
  if (!exercise) throw new Error("Could not save generated exercises.");
  return exercise;
}

export async function approveExercises(teacherUserId: number, materialId: number) {
  const db = await requireDb();
  const [material] = await db.select().from(readingMaterials).where(and(eq(readingMaterials.id, materialId), eq(readingMaterials.teacherUserId, teacherUserId))).limit(1);
  if (!material) throw new Error("This reading material is not available to your class.");
  await db.update(readingExercises).set({ approvedAt: new Date() }).where(eq(readingExercises.materialId, materialId));
  await db.update(readingMaterials).set({ status: "assigned" }).where(eq(readingMaterials.id, materialId));
  const classes = await db.select().from(readerClasses).where(eq(readerClasses.teacherUserId, teacherUserId));
  if (classes.length) {
    await db.insert(materialAssignments).values(classes.map(readerClass => ({ classId: readerClass.id, materialId }))).onDuplicateKeyUpdate({ set: { materialId } });
  }
}

export async function saveReadingSession(input: {
  childProfileId: number;
  materialId?: number | null;
  storyTitle: string;
  transcript: string;
  accuracy: number;
  wordsCorrectPerMinute: number;
  durationSeconds: number;
  practiceWords: string[];
  interventions: StoredIntervention[];
}) {
  const db = await requireDb();
  await db.insert(readingSessions).values({ ...input, materialId: input.materialId ?? null, completed: 1 });
  const [session] = await db.select().from(readingSessions).where(eq(readingSessions.childProfileId, input.childProfileId)).orderBy(desc(readingSessions.id)).limit(1);
  if (!session) throw new Error("Could not save reading session.");
  return session;
}

export async function getChildProgress(childProfileId: number) {
  const db = await requireDb();
  const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.id, childProfileId)).limit(1);
  if (!profile) throw new Error("Child profile not found.");
  const sessions = await db.select().from(readingSessions).where(eq(readingSessions.childProfileId, childProfileId)).orderBy(desc(readingSessions.createdAt)).limit(10);
  const total = sessions.length || 1;
  const averageAccuracy = Math.round(sessions.reduce((sum, session) => sum + session.accuracy, 0) / total);
  const averageWcpm = Math.round(sessions.reduce((sum, session) => sum + session.wordsCorrectPerMinute, 0) / total);
  const practiceWords = Array.from(new Set(sessions.flatMap(session => session.practiceWords))).slice(0, 4);
  return { profile, sessions, summary: { sessionsCompleted: sessions.length, averageAccuracy, averageWcpm, practiceWords } };
}

export async function getTeacherDashboard(teacherUserId: number) {
  const db = await requireDb();
  const classes = await db.select().from(readerClasses).where(eq(readerClasses.teacherUserId, teacherUserId));
  if (!classes.length) return { classes, pupils: [], needsReview: [], materials: [] };
  const classIds = classes.map(readerClass => readerClass.id);
  const enrolled = await db.select({ childProfileId: classEnrollments.childProfileId, classId: classEnrollments.classId, displayName: childProfiles.displayName, bookBand: childProfiles.bookBand })
    .from(classEnrollments).innerJoin(childProfiles, eq(classEnrollments.childProfileId, childProfiles.id)).where(inArray(classEnrollments.classId, classIds));
  const profileIds = enrolled.map(row => row.childProfileId);
  const sessions = profileIds.length ? await db.select().from(readingSessions).where(inArray(readingSessions.childProfileId, profileIds)).orderBy(desc(readingSessions.createdAt)) : [];
  const pupils = enrolled.map(pupil => {
    const pupilSessions = sessions.filter(session => session.childProfileId === pupil.childProfileId);
    const count = pupilSessions.length || 1;
    return { ...pupil, sessionCount: pupilSessions.length, accuracy: Math.round(pupilSessions.reduce((sum, session) => sum + session.accuracy, 0) / count), wcpm: Math.round(pupilSessions.reduce((sum, session) => sum + session.wordsCorrectPerMinute, 0) / count) };
  });
  const needsReview = sessions.flatMap(session => session.interventions.filter(intervention => intervention.action === "teacher_review").map(intervention => ({ sessionId: session.id, childProfileId: session.childProfileId, storyTitle: session.storyTitle, ...intervention }))).slice(0, 5);
  const materials = await listTeacherMaterials(teacherUserId);
  return { classes, pupils, needsReview, materials };
}

export async function getParentDashboard(parentUserId: number) {
  const db = await requireDb();
  const children = await db.select({ childProfileId: childProfiles.id, displayName: childProfiles.displayName, bookBand: childProfiles.bookBand })
    .from(familyLinks).innerJoin(childProfiles, eq(familyLinks.childProfileId, childProfiles.id)).where(eq(familyLinks.parentUserId, parentUserId));
  const progress = await Promise.all(children.map(async child => ({ ...child, ...(await getChildProgress(child.childProfileId)) })));
  return { children: progress };
}

/** Creates a clearly labelled cohort only when an administrator requests it from the dashboard. */
export async function seedDemoCohort(adminUserId: number) {
  const db = await requireDb();
  const ensureUser = async (openId: string, name: string, role: "child" | "parent") => {
    await db.insert(users).values({ openId, name, loginMethod: "reader-leader-demo", role }).onDuplicateKeyUpdate({ set: { name, role } });
    const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (!user) throw new Error("Could not create a demo account.");
    return user;
  };

  const [existingClass] = await db.select().from(readerClasses).where(and(eq(readerClasses.teacherUserId, adminUserId), eq(readerClasses.joinCode, "DEMO-READ"))).limit(1);
  const readerClass = existingClass ?? (await (async () => {
    await db.insert(readerClasses).values({ teacherUserId: adminUserId, name: "Reader Leader Demo Class", joinCode: "DEMO-READ" });
    const [created] = await db.select().from(readerClasses).where(and(eq(readerClasses.teacherUserId, adminUserId), eq(readerClasses.joinCode, "DEMO-READ"))).limit(1);
    if (!created) throw new Error("Could not create the demo class.");
    return created;
  })());

  const aminaUser = await ensureUser("reader-leader-demo-amina", "Amina Roe (Demo)", "child");
  const leoUser = await ensureUser("reader-leader-demo-leo", "Leo Davies (Demo)", "child");
  const parentUser = await ensureUser("reader-leader-demo-parent", "Amina’s Parent (Demo)", "parent");

  const ensureProfile = async (userId: number, displayName: string, bookBand: string, familyCode: string) => {
    await db.insert(childProfiles).values({ userId, displayName, bookBand, familyCode }).onDuplicateKeyUpdate({ set: { displayName, bookBand, familyCode } });
    const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.userId, userId)).limit(1);
    if (!profile) throw new Error("Could not create a demo reading profile.");
    return profile;
  };
  const amina = await ensureProfile(aminaUser.id, "Amina Roe", "Level 3 · Sky Blue", "FAMILY-AMINA");
  const leo = await ensureProfile(leoUser.id, "Leo Davies", "Level 4 · Gold", "FAMILY-LEO");
  await db.insert(classEnrollments).values([{ classId: readerClass.id, childProfileId: amina.id }, { classId: readerClass.id, childProfileId: leo.id }]).onDuplicateKeyUpdate({ set: { classId: readerClass.id } });
  await db.insert(familyLinks).values({ parentUserId: parentUser.id, childProfileId: amina.id }).onDuplicateKeyUpdate({ set: { parentUserId: parentUser.id } });

  const [existingSession] = await db.select({ id: readingSessions.id }).from(readingSessions).where(eq(readingSessions.childProfileId, amina.id)).limit(1);
  if (!existingSession) {
    await db.insert(readingSessions).values([
      { childProfileId: amina.id, storyTitle: "The Moonlight Kite", transcript: "Mina found a bright kite caught in the tall grass.", accuracy: 91, wordsCorrectPerMinute: 108, durationSeconds: 92, completed: 1, practiceWords: ["glimmered", "gentle"], interventions: [{ word: "glimmered", action: "teacher_review", note: "Possible pronunciation variation — the coach stayed silent for teacher review." }] },
      { childProfileId: leo.id, storyTitle: "Rainy-Day Robot", transcript: "Rain tapped on Zuri's window all afternoon.", accuracy: 95, wordsCorrectPerMinute: 116, durationSeconds: 84, completed: 1, practiceWords: ["afternoon"], interventions: [] },
    ]);
  }
  return { readerClass, childProfiles: [amina, leo], demoParentOpenId: parentUser.openId };
}

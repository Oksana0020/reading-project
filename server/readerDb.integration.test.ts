import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { childProfiles, classEnrollments, familyLinks, homePracticeChecklists, learnerReadingSettings, parentReminders, readerClasses, users } from "../drizzle/schema";
import { getDb } from "./db";
import { addLearnerToTeacherClass, addLearnersToTeacherClass, createAdditionalClassForTeacher, getTeacherDashboard, listParentReminders, markAllParentRemindersRead, markParentReminderRead, saveHomePracticeChecklist } from "./readerDb";

const databaseAvailable = Boolean(process.env.DATABASE_URL);
const testKey = `rlt-${crypto.randomUUID()}`;
const createdUserIds: number[] = [];
const createdClassIds: number[] = [];
const createdParentIds: number[] = [];

async function insertUser(openId: string, name: string, role: "teacher" | "child" | "parent") {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable for integration coverage.");
  await db.insert(users).values({ openId, name, loginMethod: "vitest", role });
  const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!user) throw new Error("Could not create test account.");
  createdUserIds.push(user.id);
  if (role === "parent") createdParentIds.push(user.id);
  return user;
}

afterEach(async () => {
  if (!databaseAvailable) return;
  const db = await getDb();
  if (!db) return;
  for (const parentId of createdParentIds) {
    await db.delete(parentReminders).where(eq(parentReminders.parentUserId, parentId));
    await db.delete(homePracticeChecklists).where(eq(homePracticeChecklists.parentUserId, parentId));
    await db.delete(familyLinks).where(eq(familyLinks.parentUserId, parentId));
  }
  for (const classId of createdClassIds) await db.delete(classEnrollments).where(eq(classEnrollments.classId, classId));
  for (const userId of createdUserIds) {
    await db.delete(learnerReadingSettings).where(eq(learnerReadingSettings.childProfileId, userId));
  }
  for (const userId of createdUserIds) {
    const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.userId, userId)).limit(1);
    if (profile) await db.delete(learnerReadingSettings).where(eq(learnerReadingSettings.childProfileId, profile.id));
    if (profile) await db.delete(childProfiles).where(eq(childProfiles.id, profile.id));
  }
  for (const classId of createdClassIds) await db.delete(readerClasses).where(eq(readerClasses.id, classId));
  for (const userId of createdUserIds) await db.delete(users).where(eq(users.id, userId));
  createdUserIds.length = 0;
  createdClassIds.length = 0;
  createdParentIds.length = 0;
});

describe.skipIf(!databaseAvailable)("Reader Leader persisted class and reminder workflows", () => {
  it("creates a teacher class, adds a learner, and returns it in the authorised roster dashboard", async () => {
    const teacher = await insertUser(`${testKey}-teacher`, "Test Teacher", "teacher");
    const readerClass = await createAdditionalClassForTeacher(teacher.id, "Test Owls", `T${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`);
    createdClassIds.push(readerClass.id);
    const learner = await addLearnerToTeacherClass({ teacherUserId: teacher.id, classId: readerClass.id, displayName: "Test Learner", bookBand: "Level 4 · Gold", familyCode: `F${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}` });
    createdUserIds.push(learner.profile.userId);

    const dashboard = await getTeacherDashboard(teacher.id);
    expect(dashboard.classes).toEqual(expect.arrayContaining([expect.objectContaining({ id: readerClass.id, name: "Test Owls", pupilCount: 1 })]));
    expect(dashboard.pupils).toEqual(expect.arrayContaining([expect.objectContaining({ childProfileId: learner.profile.id, classId: readerClass.id, displayName: "Test Learner", bookBand: "Level 4 · Gold" })]));
  });

  it("adds a valid bulk roster while returning duplicate-row feedback", async () => {
    const teacher = await insertUser(`${testKey}-bulk-teacher`, "Bulk Teacher", "teacher");
    const readerClass = await createAdditionalClassForTeacher(teacher.id, "Bulk Owls", `T${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`);
    createdClassIds.push(readerClass.id);
    const result = await addLearnersToTeacherClass({ teacherUserId: teacher.id, classId: readerClass.id, rows: [{ row: 2, displayName: "Alex Turner", bookBand: "Level 3 · Sky Blue" }, { row: 3, displayName: "Alex Turner", bookBand: "Level 4 · Gold" }, { row: 4, displayName: "Robin Shah", bookBand: "Level 4 · Gold" }], createFamilyCode: () => `F${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}` });
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable for integration coverage.");
    for (const learner of result.created) {
      const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.id, learner.childProfileId)).limit(1);
      if (profile) createdUserIds.push(profile.userId);
    }
    expect(result.created.map(item => item.displayName)).toEqual(["Alex Turner", "Robin Shah"]);
    expect(result.errors).toEqual([{ row: 3, message: "This learner name appears more than once in the import." }]);
    expect((await getTeacherDashboard(teacher.id)).classes.find(item => item.id === readerClass.id)?.pupilCount).toBe(2);
  });

  it("creates one same-day parent reminder, records its read state, and does not duplicate it after re-completion", async () => {
    const parent = await insertUser(`${testKey}-parent`, "Test Parent", "parent");
    const child = await insertUser(`${testKey}-child`, "Test Child", "child");
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable for integration coverage.");
    await db.insert(childProfiles).values({ userId: child.id, displayName: "Test Child", bookBand: "Level 3 · Sky Blue", familyCode: `F${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}` });
    const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.userId, child.id)).limit(1);
    if (!profile) throw new Error("Could not create test learner profile.");
    await db.insert(familyLinks).values({ parentUserId: parent.id, childProfileId: profile.id });

    const firstCompletion = await saveHomePracticeChecklist(parent.id, profile.id, [true, true, true], new Date("2026-09-03T12:00:00.000Z"));
    expect(firstCompletion.reminderCreated).toBe(true);
    const [firstReminder] = await listParentReminders(parent.id);
    expect(firstReminder).toMatchObject({ childProfileId: profile.id, status: "unread", title: "Home practice complete" });

    expect(await markAllParentRemindersRead(parent.id)).toEqual({ markedRead: 1 });
    expect((await listParentReminders(parent.id))[0]?.status).toBe("read");
    await markParentReminderRead(parent.id, firstReminder.id);
    expect((await listParentReminders(parent.id))[0]?.status).toBe("read");
    await saveHomePracticeChecklist(parent.id, profile.id, [true, true, false], new Date("2026-09-03T12:05:00.000Z"));
    const repeatedCompletion = await saveHomePracticeChecklist(parent.id, profile.id, [true, true, true], new Date("2026-09-03T12:06:00.000Z"));
    expect(repeatedCompletion.reminderCreated).toBe(false);
    expect(await listParentReminders(parent.id)).toHaveLength(1);
  });
});

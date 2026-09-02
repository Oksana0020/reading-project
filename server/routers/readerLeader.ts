import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";
import { analyseReadingText } from "../reader";
import { assertSafeExerciseSet } from "../exerciseSafety";
import {
  approveExercises,
  createChildProfile,
  createClassForTeacher,
  createReadingMaterial,
  enrollChildInClass,
  getChildProfileForUser,
  getChildProgress,
  getParentDashboard,
  getTeacherDashboard,
  isTeacher,
  linkParentToFamily,
  listAssignedMaterialsForChild,
  listTeacherMaterials,
  mayAccessChildProfile,
  saveGeneratedExercises,
  seedDemoCohort,
  saveReadingSession,
  setUserRole,
} from "../readerDb";
import { storagePut } from "../storage";

const childRole = z.literal("child");
const teacherRole = z.literal("teacher");
const parentRole = z.literal("parent");
const exerciseSetSchema = z.object({
  vocabulary: z.array(z.object({ word: z.string().min(1).max(50), childFriendlyMeaning: z.string().min(1).max(200) })).min(3).max(6),
  questions: z.array(z.object({ prompt: z.string().min(1).max(240), options: z.array(z.string().min(1).max(120)).min(3).max(4), answer: z.string().min(1).max(120), explanation: z.string().min(1).max(240) })).min(3).max(4),
  activity: z.string().min(1).max(300),
});

function code(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function requireTeacher(role: string) {
  if (!isTeacher(role as "user" | "admin" | "child" | "teacher" | "parent")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This action is available to teacher accounts." });
  }
}

function llmContentAsText(content: string | unknown[]): string {
  if (typeof content === "string") return content;
  return content.map(part => "text" in (part as object) ? (part as { text: string }).text : "").join("");
}

export const readerLeaderRouter = router({
  account: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const role = ctx.user.role;
      const profile = role === "child" ? await getChildProfileForUser(ctx.user.id) : null;
      return { user: ctx.user, role, profile };
    }),
    setupChild: protectedProcedure.input(z.object({ displayName: z.string().trim().min(2).max(80) })).mutation(async ({ ctx, input }) => {
      await setUserRole(ctx.user.id, childRole.value);
      const profile = await createChildProfile(ctx.user.id, input.displayName, code("FAMILY"));
      return { profile, familyCode: profile.familyCode };
    }),
    setupTeacher: protectedProcedure.input(z.object({ className: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      await setUserRole(ctx.user.id, teacherRole.value);
      const readerClass = await createClassForTeacher(ctx.user.id, input.className, code("CLASS"));
      return { readerClass, joinCode: readerClass.joinCode };
    }),
    linkParent: protectedProcedure.input(z.object({ familyCode: z.string().trim().min(4).max(12) })).mutation(async ({ ctx, input }) => {
      await setUserRole(ctx.user.id, parentRole.value);
      const profile = await linkParentToFamily(ctx.user.id, input.familyCode.toUpperCase());
      return { profile };
    }),
    joinClass: protectedProcedure.input(z.object({ classCode: z.string().trim().min(4).max(12) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "child") throw new TRPCError({ code: "FORBIDDEN", message: "Only child accounts can join a class." });
      const readerClass = await enrollChildInClass(ctx.user.id, input.classCode.toUpperCase());
      return { readerClass };
    }),
  }),
  materials: router({
    assignedForMe: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "child") throw new TRPCError({ code: "FORBIDDEN", message: "Assigned reading materials are available to child accounts." });
      return listAssignedMaterialsForChild(ctx.user.id);
    }),
    listMine: protectedProcedure.query(async ({ ctx }) => {
      requireTeacher(ctx.user.role);
      return listTeacherMaterials(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(180),
      readingLevel: z.string().trim().min(2).max(80),
      sourceText: z.string().trim().min(80).max(8000),
      sourceFilename: z.string().trim().min(1).max(255).optional(),
      sourceFileBase64: z.string().max(1_500_000).optional(),
      sourceFileMime: z.string().max(120).optional(),
    })).mutation(async ({ ctx, input }) => {
      requireTeacher(ctx.user.role);
      let storageKey: string | undefined;
      if (input.sourceFileBase64 && input.sourceFilename) {
        const bytes = Buffer.from(input.sourceFileBase64, "base64");
        if (bytes.byteLength > 1_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Use a source document under 1 MB." });
        const stored = await storagePut(`reader-leader/materials/${ctx.user.id}/${input.sourceFilename}`, bytes, input.sourceFileMime || "text/plain");
        storageKey = stored.key;
      }
      return createReadingMaterial({ teacherUserId: ctx.user.id, title: input.title, readingLevel: input.readingLevel, sourceText: input.sourceText, sourceFilename: input.sourceFilename, storageKey });
    }),
    generateExercises: protectedProcedure.input(z.object({ materialId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireTeacher(ctx.user.role);
      const materials = await listTeacherMaterials(ctx.user.id);
      const material = materials.find(item => item.id === input.materialId);
      if (!material) throw new TRPCError({ code: "FORBIDDEN", message: "This material is not available to your class." });
      const prompt = `Create a concise, encouraging comprehension activity for children aged 8–10. Reading level: ${material.readingLevel}. Reading text:\n\n${material.sourceText.slice(0, 7000)}\n\nReturn only the requested structured result. Use accessible language. Include 3–6 meaningful vocabulary terms and 3–4 multiple-choice comprehension questions. Do not include sensitive, frightening, discriminatory, or adult content. Avoid diagnosing reading ability.`;
      const result = await invokeLLM({
        model: "gpt-5-mini",
        messages: [{ role: "system", content: "You are a primary literacy specialist creating safe, useful teacher-reviewed materials." }, { role: "user", content: prompt }],
        response_format: { type: "json_schema", json_schema: { name: "reading_exercise_set", strict: true, schema: { type: "object", properties: { vocabulary: { type: "array", items: { type: "object", properties: { word: { type: "string" }, childFriendlyMeaning: { type: "string" } }, required: ["word", "childFriendlyMeaning"], additionalProperties: false }, minItems: 3, maxItems: 6 }, questions: { type: "array", items: { type: "object", properties: { prompt: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 4 }, answer: { type: "string" }, explanation: { type: "string" } }, required: ["prompt", "options", "answer", "explanation"], additionalProperties: false }, minItems: 3, maxItems: 4 }, activity: { type: "string" } }, required: ["vocabulary", "questions", "activity"], additionalProperties: false } } },
      });
      const content = llmContentAsText(result.choices[0]?.message.content ?? "");
      const exerciseSet = assertSafeExerciseSet(exerciseSetSchema.parse(JSON.parse(content)));
      const saved = await saveGeneratedExercises(material.id, exerciseSet, "gpt-5-mini");
      return { material, exercise: saved };
    }),
    approve: protectedProcedure.input(z.object({ materialId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireTeacher(ctx.user.role);
      await approveExercises(ctx.user.id, input.materialId);
      return { success: true };
    }),
  }),
  sessions: router({
    save: protectedProcedure.input(z.object({
      childProfileId: z.number().int().positive(),
      materialId: z.number().int().positive().nullable().optional(),
      storyTitle: z.string().min(3).max(180),
      expectedText: z.string().min(20).max(8000),
      transcript: z.string().min(1).max(8000),
      durationSeconds: z.number().int().min(10).max(900),
      demoInterventions: z.array(z.object({ word: z.string().min(1).max(80), action: z.enum(["prompt", "model", "stay_silent", "teacher_review"]), note: z.string().min(1).max(300) })).max(3).optional().default([]),
    })).mutation(async ({ ctx, input }) => {
      const allowed = await mayAccessChildProfile({ id: ctx.user.id, role: ctx.user.role }, input.childProfileId);
      if (!allowed || ctx.user.role !== "child") throw new TRPCError({ code: "FORBIDDEN", message: "Only the signed-in child can save this reading session." });
      const analysis = analyseReadingText(input.expectedText, input.transcript, input.durationSeconds);
      const interventions = analysis.events.filter(event => event.eventType !== "correct").slice(0, 5).map(event => {
        const action: "prompt" | "model" | "stay_silent" | "teacher_review" = event.action === "teacher_review"
          ? "teacher_review"
          : event.action === "stay_silent"
            ? "stay_silent"
            : "prompt";
        return {
          word: event.expectedWord,
          action,
          note: event.action === "teacher_review" ? "Possible pronunciation variation — flagged for teacher review. The coach stayed silent." : event.action === "practise_gently" ? "Try that word again when you are ready." : "Reading event noted without interruption.",
        };
      });
      const session = await saveReadingSession({ childProfileId: input.childProfileId, materialId: input.materialId, storyTitle: input.storyTitle, transcript: analysis.transcript, accuracy: analysis.accuracy, wordsCorrectPerMinute: analysis.pace, durationSeconds: analysis.durationSeconds, practiceWords: analysis.practiceWords, interventions: [...input.demoInterventions, ...interventions] });
      return { session, analysis };
    }),
    childProgress: protectedProcedure.input(z.object({ childProfileId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const allowed = await mayAccessChildProfile({ id: ctx.user.id, role: ctx.user.role }, input.childProfileId);
      if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "This child profile is not available to your account." });
      return getChildProgress(input.childProfileId);
    }),
  }),
  dashboards: router({
    teacher: protectedProcedure.query(async ({ ctx }) => {
      requireTeacher(ctx.user.role);
      return getTeacherDashboard(ctx.user.id);
    }),
    parent: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "parent" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "This dashboard is available to parent accounts." });
      return getParentDashboard(ctx.user.id);
    }),
  }),
  demo: router({
    seedCohort: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only an administrator can create the guided demo cohort." });
      return seedDemoCohort(ctx.user.id);
    }),
  }),
});

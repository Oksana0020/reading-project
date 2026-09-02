import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import { analyseReadingText, mayViewChildProgress } from "./reader";
import { storageGetSignedUrl, storagePut } from "./storage";

const MAX_AUDIO_BYTES = 4_500_000;

function getSafeAudioMimeType(mimeType?: string): string {
  if (mimeType?.startsWith("audio/webm")) return "audio/webm";
  if (mimeType?.startsWith("audio/ogg")) return "audio/ogg";
  if (mimeType?.startsWith("audio/wav")) return "audio/wav";
  return "audio/webm";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  reading: router({
    /**
     * Demo recording route. Audio is uploaded to project storage and passed to
     * Whisper. The browser never receives storage credentials.
     */
    processRecording: publicProcedure
      .input(z.object({
        audioBase64: z.string().min(1).max(6_000_000),
        audioMime: z.string().optional(),
        expectedText: z.string().min(20).max(8_000),
        durationSeconds: z.number().min(1).max(600),
      }))
      .mutation(async ({ input }) => {
        const bytes = Buffer.from(input.audioBase64, "base64");
        if (bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_BYTES) {
          throw new Error("Keep this practice recording under 4.5 MB and try again.");
        }

        const mimeType = getSafeAudioMimeType(input.audioMime);
        const extension = mimeType.split("/")[1] ?? "webm";
        const { key } = await storagePut(`reader-leader/recordings/session-${Date.now()}.${extension}`, bytes, mimeType);
        const signedAudioUrl = await storageGetSignedUrl(key);
        const transcription = await transcribeAudio({
          audioUrl: signedAudioUrl,
          language: "en",
          prompt: "Transcribe an English-speaking child reading aloud. Preserve the words as spoken. Do not silently correct reading mistakes.",
        });

        if ("error" in transcription) {
          throw new Error(transcription.error);
        }

        return {
          ...analyseReadingText(input.expectedText, transcription.text, input.durationSeconds),
          transcriptionStatus: "transcribed" as const,
        };
      }),
    /**
     * A protected policy boundary for future account-linked child profiles.
     * The visual demo remains available without sign-in so that it can be used
     * during presentations, but production data should call this route.
     */
    secureProfileAccess: protectedProcedure
      .input(z.object({ profileId: z.string().min(1), viewer: z.enum(["child", "teacher", "parent"]), linkedProfileIds: z.array(z.string()) }))
      .query(({ input }) => {
        const allowed = mayViewChildProgress(input.viewer, input.profileId, input.linkedProfileIds);
        if (!allowed) throw new Error("This profile is not available to the selected account.");
        return { allowed: true, profileId: input.profileId };
      }),
  }),
});

export type AppRouter = typeof appRouter;

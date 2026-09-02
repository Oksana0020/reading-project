import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { transcribeAudio } from "./_core/voiceTranscription";
import { publicProcedure, router } from "./_core/trpc";
import { analyseReadingText } from "./reader";
import { readerLeaderRouter } from "./routers/readerLeader";
import { storageGetSignedUrl, storagePut } from "./storage";

const MAX_AUDIO_BYTES = 4_500_000;

function safeAudioMimeType(mimeType?: string): string {
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
    /** Public, clearly labelled guided-demo route; authenticated sessions use readerLeader.sessions.save. */
    processRecording: publicProcedure.input(z.object({
      audioBase64: z.string().min(1).max(6_000_000),
      audioMime: z.string().optional(),
      expectedText: z.string().min(20).max(8_000),
      durationSeconds: z.number().min(1).max(600),
    })).mutation(async ({ input }) => {
      const bytes = Buffer.from(input.audioBase64, "base64");
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_BYTES) throw new Error("Keep this practice recording under 4.5 MB and try again.");
      const mimeType = safeAudioMimeType(input.audioMime);
      const extension = mimeType.split("/")[1] ?? "webm";
      const { key } = await storagePut(`reader-leader/recordings/demo-${Date.now()}.${extension}`, bytes, mimeType);
      const transcription = await transcribeAudio({ audioUrl: await storageGetSignedUrl(key), language: "en", prompt: "Transcribe an English-speaking child reading aloud. Preserve words as spoken. Do not correct mistakes." });
      if ("error" in transcription) throw new Error(transcription.error);
      return { ...analyseReadingText(input.expectedText, transcription.text, input.durationSeconds), transcriptionStatus: "transcribed" as const };
    }),
  }),
  readerLeader: readerLeaderRouter,
});

export type AppRouter = typeof appRouter;

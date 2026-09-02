import { trpc } from "@/lib/trpc";
import { Download, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Audience = "child" | "parent" | "teacher";

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function downloadBytes(filename: string, bytes: Uint8Array, mimeType: string) {
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([data], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function base64ToBytes(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function ReportDownloadButton({ childProfileId, audience, label }: { childProfileId: number; audience: Audience; label: string }) {
  const report = trpc.readerLeader.reports.downloadPdf.useQuery({ childProfileId, audience }, { enabled: false, retry: false });
  const download = async () => {
    const result = await report.refetch();
    if (!result.data) return toast(result.error?.message || "Your report could not be prepared.");
    downloadBytes(result.data.filename, base64ToBytes(result.data.dataBase64), result.data.mimeType);
    toast("Your branded PDF report is downloading.");
  };
  return <button className="report-action" onClick={() => void download()} disabled={report.isFetching}><Download size={15} /> {report.isFetching ? "Preparing…" : label}</button>;
}

export function SessionAudioButton({ sessionId, label = "Play recording" }: { sessionId?: number | null; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const audioUrl = trpc.readerLeader.sessions.audioUrl.useQuery({ sessionId: sessionId ?? 1 }, { enabled: false, retry: false });
  const play = async () => {
    if (!sessionId) return toast("This guided session did not include an audio recording.");
    const result = await audioUrl.refetch();
    if (!result.data?.url) return toast(result.error?.message || "This recording is unavailable.");
    const audio = new Audio(result.data.url);
    setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => { setPlaying(false); toast("This recording could not be played."); };
    try { await audio.play(); } catch { setPlaying(false); toast("Your browser blocked automatic audio playback. Try the button again."); }
  };
  return <button className="audio-action" onClick={() => void play()} disabled={audioUrl.isFetching || playing}><Play size={14} fill="currentColor" /> {audioUrl.isFetching ? "Loading…" : playing ? "Playing…" : label}</button>;
}

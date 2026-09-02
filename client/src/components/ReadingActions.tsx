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

export function ReportDownloadButton({ childProfileId, audience, label }: { childProfileId: number; audience: Audience; label: string }) {
  const report = trpc.readerLeader.reports.download.useQuery({ childProfileId, audience }, { enabled: false, retry: false });
  const download = async () => {
    const result = await report.refetch();
    if (!result.data) return toast(result.error?.message || "Your report could not be prepared.");
    downloadText(result.data.filename, result.data.content, result.data.mimeType);
    toast("Your report is downloading.");
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

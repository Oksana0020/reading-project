import { trpc } from "@/lib/trpc";
import { FileText, Upload } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function toBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return window.btoa(binary);
}

export function TeacherMaterialUploader() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("Level 3 · Sky Blue");
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [fileBase64, setFileBase64] = useState<string | undefined>();
  const [fileMime, setFileMime] = useState("text/plain");
  const [storageKey, setStorageKey] = useState<string | undefined>();
  const [extractionNotice, setExtractionNotice] = useState("");
  const extract = trpc.readerLeader.materials.extractUpload.useMutation({ onSuccess: data => { setText(data.text); setStorageKey(data.storageKey); setFileBase64(undefined); setExtractionNotice(`${data.sourceType.toUpperCase()} text extracted and ready for your review${data.truncated ? " (preview shortened to 8,000 characters)" : ""}.`); }, onError: error => toast(error.message) });
  const create = trpc.readerLeader.materials.create.useMutation({ onSuccess: async data => { await utils.readerLeader.materials.listMine.invalidate(); await utils.readerLeader.dashboards.teacher.invalidate(); setLocation(`/teacher/materials/${data.id}/review`); }, onError: error => toast(error.message) });

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) return toast("Choose a PDF, DOCX, or text file under 5 MB.");
    const extension = file.name.toLowerCase().split(".").pop();
    if (!( ["pdf", "docx", "txt"].includes(extension || "") )) return toast("Use a PDF, DOCX, or plain-text passage.");
    const mime = file.type || (extension === "pdf" ? "application/pdf" : extension === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/plain");
    const base64 = toBase64(await file.arrayBuffer());
    setFilename(file.name); setFileMime(mime); setFileBase64(base64); setStorageKey(undefined); setExtractionNotice("Extracting the passage for your review…");
    extract.mutate({ sourceFilename: file.name, sourceFileBase64: base64, sourceFileMime: mime });
  };
  const save = () => {
    if (title.trim().length < 3 || text.trim().length < 80) return toast("Add a title and at least a short reading passage before saving.");
    create.mutate({ title, readingLevel: level, sourceText: text, sourceFilename: filename || undefined, sourceFileBase64: storageKey ? undefined : fileBase64, sourceFileMime: fileMime, storageKey });
  };
  return <section className="material-lab material-uploader"><div className="material-head"><div><div className="kicker">Lesson resources</div><h2>Save a reading material for review.</h2><p>Upload a PDF, DOCX, or plain text passage. You will move to a focused review page after saving, where AI exercises can be generated and approved.</p></div><span className="view-chip">Teacher review required</span></div><div className="material-form full-width"><label>Reading material title<input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. The Lantern in the Garden" /></label><div className="field-grid"><label>Reading level<select value={level} onChange={event => setLevel(event.target.value)}><option>Level 3 · Sky Blue</option><option>Level 4 · Gold</option><option>Level 5 · Green</option></select></label><label className="file-input">Upload source<input type="file" accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => void loadFile(event)} /><span><Upload size={15} /> {filename || "PDF, DOCX, or .txt"}</span></label></div><label>Extracted text preview<textarea value={text} onChange={event => setText(event.target.value)} placeholder="Upload a document or paste a child-appropriate passage here…" rows={11} /></label>{extractionNotice && <p className="extraction-note"><FileText size={14} /> {extractionNotice}</p>}<div className="form-actions"><button className="primary-cta" onClick={save} disabled={create.isPending || extract.isPending}><FileText size={16} /> {create.isPending ? "Saving…" : "Save Material"}</button></div></div></section>;
}

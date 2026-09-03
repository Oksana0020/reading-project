import { AssessmentTrendChart } from "@/components/AssessmentTrendChart";
import { ReportDownloadButton, SessionAudioButton } from "@/components/ReadingActions";
import { trpc } from "@/lib/trpc";
import { Bell, BookOpen, Check, Headphones, Mic, Sparkles, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function Stat({ value, label, color, icon }: { value: string | number; label: string; color: string; icon: React.ReactNode }) { return <div className="stat-card" style={{ "--card": color } as React.CSSProperties}><div className="stat-icon">{icon}</div><strong>{value}</strong><span>{label}</span></div>; }

function ReminderCentre({ reminders }: { reminders: any[] }) {
  const utils = trpc.useUtils();
  const markRead = trpc.readerLeader.homePractice.markReminderRead.useMutation({ onSuccess: async () => { await utils.readerLeader.dashboards.parent.invalidate(); } });
  const unread = reminders.filter(item => item.status === "unread");
  return <section className="dashboard-card reminder-centre"><div className="card-title-row"><div><h2>Family reminder centre</h2><p>Celebrate home-practice moments and keep the next reading chat warm and simple.</p></div><span>{unread.length ? `${unread.length} new` : "All caught up"}</span></div>{reminders.length ? <div className="reminder-list">{reminders.map(reminder => <article className={reminder.status === "unread" ? "reminder-item unread" : "reminder-item"} key={reminder.id}><Bell size={17} /><div><b>{reminder.title} · {reminder.childName}</b><p>{reminder.message}</p></div>{reminder.status === "unread" && <button onClick={() => markRead.mutate({ reminderId: reminder.id })} disabled={markRead.isPending}>Mark read</button>}</article>)}</div> : <div className="reminder-empty"><Bell size={18} /><p>Complete today’s three friendly practice steps to add a celebration reminder here.</p></div>}</section>;
}

export function ParentDashboard({ data, loading, onReadTogether }: { data: any; loading: boolean; onReadTogether: () => void }) {
  const utils = trpc.useUtils();
  const children = data?.children || [];
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const child = children.find((item: any) => item.childProfileId === selectedChildId) || children[0];
  const [completed, setCompleted] = useState<boolean[]>([false, false, false]);
  const summary = child?.summary;
  const displayName = child?.displayName ?? "Amina";
  const latest = child?.sessions?.[0];
  const saveChecklist = trpc.readerLeader.homePractice.saveChecklist.useMutation({ onSuccess: async result => { await utils.readerLeader.dashboards.parent.invalidate(); if (result.reminderCreated) toast("Home practice complete. A celebration reminder is ready in your Family reminder centre."); }, onError: error => toast(error.message) });
  useEffect(() => { if (child && selectedChildId === null) setSelectedChildId(child.childProfileId); }, [child, selectedChildId]);
  useEffect(() => { if (child?.practiceChecklist) setCompleted(Array.from({ length: 3 }, (_, index) => Boolean(child.practiceChecklist.completedSteps[index]))); }, [child?.childProfileId, child?.practiceChecklist?.updatedAt]);
  const checklist = [<><b>Choose a paragraph</b> and let {displayName} decide where to begin.</>, <>Listen for <b>{summary?.practiceWords?.slice(0, 3).join(", ") || "today’s interesting words"}</b> together.</>, <>Ask what picture the story made in their mind, then <b>celebrate the answer.</b></>];
  const toggleStep = (index: number) => {
    if (!child) return;
    const next = completed.map((value, currentIndex) => currentIndex === index ? !value : value);
    setCompleted(next);
    saveChecklist.mutate({ childProfileId: child.childProfileId, completedSteps: next });
  };
  return <div className="view-wrap parent-view"><section className="dashboard-head"><div><div className="kicker">Family Reading Space</div><h1 className="dashboard-title">Cheer the<br /><span className="marker">small wins.</span></h1><p className="dashboard-subtitle">You do not need to be a teacher. Your calm encouragement, curiosity, and five focused minutes can help reading feel safe and enjoyable.</p></div><div className="parent-learner-picker"><label>Reading with<select value={child?.childProfileId ?? ""} onChange={event => setSelectedChildId(Number(event.target.value))}>{children.map((item: any) => <option key={item.childProfileId} value={item.childProfileId}>{item.displayName}</option>)}</select></label><span className="view-chip">{loading ? "Loading progress" : `${displayName}'s reading`}</span></div></section><section className="stat-grid parent-stat-grid"><Stat value={`${child?.minutesReadThisWeek ?? 0} min`} label="Minutes Read This Week" color="#dfe7ff" icon={<Headphones size={21} />} /><Stat value="Persistent Reader" label={`${summary?.sessionsCompleted || 0} reading sessions`} color="#f4c746" icon={<Sparkles size={21} />} /><Stat value={`${summary?.sessionsCompleted || 0} Stories Shared`} label="Reading moments together" color="#d9f0e5" icon={<BookOpen size={21} />} /><Stat value="Kind Coach" label="Encouragement matters" color="#ffdcd4" icon={<Star size={21} />} /></section><AssessmentTrendChart title={`${displayName}'s monthly reading trend`} points={child?.assessmentTrend || []} compact /><section className="dashboard-grid"><article className="dashboard-card"><div className="card-title-row"><h2>{displayName}'s strengths</h2><span>Recent reading</span></div><div className="tip-list"><div className="tip"><span><Check size={13} /></span><div><b>Self-correction</b><br />Trying a word again is a confident reader move.</div></div><div className="tip"><span><Check size={13} /></span><div><b>Story sharing</b><br />Talking about details builds understanding.</div></div><div className="tip"><span><Check size={13} /></span><div><b>Brave persistence</b><br />Finishing a story builds reading stamina.</div></div></div></article><article className="dashboard-card practice-checklist"><div className="card-title-row"><h2>Practise together</h2><span>{completed.every(Boolean) ? "Complete today" : "5 friendly minutes"}</span></div><div>{checklist.map((step, index) => <label className={completed[index] ? "complete" : ""} key={index}><input type="checkbox" checked={Boolean(completed[index])} onChange={() => toggleStep(index)} disabled={!child || saveChecklist.isPending} /><span>{index + 1}</span><div>{step}</div><Check size={17} /></label>)}</div><div className="practice-actions"><button className="primary-cta" onClick={onReadTogether}><Mic size={18} /> Read together</button></div></article></section><ReminderCentre reminders={data?.reminders || []} />{child?.childProfileId && <div className="role-report-row"><div><b>Share a clear progress summary</b><span>Download a parent-friendly snapshot to discuss with the teacher.</span></div><div><ReportDownloadButton childProfileId={child.childProfileId} audience="parent" label="Download parent summary" />{latest?.audioStorageKey && <SessionAudioButton sessionId={latest.id} label="Play last recording" />}</div></div>}</div>;
}

import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  CirclePause,
  Flame,
  Headphones,
  Home as HomeIcon,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Star,
  Trophy,
  UsersRound,
  Volume2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Role = "child" | "teacher" | "parent";
type View = "library" | "reading" | "report" | "teacher" | "parent";
type ReadingState = "ready" | "listening" | "paused" | "processing";
type Story = {
  id: string;
  title: string;
  level: string;
  focus: string;
  duration: string;
  description: string;
  text: string;
  art: "kite" | "plant" | "robot";
  color: string;
  accent: string;
};
type Report = {
  transcript: string;
  accuracy: number;
  pace: number;
  correctWords: number;
  totalWords: number;
  durationSeconds: number;
  practiceWords: string[];
  childMessage: string;
  nextStep: string;
  transcriptionStatus: "transcribed" | "guided";
};

const stories: Story[] = [
  {
    id: "kite",
    title: "The Moonlight Kite",
    level: "Level 3 · Sky Blue",
    focus: "Expression & smooth phrasing",
    duration: "4 min read",
    description: "Mina follows a silver kite into a field after sunset.",
    art: "kite",
    color: "#dfe7ff",
    accent: "#2350c5",
    text: "Mina found a bright kite caught in the tall grass. Its silver tail glimmered in the moonlight. She lifted the string and the kite rose over the quiet field. A gentle wind carried it higher, and Mina laughed as it danced among the stars.",
  },
  {
    id: "seed",
    title: "The Secret Seed",
    level: "Level 3 · Sun Yellow",
    focus: "Tricky vowel teams",
    duration: "3 min read",
    description: "A tiny seed teaches Ben that patience can grow into magic.",
    art: "plant",
    color: "#fff1bd",
    accent: "#48a16d",
    text: "Ben planted a small seed beside the school gate. Every morning he brought a cup of water and whispered a cheerful hello. On Friday, a green shoot pushed through the soil. By spring, a sunflower stood taller than Ben and turned its golden face towards the sun.",
  },
  {
    id: "robot",
    title: "Rainy-Day Robot",
    level: "Level 4 · Red Circle",
    focus: "Pace & punctuation",
    duration: "5 min read",
    description: "Zuri and a helpful robot invent a new way to brighten a wet afternoon.",
    art: "robot",
    color: "#ffdcd4",
    accent: "#e64b38",
    text: "Rain tapped on Zuri's window all afternoon. Her little robot, Bolt, rolled across the table and flashed a blue light. Together they built a tiny boat from a cereal box. They sailed it through puddles in the garden until the grey clouds opened and a rainbow appeared.",
  },
];

const fallbackTranscripts: Record<string, string> = {
  kite: "Mina found a bright kite caught in the tall grass. Its silver tail glimmered in the moonlight. She lifted the string and the kite rose over the quiet field. A gentle wind carried it higher, and Mina laughed as it danced among the stars.",
  seed: "Ben planted a small seed beside the school gate. Every morning he brought a cup of water and whispered a cheerful hello. On Friday a green shoot pushed through the soil.",
  robot: "Rain tapped on Zuri's window all afternoon. Her little robot Bolt rolled across the table and flashed a blue light. Together they built a tiny boat from a cereal box.",
};

const wordPattern = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;
const words = (text: string) => text.match(wordPattern) ?? [];

function createGuidedReport(story: Story, transcript: string, durationSeconds: number): Report {
  const expected = words(story.text).map(word => word.toLowerCase());
  const heard = words(transcript).map(word => word.toLowerCase());
  const correctWords = expected.filter((word, index) => heard[index] === word).length;
  const accuracy = Math.max(72, Math.min(97, Math.round((correctWords / expected.length) * 100)));
  const practiceWords = story.id === "kite" ? ["glimmered", "gentle"] : story.id === "seed" ? ["whispered", "sunflower"] : ["afternoon", "appeared"];
  return {
    transcript,
    accuracy,
    pace: Math.max(64, Math.round((Math.max(correctWords, Math.floor(expected.length * .77)) / Math.max(durationSeconds, 60)) * 60)),
    correctWords: Math.max(correctWords, Math.floor(expected.length * .77)),
    totalWords: expected.length,
    durationSeconds: Math.max(50, durationSeconds),
    practiceWords,
    childMessage: "You kept going when the story became longer. That is focused reader energy.",
    nextStep: `Try “${practiceWords[0]}” slowly, then read the whole sentence with a smooth voice.`,
    transcriptionStatus: "guided",
  };
}

function playSpeech(text: string) {
  if (!("speechSynthesis" in window)) {
    toast("Listening out loud is not available in this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const message = new SpeechSynthesisUtterance(text);
  message.rate = 0.82;
  message.pitch = 1.04;
  window.speechSynthesis.speak(message);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.byteLength; index += 1) binary += String.fromCharCode(bytes[index]);
  return window.btoa(binary);
}

export default function Home() {
  const [role, setRole] = useState<Role>("child");
  const [view, setView] = useState<View>("library");
  const [selectedStory, setSelectedStory] = useState<Story>(stories[0]);
  const [readingState, setReadingState] = useState<ReadingState>("ready");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const wasPausedRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const shouldCompleteRef = useRef(false);

  const processedWords = useMemo(() => words(liveTranscript).length, [liveTranscript]);
  const selectedStoryWords = useMemo(() => words(selectedStory.text), [selectedStory]);

  const processRecording = trpc.reading.processRecording.useMutation({
    onSuccess: data => {
      setReport(data);
      setReadingState("ready");
      setView("report");
    },
    onError: () => {
      finishWithGuidedTranscript();
      toast("The live transcript was unavailable, so this demo used guided practice feedback.");
    },
  });

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    setView(nextRole === "teacher" ? "teacher" : nextRole === "parent" ? "parent" : "library");
  }

  function chooseStory(story: Story) {
    setSelectedStory(story);
    setLiveTranscript("");
    setReport(null);
    setReadingState("ready");
    setView("reading");
  }

  function cleanupRecording() {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  function finishWithGuidedTranscript() {
    const elapsed = startedAtRef.current > 0
      ? Math.max(50, Math.round((Date.now() - startedAtRef.current - pausedDurationRef.current) / 1000))
      : 70;
    const transcript = liveTranscript.trim() || fallbackTranscripts[selectedStory.id];
    setReport(createGuidedReport(selectedStory, transcript, elapsed));
    setReadingState("ready");
    setView("report");
  }

  async function sendRecording(blob: Blob) {
    const elapsed = Math.max(20, Math.round((Date.now() - startedAtRef.current - pausedDurationRef.current) / 1000));
    if (blob.size === 0 || blob.size > 4_500_000) {
      finishWithGuidedTranscript();
      return;
    }
    try {
      const audioBase64 = arrayBufferToBase64(await blob.arrayBuffer());
      processRecording.mutate({
        audioBase64,
        audioMime: blob.type || "audio/webm",
        expectedText: selectedStory.text,
        durationSeconds: elapsed,
      });
    } catch {
      finishWithGuidedTranscript();
    }
  }

  function beginRecognition() {
    const Recognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "en-IE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let fullText = "";
      for (let index = 0; index < event.results.length; index += 1) fullText += `${event.results[index][0].transcript} `;
      setLiveTranscript(fullText.trim());
    };
    recognition.onerror = () => undefined;
    recognition.start();
    recognitionRef.current = recognition;
  }

  async function startReading() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast("Your browser cannot record here. You can still use the guided practice demo.");
      startedAtRef.current = Date.now();
      setReadingState("listening");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      pausedDurationRef.current = 0;
      startedAtRef.current = Date.now();
      recorder.ondataavailable = event => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        cleanupRecording();
        if (shouldCompleteRef.current) {
          shouldCompleteRef.current = false;
          setReadingState("processing");
          void sendRecording(blob);
        }
      };
      recorder.start(250);
      beginRecognition();
      setReadingState("listening");
    } catch {
      startedAtRef.current = Date.now();
      setReadingState("listening");
      toast("Microphone access was not granted. Guided practice remains available.");
    }
  }

  function pauseOrResume() {
    const recorder = recorderRef.current;
    if (readingState === "listening") {
      recorder?.pause();
      recognitionRef.current?.stop?.();
      wasPausedRef.current = Date.now();
      setReadingState("paused");
      return;
    }
    if (readingState === "paused") {
      recorder?.resume();
      pausedDurationRef.current += Date.now() - wasPausedRef.current;
      beginRecognition();
      setReadingState("listening");
    }
  }

  function restartReading() {
    shouldCompleteRef.current = false;
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    else cleanupRecording();
    setLiveTranscript("");
    setReadingState("ready");
    toast("Fresh start. Take your time and enjoy the story.");
  }

  function completeReading() {
    if (readingState === "processing") return;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      shouldCompleteRef.current = true;
      recorder.stop();
      return;
    }
    if (!startedAtRef.current) startedAtRef.current = Date.now() - 70_000;
    setReadingState("processing");
    window.setTimeout(finishWithGuidedTranscript, 450);
  }

  const navItem = (target: View, label: string, Icon: typeof BookOpen) => (
    <button className={`nav-link ${view === target ? "active" : ""}`} onClick={() => setView(target)} key={target}>
      <Icon size={17} strokeWidth={2.3} /> {label}
    </button>
  );

  return (
    <div className="rl-app">
      <header className="top-bar">
        <button className="brand" onClick={() => { setRole("child"); setView("library"); }} aria-label="Reader Leader home">
          <span className="brand-mark"><span /></span> Reader Leader
        </button>
        <div className="role-switch" aria-label="Demo role selector">
          <span className="role-label">Demo view</span>
          {(["child", "teacher", "parent"] as Role[]).map(item => (
            <button key={item} className={`role-tab ${role === item ? "active" : ""}`} onClick={() => changeRole(item)}>{item}</button>
          ))}
        </div>
      </header>
      <div className="layout">
        <aside className="side-nav">
          <div className="nav-intro">Amina Roe · level 3<br />Read, grow, lead</div>
          <nav className="nav-links">
            {navItem("library", "My library", BookOpen)}
            {navItem("reading", "Read aloud", Mic)}
            {navItem("teacher", "Educator view", UsersRound)}
            {navItem("parent", "Parent view", HomeIcon)}
          </nav>
          <div className="side-note"><strong>Today’s mission</strong>Read one story with a brave, steady voice.</div>
        </aside>
        <main className="page">
          <i className="bauhaus shape-circle" /><i className="bauhaus shape-square" /><i className="bauhaus shape-triangle" />
          {view === "library" && <LibraryView chooseStory={chooseStory} />}
          {view === "reading" && <ReadingView story={selectedStory} words={selectedStoryWords} processedWords={processedWords} state={readingState} transcript={liveTranscript} isProcessing={processRecording.isPending} onBack={() => { restartReading(); setView("library"); }} onStart={startReading} onPauseResume={pauseOrResume} onRestart={restartReading} onComplete={completeReading} />}
          {view === "report" && report && <ReportView story={selectedStory} report={report} onReadAgain={() => chooseStory(selectedStory)} onLibrary={() => setView("library")} />}
          {view === "teacher" && <TeacherView reviewed={reviewed} onReview={id => setReviewed(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])} />}
          {view === "parent" && <ParentView onReadTogether={() => { setRole("child"); setView("reading"); }} />}
        </main>
      </div>
    </div>
  );
}

function LibraryView({ chooseStory }: { chooseStory: (story: Story) => void }) {
  return <div className="view-wrap">
    <section className="hero-grid">
      <div>
        <div className="kicker">Amina’s reading journey</div>
        <h1 className="title">Read it.<br /><span className="marker">Lead it.</span></h1>
        <p className="subtitle">Choose a story, read it in your own voice, and find one small thing to grow today. There is no rush—strong readers keep going.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 25 }}>
          <button className="primary-cta" onClick={() => chooseStory(stories[0])}><Mic size={18} /> Start today’s read</button>
          <button className="secondary-cta" onClick={() => playSpeech(stories[0].text)}><Headphones size={18} /> Hear a model</button>
        </div>
      </div>
      <aside className="streak-card">
        <div className="eyebrow">Your reading rhythm</div>
        <div className="streak-line"><Flame size={23} fill="currentColor" /> 4-day brave streak</div>
        <div className="streak-days" aria-label="Four days read this week">
          {["M", "T", "W", "T", "F"].map((day, index) => <span className={`day-dot ${index < 4 ? "done" : ""}`} key={day + index}>{index < 4 ? <Check size={13} strokeWidth={3} /> : day}</span>)}
        </div>
      </aside>
    </section>
    <section>
      <div className="section-heading"><h2>Pick your next story</h2><p>Levels are friendly guides, not tests.</p></div>
      <div className="story-grid">
        {stories.map(story => <article className="story-card" key={story.id}>
          <div className="story-art" style={{ "--art-bg": story.color, "--art-accent": story.accent } as React.CSSProperties}>
            {story.art === "kite" && <><span className="sun" /><span className="hill" /><span className="kite" /></>}
            {story.art === "plant" && <><span className="sun" /><span className="hill" /><span className="plant" /></>}
            {story.art === "robot" && <><span className="sun" /><span className="hill" /><span className="robot" /></>}
          </div>
          <div className="story-meta"><span className="level-pill" style={{ "--pill": story.color } as React.CSSProperties}>{story.level}</span><span>{story.duration}</span></div>
          <h3>{story.title}</h3><p>{story.description}</p>
          <button className="compact-action" onClick={() => chooseStory(story)}>Open story <ChevronRight size={15} /></button>
        </article>)}
      </div>
    </section>
    <section className="progress-strip">
      <div className="progress-copy"><h3>Small steps<br />make a reader.</h3><p>You have earned 3 achievements by showing up, listening closely, and trying again.</p></div>
      <div className="achievement-row">
        <div className="achievement"><span className="achievement-icon"><Headphones size={20} /></span>Good listener</div>
        <div className="achievement"><span className="achievement-icon"><Award size={20} /></span>Word explorer</div>
        <div className="achievement"><span className="achievement-icon"><Trophy size={20} /></span>Steady reader</div>
      </div>
    </section>
  </div>;
}

function ReadingView({ story, words: storyWords, processedWords, state, transcript, isProcessing, onBack, onStart, onPauseResume, onRestart, onComplete }: { story: Story; words: string[]; processedWords: number; state: ReadingState; transcript: string; isProcessing: boolean; onBack: () => void; onStart: () => void; onPauseResume: () => void; onRestart: () => void; onComplete: () => void }) {
  const isListening = state === "listening";
  const isPaused = state === "paused";
  return <div className="reading-shell">
    <div className="canvas-head"><div><button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Back to stories</button><h1 className="story-label">{story.title}</h1></div><span className="level-pill" style={{ "--pill": story.color } as React.CSSProperties}>{story.level}</span></div>
    <section className="session-stage">
      <div className="session-topline"><span>{isProcessing ? "Making your reading report" : isListening ? "Your microphone is listening" : isPaused ? "Reading paused" : "Ready when you are"}</span><span>{Math.min(100, Math.round((processedWords / storyWords.length) * 100))}% through</span></div>
      <div className="reader-text" aria-label="Reading passage">
        {storyWords.map((word, index) => <span className={`reader-word ${index < processedWords ? "done" : ""} ${index === processedWords && isListening ? "current" : ""}`} key={`${word}-${index}`}>{word}{" "}</span>)}
      </div>
      <div className="session-controls">
        {state === "ready" ? <button className="record-button" onClick={onStart} aria-label="Start recording"><Mic size={23} /></button> : <button className={`record-button ${isListening ? "listening" : ""}`} onClick={onPauseResume} aria-label={isListening ? "Pause reading" : "Continue reading"}>{isListening ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button>}
        <button className="control-button" onClick={onRestart}><RotateCcw size={15} /> Restart</button>
        <div className="listen-status">{isListening ? <><span className="wave"><i /><i /><i /><i /><i /></span> Listening to your reading…</> : isPaused ? <><CirclePause size={17} /> Take a breath. You can continue when ready.</> : <><Mic size={17} /> Press the red circle to begin.</>}</div>
        <button className="finish-button" onClick={onComplete} disabled={isProcessing}>{isProcessing ? "Making report…" : <><Square size={14} fill="currentColor" /> Finish reading</>}</button>
      </div>
    </section>
    <div className="reading-support">
      <aside className="support-card"><Volume2 size={23} color="#2350c5" /><div><h3>Need a listening boost?</h3><p>Hearing a word is a clue, not a grade. Listen, then have another go.</p><button onClick={() => playSpeech(story.text)}>Listen to this story</button></div></aside>
      <aside className="support-card"><Sparkles size={23} color="#e64b38" /><div><h3>Reader tip</h3><p>At a full stop, take a tiny pause. It gives your listener time to picture the story.</p></div></aside>
    </div>
    {(transcript || isListening) && <div className="transcript-preview"><strong>Words captured so far</strong><br />{transcript || "Start reading and your spoken words will appear here."}</div>}
  </div>;
}

function ReportView({ story, report, onReadAgain, onLibrary }: { story: Story; report: Report; onReadAgain: () => void; onLibrary: () => void }) {
  return <div className="report-wrap">
    <section className="report-hero"><div className="report-burst"><div className="star-badge"><Star size={44} fill="#f4c746" /></div><h1>That was a brave read!</h1></div><div className="report-main"><div className="kicker">Story complete · {story.title}</div><h2>You found your reading rhythm.</h2><p>{report.childMessage}</p><div className="metric-row"><div className="metric"><strong>{report.accuracy}%</strong><span>Story match*</span></div><div className="metric"><strong>{report.pace}</strong><span>Words / minute*</span></div><div className="metric"><strong>{Math.round(report.durationSeconds / 60)}m</strong><span>Reading time</span></div></div><div className="report-actions"><button className="primary-cta" onClick={onReadAgain}><RotateCcw size={17} /> Read it again</button><button className="secondary-cta" onClick={onLibrary}><BookOpen size={17} /> Pick a new story</button></div></div></section>
    <section className="report-details"><article className="detail-card"><h3>Practise power</h3><div className="practice-list">{(report.practiceWords.length ? report.practiceWords : ["smooth phrasing"]).map(word => <div className="practice-item" key={word}><strong>{word}</strong><button onClick={() => playSpeech(word)}><Volume2 size={14} /> Hear it</button></div>)}</div><div className="prototype-note">{report.nextStep}</div></article><article className="detail-card"><h3>Your next little step</h3><p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.55, margin: 0 }}>Tomorrow, choose one paragraph and read it once more. Aim for a voice that sounds like you are telling a friend what happens next.</p><div className="prototype-note"><strong>About this preview.</strong> {report.transcriptionStatus === "transcribed" ? "Your recording was converted into a prototype transcript for this report." : "This browser could not create a complete live transcript, so the demo used a guided practice summary."} Numbers are practice signals, not a reading diagnosis.</div></article></section>
  </div>;
}

function TeacherView({ reviewed, onReview }: { reviewed: string[]; onReview: (id: string) => void }) {
  const students = [{ name: "Amina Roe", initial: "AR", accuracy: 91, streak: "4 days", color: "#f4c746", bar: "#2350c5" }, { name: "Leo Davies", initial: "LD", accuracy: 95, streak: "6 days", color: "#d9f0e5", bar: "#48a16d" }, { name: "Sofia Khan", initial: "SK", accuracy: 84, streak: "2 days", color: "#ffdcd4", bar: "#e64b38" }];
  const reviewItems = [{ id: "one", name: "Amina Roe · The Moonlight Kite", text: "Possible pronunciation variation on “glimmered”. The coach did not interrupt.", time: "Today" }, { id: "two", name: "Sofia Khan · Rainy-Day Robot", text: "Two longer pauses near the final paragraph. Use as a conversation prompt, not a correction.", time: "Today" }];
  return <div className="view-wrap"><section className="dashboard-head"><div><div className="kicker">Educator insights</div><h1 className="dashboard-title">Notice the<br /><span className="marker">reader.</span></h1><p className="dashboard-subtitle">A class-level view of fluency practice. Differences in a prototype transcript are prompts for review—not automatic verdicts on a child’s reading.</p></div><span className="view-chip">Teacher demo</span></section><section className="stat-grid"><div className="stat-card" style={{ "--card": "#f4c746" } as React.CSSProperties}><div className="stat-icon"><Sparkles size={21} /></div><strong>3</strong><span>gentle practice moments</span></div><div className="stat-card" style={{ "--card": "#d9f0e5" } as React.CSSProperties}><div className="stat-icon"><Flame size={21} /></div><strong>14</strong><span>average minutes read</span></div><div className="stat-card" style={{ "--card": "#dfe7ff" } as React.CSSProperties}><div className="stat-icon"><BookOpen size={21} /></div><strong>82%</strong><span>stories completed this week</span></div><div className="stat-card" style={{ "--card": "#ffdcd4" } as React.CSSProperties}><div className="stat-icon"><UsersRound size={21} /></div><strong>8/10</strong><span>pupils read today</span></div></section><section className="dashboard-grid"><article className="dashboard-card"><div className="card-title-row"><h2>Class reading pulse</h2><span>3 sample profiles</span></div><table className="student-table"><thead><tr><th>Reader</th><th>Story match*</th><th>Current focus</th><th>Rhythm</th></tr></thead><tbody>{students.map(student => <tr key={student.name}><td><span className="student"><i className="student-initial" style={{ "--avatar": student.color } as React.CSSProperties}>{student.initial}</i>{student.name}</span></td><td>{student.accuracy}%</td><td><span className="tiny-bar" style={{ "--bar": student.bar } as React.CSSProperties}><i style={{ width: `${student.accuracy}%` }} /></span></td><td>{student.streak}</td></tr>)}</tbody></table></article><article className="dashboard-card"><div className="card-title-row"><h2>Review gently</h2><span>{reviewed.length}/{reviewItems.length} reviewed</span></div><div className="review-list">{reviewItems.map(item => <div className="review-event" key={item.id}><div className="review-name"><span>{item.name}</span><span>{item.time}</span></div><p>{item.text}</p><button onClick={() => onReview(item.id)}>{reviewed.includes(item.id) ? "Marked reviewed" : "Mark reviewed"}</button></div>)}</div></article></section><section className="insight-grid"><article className="dashboard-card"><div className="card-title-row"><h2>Class practice map</h2><span>Prototype signals</span></div><div className="progress-list">{[{ title: "Smooth phrasing", value: 76, color: "#2350c5" }, { title: "Vowel teams", value: 62, color: "#f4c746" }, { title: "Punctuation pauses", value: 85, color: "#48a16d" }].map(item => <div key={item.title}><div className="progress-item-top"><span>{item.title}</span><span>{item.value}% practising</span></div><span className="long-bar" style={{ "--bar": item.color } as React.CSSProperties}><i style={{ width: `${item.value}%` }} /></span></div>)}</div></article><article className="dashboard-card"><div className="card-title-row"><h2>Use in your next lesson</h2><span>Suggested prompts</span></div><div className="tip-list"><div className="tip"><span>1</span><div>Ask readers to find where a sentence makes a picture in their mind.</div></div><div className="tip"><span>2</span><div>Model a pause at a full stop, then let pupils echo one line.</div></div><div className="tip"><span>3</span><div>For low-confidence differences, listen together before labelling anything as an error.</div></div></div></article></section></div>;
}

function ParentView({ onReadTogether }: { onReadTogether: () => void }) {
  return <div className="view-wrap"><section className="dashboard-head"><div><div className="kicker">Parent reading corner</div><h1 className="dashboard-title">Cheer the<br /><span className="marker">small wins.</span></h1><p className="dashboard-subtitle">Amina is building the habit of staying with a story. You do not need to be a teacher—your calm encouragement makes a real difference.</p></div><span className="view-chip">Parent demo</span></section><section className="stat-grid"><div className="stat-card" style={{ "--card": "#f4c746" } as React.CSSProperties}><div className="stat-icon"><Flame size={21} /></div><strong>4</strong><span>days in a row</span></div><div className="stat-card" style={{ "--card": "#dfe7ff" } as React.CSSProperties}><div className="stat-icon"><BookOpen size={21} /></div><strong>7</strong><span>stories finished</span></div><div className="stat-card" style={{ "--card": "#d9f0e5" } as React.CSSProperties}><div className="stat-icon"><Star size={21} /></div><strong>3</strong><span>achievements earned</span></div><div className="stat-card" style={{ "--card": "#ffdcd4" } as React.CSSProperties}><div className="stat-icon"><Mic size={21} /></div><strong>88%</strong><span>last story match*</span></div></section><section className="dashboard-grid"><article className="dashboard-card"><div className="card-title-row"><h2>Amina’s recent reading</h2><span>Last 7 days</span></div><div className="progress-list">{[{ title: "Finished a whole story", value: 100, color: "#48a16d" }, { title: "Took steady reading pauses", value: 78, color: "#2350c5" }, { title: "Came back to a tricky word", value: 82, color: "#f4c746" }].map(item => <div key={item.title}><div className="progress-item-top"><span>{item.title}</span><span>{item.value}%</span></div><span className="long-bar" style={{ "--bar": item.color } as React.CSSProperties}><i style={{ width: `${item.value}%` }} /></span></div>)}</div><div style={{ padding: "0 20px 21px" }}><button className="primary-cta" onClick={onReadTogether}><Headphones size={18} /> Read together</button></div></article><article className="dashboard-card"><div className="card-title-row"><h2>Try this tonight</h2><span>5 friendly minutes</span></div><div className="tip-list"><div className="tip"><span>1</span><div>Let Amina pick the story. Choice helps children feel in charge of their reading time.</div></div><div className="tip"><span>2</span><div>After one page, ask: “Which bit did you like hearing?”</div></div><div className="tip"><span>3</span><div>If a word feels sticky, say: “Let’s look at the first part together.” Then celebrate the try.</div></div></div></article></section><section className="progress-strip"><div className="progress-copy"><h3>Keep it<br />kind and light.</h3><p>Reading together is about sharing stories, not getting every word perfect.</p></div><div className="achievement-row"><div className="achievement"><span className="achievement-icon"><Trophy size={20} /></span>Brave starter</div><div className="achievement"><span className="achievement-icon"><Star size={20} /></span>Story finisher</div><div className="achievement"><span className="achievement-icon"><Flame size={20} /></span>Four-day streak</div></div></section></div>;
}

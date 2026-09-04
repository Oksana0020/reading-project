# Reader Leader: Current Functionality Reference for Copilot

This document is the **current functional inventory** of Reader Leader. It is intended to help a copilot, engineer, product owner, or reviewer understand what is implemented, which role may use each capability, and the key boundaries that must be preserved when extending the system.

> **Product purpose:** Reader Leader is an AI-supported read-aloud fluency coaching MVP for children aged 8–10. It supports a child, their teacher, and their parent or guardian through separate, privacy-aware experiences.

## 1. Product foundation

| Area | Current capability |
| --- | --- |
| Application stack | React, TypeScript, Vite, Wouter, Tailwind/CSS, Express, tRPC, Drizzle, and MySQL/TiDB. |
| Visual language | Responsive, child-friendly Bauhaus/workbook design with an off-white canvas, clear colour coding, rounded panels, high-contrast controls, and role-specific dashboard treatments. |
| Roles | **Child**, **Teacher**, and **Parent** have separate, role-scoped data and interfaces. |
| Local demo access | Server-side local demo sign-in supports `child1`, `teacher2`, and `parent3`. The browser only collects a runtime password; it does not contain the password constants. |
| Portal flow | The landing portal first displays the three role cards. Selecting a role hides those cards and opens a centred, padded password card without overlapping content. |
| Persistence | Classes, learners, family links, materials, assignments, exercises, sessions, quiz attempts, feedback, settings, checklists, and reminders are persisted. |
| Responsive support | The core role interfaces and the newer class/import, term-filter, and reminder surfaces have been validated at desktop, 768 px tablet, and 375 px mobile widths. |

## 2. Child experience

### Reading library and profile

Children open a personalised **Reading Library** labelled with their own name, such as **Amina’s Reading Progress**. The library presents teacher-assigned passages, saved reading activity, quiz history, progress information, and child-appropriate report shortcuts. A child only sees their own profile, their own assigned materials, and their own saved sessions.

### Live read-aloud canvas

The reading canvas presents a focused passage view with punctuation-aware word spacing, a visible reading-mode badge, recording controls, pause/restart actions, word-state rendering, and a completion path. The browser can provide a live speech preview while a session is in progress. Completed recordings are saved and sent through the configured server-side speech transcription flow, which is used to create a stored transcript and supportive reading signals.

> **ASR boundary:** This is a prototype support tool, not a production-grade child speech-recognition or diagnostic assessment system. Adults should review low-confidence reading moments with the child and use their professional judgement.

### Reading assessment modes

| Mode | Child-facing behaviour | Session/report behaviour |
| --- | --- | --- |
| **Assisted Practice** | Correct words turn blue. The active word uses a yellow highlighted/underlined treatment. An incorrect word is shown in red. A correct retry becomes blue with a small green self-correction marker. | Stores attempts and retries. The report includes self-corrections and retry detail. |
| **Guided Practice** | Behaves like Assisted Practice, but after two unsuccessful attempts on a word, the microphone pauses and a model-audio prompt is offered before the next retry. | Records the guided prompt and retry pattern for supportive follow-up. |
| **Monthly Assessment** | Advances quietly without red corrections, retry controls, or interruption prompts. | Incorrect words are logged silently for teacher review. Story match and WCPM use the first pass only, and correction-prompt replay is disabled. |

### Word tracking and self-correction

Each passage word has a persistent/readable state model: `unread`, `current`, `correct`, `incorrect`, or `retried_correct`. The system tracks the number of attempts and retry history. This allows the child experience to encourage self-correction in practice modes and lets adults review the underlying session details without treating the result as a clinical diagnosis.

### Child reports, achievements, and quizzes

The child receives supportive completion feedback covering story match, pace/WCPM, completion, practice words, and a next-step activity. The system also tracks progress history, saved sessions, streaks, and achievements. Child-facing celebration PDFs can be downloaded from authorised child views.

After a teacher-assigned passage is completed, the child can open a comprehension quiz with clear question controls, feedback and explanations. Attempts are stored, quiz retry is supported, and prior progress remains available in the library.

## 3. Teacher experience

### Teacher dashboard and class management

The teacher dashboard is a role-scoped workspace for reviewing learners, classes, reading sessions, materials, and reports. A teacher can create classes, see an active-class count, select a class or the all-classes view, view the class join code, and inspect a roster. A selected class scopes the roster, trend chart, learner plans, and class overview.

| Class-management function | Current behaviour |
| --- | --- |
| Create class | Creates a teacher-owned class from a supplied class name. |
| Class selector | Switches between all classes and a specific class roster. |
| Join/share code | Shows the selected class code for matching a child’s profile to the teacher’s class. |
| Create one learner | Adds a learner with name and book band, creates a private family connection code, and provides a default reading plan. |
| Bulk learner CSV import | Imports up to **100** learners into the currently selected class. |
| CSV validation | Requires a `display_name` column and accepts an optional `book_band` column. Empty/invalid rows are reported, duplicate names in the file are reported by row, and duplicate learners are not created. |
| CSV template | Teachers can download a ready-to-fill template with the supported columns. |
| No-session learners | Learners with no saved sessions display a clean dash for story match and WCPM. They do not reduce class averages. |

### Learner reading plans

For each learner in scope, a teacher can choose a default reading mode—Assisted Practice, Guided Practice, or Monthly Assessment—and set a target WCPM. The plan is saved per learner, persists across sign-in/reload, and is applied when that child opens an assigned story.

### Materials, extraction, exercises, and assignment workflow

Teachers can create custom reading materials by pasting text or uploading **TXT**, **PDF**, or **DOCX** sources. The server extracts text from supported documents and provides a teacher preview. The workflow is intentionally routed rather than toast-only:

1. **Save Material** persists the material and navigates to `/teacher/materials/:id/review`.
2. The review page displays **Material Saved Successfully!**, a primary **Generate AI Exercises** action, and a secondary return-to-dashboard action.
3. Generated exercises are shown in a full-width structured document: two-column vocabulary cards with terms/definitions and distinct radio-style answer options for multiple-choice questions.
4. **Approve & Assign** creates the teacher assignment and navigates to `/teacher/assignments/confirmation`.
5. The confirmation page displays the assigned class/students, class share code, and a **View Assigned Activities in Library** action.

Exercise generation includes deterministic safeguards and teacher review; generated content is not automatically delivered to children without teacher approval.

### Assessment trends and term reports

Teachers can view monthly assessment **Story Match %** and **WCPM** together on a reusable trend chart. The trend view is available at class scope and, where relevant, across classes. It is designed as a practice signal and conversation starter rather than an automatic decision system.

| Reporting control | Current behaviour |
| --- | --- |
| Date range | Teachers choose an inclusive **From** and **To** date for a custom term or assessment window. |
| Apply range | Refreshes the trend chart to the selected interval. |
| All time | Clears the custom interval and restores all available monthly assessment data. |
| Trend labels | Uses the filtered months represented by the assessment data. |
| Export CSV | Produces an authorised CSV matching the currently selected class/all-class scope and date range. |
| CSV columns | `Class`, `Month`, `Story Match %`, `WCPM`, and `Assessment Sessions`. |
| Range-specific filename | A filtered export includes the selected range in the file name, for example `...-2026-07-01-to-2026-08-31.csv`. |

### Session review, audio, feedback, and running records

Teachers can review saved reading sessions, relevant flags, transcript outcomes, and individual learner metrics. They can listen to an authorised full saved recording, download a PDF running record, and leave kind, specific feedback on individual session reports.

For recordings with saved timing metadata, a teacher can open **word-linked playback** and click a transcript word to seek to its audio moment. The player uses an inspectable authorised audio element, seeks to the word start, and plays a short word window. Real-recording word timing is approximate because it is derived from transcription segments; the technical demo fixture is clearly labelled non-speech audio and demonstrates exact seek/stop behaviour.

### School-branded reports

Teachers can set a school name, report accent colour, and supportive footer message. Those branding settings feed the child celebration, parent progress, and teacher running-record PDF report outputs.

## 4. Parent experience

Parents use a role-specific **Family Reading Space**. Teacher/administrator-only controls are excluded. A parent can choose among their linked children when more than one family relationship exists and sees only authorised family information.

### Parent progress view

The dashboard uses parent-friendly, celebratory language instead of raw administrative metrics. It shows **Minutes Read This Week**, badges such as **Persistent Reader**, a stories-shared count, recent strengths, and the linked child’s monthly trend chart. Parents can download an authorised parent-friendly progress summary and, when authorised, play the child’s latest saved recording.

### Home-practice checklist

The parent dashboard provides an interactive three-step daily home-practice checklist. Individual checked steps are persisted for the linked parent, child, and checklist date. Completing all three steps records a completion time and produces a supportive in-app celebration reminder.

### Family reminder centre

| Reminder function | Current behaviour |
| --- | --- |
| Privacy scope | A reminder belongs to a linked parent and child; unrelated users cannot access it. |
| Creation | Completing a child’s daily three-step checklist creates a home-practice completion reminder. |
| Duplicate protection | The same completed checklist cannot create multiple reminders; rechecking a same-day final step does not duplicate the reminder. |
| Unread badge | The family dashboard header displays the unread count when unread reminders exist. |
| Reminder centre status | Displays an unread count such as **“2 new”**, or **“All caught up”** when none are unread. |
| Individual read state | A parent can mark a single reminder as read. |
| Bulk action | A parent can use **Mark all read** to update all of their unread reminders at once. |
| History | Read reminders remain visible as a family completion history. |

## 5. Reports and downloads

| Output | Audience | Scope |
| --- | --- | --- |
| Child celebration PDF | Child | Own completed/saved reading data. |
| Parent progress PDF | Parent | Linked child’s authorised reading progress. |
| Teacher running-record PDF | Teacher | Learners/classes they are authorised to review. |
| Monthly assessment trends CSV | Teacher | Selected class or all-class view, with the active term range if one is applied. |
| Learner import CSV template | Teacher | Column template for teacher class roster import. |

## 6. Role and data-access rules

| Role | May access | Must not access |
| --- | --- | --- |
| Child | Their own reading library, assigned materials, own reading sessions/reports, own quizzes. | Other learners’ reports, class rosters, teacher settings, parent reminders. |
| Teacher | Own classes, learners in those classes, materials, assignments, authorised sessions/audio/reports, feedback, trends, plans, CSV import/export. | Unrelated teachers’ classes, unrelated families’ information, unlinked parent reminders. |
| Parent | Linked child/children’s parent dashboard, reports, playback where authorised, own checklists, and own reminders. | Teacher controls, unrelated children, other parents’ reminders, class administration. |

## 7. Technical and operational boundaries for future copilots

1. Preserve role-scoped server authorisation; hiding a control in the interface is not sufficient protection.
2. Do not expose demo password constants in browser code. Password verification belongs on the server.
3. Keep audio files in managed object storage and persist references/metadata rather than storing audio bytes in the database.
4. Treat transcription-derived word timings as approximate for real recordings and avoid diagnostic claims about child speech.
5. Keep Monthly Assessment quiet: no live correction colour, retry prompt, or read-again correction action.
6. Preserve the daily checklist/reminder uniqueness rule: one checklist per parent/child/date and one reminder per completed checklist.
7. Keep class CSV imports validated, class-scoped, bounded to 100 rows, and transparent about unsuccessful rows.
8. Keep trend chart data and CSV export data aligned by using the same date-bounded monthly aggregation.
9. Use UTC-based timestamps internally and localise only for display.
10. Do not fabricate reviews, ratings, testimonials, or learner outcomes.

## 8. Current routes and workflow destinations

| Route | Purpose |
| --- | --- |
| `/` | Role-aware portal and the active child/teacher/parent dashboard shell. |
| `/teacher/materials/:id/review` | Focused teacher material confirmation/review and exercise-generation workflow. |
| `/teacher/assignments/confirmation` | Assignment completion screen with assigned class details, share code, and Library action. |

## 9. Current validation status

The current build has passed TypeScript checking and **40 automated tests across 14 test files**. Automated coverage includes reader state/mode logic, exercise safety, document extraction, reports, audio timing, trend export, CSV parsing, term filtering, protected data access, class roster creation, bulk import behaviour, checklist/reminder persistence, read-state changes, and duplicate protection. Authenticated browser validation has covered the role portal, child reading flows, teacher class/import/trend controls, CSV download, parent reminder badge and mark-all controls, and responsive mobile/tablet layouts.

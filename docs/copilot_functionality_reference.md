# Reader Leader: Current Functionality Reference for Copilot

> **Reference version:** `1.7.0` · **Status:** current working release · **Updated:** 2026-09-04

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
| MIS column mapping | Teachers can upload a standard school MIS CSV, inspect its headings, map a learner-name column, and optionally map a reading-level/book-band column before import. Common headings such as `Student Name`, `Pupil Name`, `Full Name`, `Reading Level`, and `Year Group` are suggested automatically. |
| CSV validation | Empty/invalid rows are reported, duplicate names in the file are reported by row, and duplicate learners are not created. Valid rows are retained even when other rows need attention. |
| CSV template | Teachers can download a ready-to-fill template with the supported columns. |
| Interactive onboarding | A three-step in-dashboard guide explains selecting a class, checking/mapping headings, and reviewing the resulting import feedback. |
| No-session learners | Learners with no saved sessions display a clean dash for story match and WCPM. They do not reduce class averages. |

### Learner reading plans

For each learner in scope, a teacher can choose a default reading mode—Assisted Practice, Guided Practice, or Monthly Assessment—and set a target WCPM. The plan is saved per learner, persists across sign-in/reload, and is applied when that child opens an assigned story.

### Irish English variation support

Teachers can select either **Standard English comparison** or **Irish English support · teacher review** for each learner. The Irish English option sends an `en-IE`-appropriate preservation prompt to server-side transcription, applies a deliberately bounded list of reviewed transcript variants in live and saved analysis, and records a supported variation as a **provisional teacher-review moment** rather than a child error. It is not a dialect classifier, an accent diagnosis, or a phoneme-level assessment. The design recognises that Irish English has systematic pronunciation differences, including rhoticity and vowel-system variation, while avoiding automatic conclusions about an individual child’s voice. [1]

| Support state | Reading-analysis behaviour | Adult safeguard |
| --- | --- | --- |
| **Standard English comparison** | Uses the ordinary expected-word comparison. | Existing low-confidence and assessment-mode review behaviours remain active. |
| **Irish English support · teacher review** | Select reviewed transcript variants can be provisionally accepted rather than coloured as an immediate child mistake. | Every provisional match is retained as an authorised teacher-review item; teachers can use saved-session playback to listen before responding. |

> **Important limitation:** Real recording timing remains transcription-segment-derived and approximate. The support option does not guarantee correct recognition of all Irish English dialects, does not replace teacher judgement, and must not be presented as diagnostic child-speech recognition.

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
| Saved named terms | Teachers can save a name and inclusive date range, such as **Autumn 2026**, and reuse it with one selection. Saved terms are private to their teacher account and can be removed when no longer useful. |
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
| History filters | Parents can filter reminder history by a specific linked child and an inclusive From/To date range. The unread badge remains an all-family notification count rather than a filtered count. |

## 5. Reports and downloads

| Output | Audience | Scope |
| --- | --- | --- |
| Child celebration PDF | Child | Own completed/saved reading data. |
| Parent progress PDF | Parent | Linked child’s authorised reading progress. |
| Teacher running-record PDF | Teacher | Learners/classes they are authorised to review. |
| Monthly assessment trends CSV | Teacher | Selected class or all-class view, with the active term range if one is applied. |
| Learner import CSV template | Teacher | Column template for teacher class roster import. |
| MIS roster import | Teacher | A selected-class import with header inspection, configurable column mapping, row-level validation, and a 100-learner cap. |

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
7. Keep class CSV imports validated, class-scoped, bounded to 100 rows, transparent about unsuccessful rows, and require an explicit learner-name column mapping when importing non-template MIS exports.
8. Keep trend chart data and CSV export data aligned by using the same date-bounded monthly aggregation.
9. Use UTC-based timestamps internally and localise only for display.
10. Do not fabricate reviews, ratings, testimonials, or learner outcomes.
11. Do not represent the Irish English support profile as comprehensive dialect recognition, accent classification, or a clinical/educational diagnosis. Keep provisional matches available for teacher listening and review.

## 8. Current routes and workflow destinations

| Route | Purpose |
| --- | --- |
| `/` | Role-aware portal and the active child/teacher/parent dashboard shell. |
| `/teacher/materials/:id/review` | Focused teacher material confirmation/review and exercise-generation workflow. |
| `/teacher/assignments/confirmation` | Assignment completion screen with assigned class details, share code, and Library action. |

## 9. API and procedure catalogue

The system uses typed tRPC procedures under `readerLeader`. The client should consume them through `trpc.readerLeader.*`; direct client-side REST calls and browser-managed credentials are not used. All mutations retain server-side role and ownership checks.

| Procedure group | Key procedures | Intended role and purpose |
| --- | --- | --- |
| `account` | `me`, `setupChild`, `setupTeacher`, `linkParent`, `joinClass` | Establishes role-scoped accounts and safely connects child, class, and family records. |
| `materials` | `extractUpload`, `listMine`, `review`, `create`, `generateExercises`, `approve`, `assignedForMe` | Lets teachers manage reading materials and reviewed exercises, while children retrieve assigned passages. |
| `sessions` | `processAndSave`, `save`, `childProgress`, `audioUrl`, `comments`, `addComment` | Stores/read-outs reading sessions, runs ASR-supported analysis, returns authorised audio URLs, and supports teacher feedback. |
| `learners` | `settings`, `saveSettings` | Reads or saves one learner’s teacher-configured default mode, target WCPM, and optional Irish English support profile. |
| `classes` | `create`, `addLearner`, `importLearners` | Manages teacher-owned classes and securely adds one or many learner records to the selected class. |
| `termPresets` | `list`, `save`, `remove` | Persists teacher-owned named reporting windows with validated inclusive dates. |
| `reports` | `monthlyTrend`, `monthlyTrendCsv`, `download`, `downloadPdf` | Produces teacher trend data/CSV exports and audience-specific reading reports with ownership checks. |
| `homePractice` | `saveChecklist`, `reminders`, `markReminderRead`, `markAllRemindersRead` | Saves a parent’s daily checklist, returns linked-child/date-filtered history, and updates reminder read states. |
| `quizzes` | `forAssignedMaterial`, `submit`, `history` | Provides child-only comprehension quizzes, submitted answers, feedback, and retry history. |
| `branding` | `mine`, `save` | Manages teacher-owned PDF branding settings. |
| `dashboards` | `teacher`, `parent` | Returns the role-scoped dashboard aggregation used by active role surfaces. |
| `demo` | `seedCohort` | Administrator-only demo-data provisioning for the guided product walkthrough. |

> **Implementation guidance:** Before adding a procedure, update the schema and migration when persistence is required, put ownership-aware data work in `server/readerDb.ts`, expose a typed protected procedure in `server/routers/readerLeader.ts`, then consume it with the existing tRPC client. Add deterministic Vitest coverage before delivery.

## 10. Interactive teacher onboarding: MIS roster import

The Teacher Dashboard includes an interactive three-step onboarding guide directly beside the import workflow. The first step reminds the teacher to select the target class, which prevents ambiguous roster placement. The second downloads the template when helpful and explains the heading-mapping step for a school MIS export. The third explains that valid rows import while duplicates or incomplete records are returned as row-level feedback.

| Step | Teacher action | System safeguard |
| --- | --- | --- |
| 1. Choose the class | Select the named roster in **Class manager**. | The import action remains unavailable until a class is selected. |
| 2. Check the headings | Upload the CSV and select the matching learner-name and optional level columns. | The preview detects common school MIS headings and blocks an unmapped or missing learner-name field. |
| 3. Import and review | Choose **Import mapped learners** and inspect the confirmation panel. | The system caps the file at 100 learner rows and reports individual row issues without concealing successful imports. |

## 11. Reference version history

| Reference version | Release checkpoint | Scope added or materially changed |
| --- | --- | --- |
| `1.0.0` | `54264746` | Original child reading MVP, supportive reports, and early role-aware interface. |
| `1.1.0` | `a8278cf0` | Persisted role links, class/material/exercise workflows, and dynamic dashboards. |
| `1.2.0` | `59ecc25e` | Guided, Assisted, and Monthly Assessment reading modes with word-state persistence. |
| `1.3.0` | `a0e28bfc` | Trend charts, word-linked saved audio playback, learner plans, routed teacher workflows, and parent checklist refinements. |
| `1.4.0` | `b40cab59` | Multi-learner class management, class trend CSV export, and persistent parent reminders. |
| `1.5.0` | `817a196c` | Bulk CSV learner import, custom term date filters, unread badges, and mark-all reminder handling. |
| `1.6.0` | `584821b3` | MIS column mapping, saved named term presets, child/date reminder history filters, interface refinement, and the interactive import onboarding guide. |
| `1.7.0` | Pending checkpoint | Teacher-configured Irish English support profile, transcription preservation context, bounded reviewed-variation matching, provisional teacher-review events, and responsive learner-plan controls. |

When a release materially changes functionality, increment the reference version, add a row to this table, update the procedure catalogue if API contracts changed, and revise the validation status below with the new test count and browser checks.

## 12. Current validation status

The current build has passed TypeScript checking and **46 automated tests across 15 test files**. Automated coverage includes reader state/mode logic, exercise safety, document extraction, reports, audio timing, trend export, template and mapped-MIS CSV parsing, saved term presets, protected data access, class roster creation, bulk import behaviour including existing-roster duplicate protection, checklist/reminder persistence, child/date history filters, Irish English opt-in variation matching, provisional review actions, live word-state behaviour, and persisted language-support settings. Authenticated browser validation has covered the role portal, child reading flows, teacher MIS mapping/import/onboarding/term-preset controls, CSV download, the saved Irish English support plan, parent reminder filters, badge and mark-all controls, and responsive mobile/tablet layouts.

## References

[1] [Isa, A. (2025). *Comparison of vowel systems in British, American and Irish English: a review*. Proceedings of the Linguistic Society of America.](https://journals.linguisticsociety.org/proceedings/index.php/PLSA/article/view/5968)

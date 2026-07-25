# FOXSCAN — Complete Project Architecture, Development History & Codebase Manual

This document provides a comprehensive overview of the **FOXSCAN** SaaS application, detailing the technical architecture, domain modeling, step-by-step workflow mechanics, database structure, parity implementations, and development log history. You can feed this entire document into Claude Pro, ChatGPT, or any other AI coder to instantly establish a full mental model of the codebase.

---

## Table of Contents
1. **Core Technologies & Project Configuration**
2. **Comprehensive Data Schema (`lib/domain.ts`)**
3. **Core Workflow Engine & Decision Pipeline (`lib/workflow.ts`)**
4. **Live Schedule-Slippage & Delayed Activities Engine (`lib/scheduling.ts`)**
5. **Key Functional Components**
   * A. Multi-Photo Geotagged Evidence Uploads (Supabase Storage)
   * B. Chronological Decision Timelines & Auditing
   * C. Rework Resubmission & Evidence Split Flows
   * D. Mandatory Action Checklist & Role Gating
   * E. Media Interactions (Audio playback & Lightbox zooming)
6. **Codebase Directories & Key Files Map**
7. **Complete Bug-Fix History & Code Refactors**
8. **Parity Checklist (Web vs Mobile)**

---

## 1. Core Technologies & Project Configuration

FOXSCAN is structured as a **monorepo** managing a Next.js web application and an Expo React Native mobile application under a unified workspace.

*   **Package Manager**: `pnpm` workspace setup (`pnpm-workspace.yaml`).
*   **Web Framework**: Next.js 15 (React 19) in the root directory.
    *   *Styling*: Vanilla CSS (`app/globals.css`).
    *   *Icons*: `lucide-react`.
*   **Mobile Framework**: Expo SDK 52 (React Native) located in `apps/mobile/`.
    *   *Styling*: NativeWind (Tailwind CSS for React Native).
    *   *Navigation*: Expo Router (File-based navigation under `apps/mobile/app/`).
    *   *Audio Engine*: `expo-audio` for recording and playback.
    *   *Camera*: `expo-camera` and `expo-image-manipulator`.
    *   *Location Services*: `expo-location`.
*   **Backend & Data Layer**:
    *   *Persistence Store*: A single JSON database file located at `data/foxscan.json`. Read/write helpers are declared in [lib/store.ts](file:///Users/max/Documents/Application/lib/store.ts) (`getData()` / `saveData()`).
    *   *Supabase Storage*: A public bucket named `site-evidence` hosted on Supabase, utilized solely for storing evidence attachments (photos and audio notes). Credentials are loaded via `.env.local` server-side variables `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

---

## 2. Comprehensive Data Schema (`lib/domain.ts`)

All TypeScript domain schemas are declared in [lib/domain.ts](file:///Users/max/Documents/Application/lib/domain.ts). Below are the core type definitions:

### Role Definition
There are 5 user roles within FOXSCAN:
```typescript
export type Role = "CONTRACTOR" | "MANUFACTURER" | "CONSULTANT" | "CLIENT" | "ADMIN";
```

### Stage Decision Schema
Tracks the approval/rework trail for a stage transition:
```typescript
export interface StageDecision {
  id: string;
  actorId: string;
  role: Role;
  decision: "RAISED" | "APPROVED" | "RETURNED" | "PAYMENT_RELEASED";
  createdAt: string;
  note?: string;      // The note inputted by the actor
  comment?: string;   // The comment inputted by the actor (mapped to note)
}
```

### Stage Schema
Maintains the state of payment releases and review loops:
```typescript
export type WorkflowState = "MANUFACTURER" | "CONSULTANT" | "CLIENT" | "AWAITING_RECEIPT" | "PAID" | "REWORK";

export interface Stage {
  id: string;
  activityId: string;
  state: WorkflowState;
  raisedAt: string;
  dueAt: string;
  submittedBy: string;
  evidence: string[]; // URLs of Supabase attachments
  checklist: {
    prep: boolean;
    coating: boolean;
    cleanup: boolean;
    evidence: boolean;
  };
  comments: {
    id: string;
    actorId: string;
    text: string;
    createdAt: string;
    kind: "RETURN_REASON" | "COMMENT";
  }[];
  decisions: StageDecision[];
  amountDue: number; // Final calculated amount with retention/GST
}
```

### Site Update (Site Log) Schema
Logs updates on site. Multiple updates can link to a single stage:
```typescript
export interface SiteUpdate {
  id: string;
  projectId: string;
  authorId: string;
  workDone: string;
  date: string;
  weather: string;
  manpower: number;
  equipment: string;
  important: boolean;
  attachments: string[]; // Supabase storage URLs
  voiceNote?: string;    // Supabase audio URL
  latitude?: number;
  longitude?: number;
  activityId?: string;
  stageId?: string;      // Linked active Stage ID
}
```

---

## 3. Core Workflow Engine & Decision Pipeline (`lib/workflow.ts`)

The approval pipeline follows a strict sequential chain:
$$\text{Contractor (Raises Stage)} \longrightarrow \text{Manufacturer (Reviews)} \longrightarrow \text{Consultant (Approves)} \longrightarrow \text{Client (Pays)} \longrightarrow \text{Contractor (Confirms Receipt)} \longrightarrow \text{PAID (Closed)}$$

All logic governing this engine lives in [lib/workflow.ts](file:///Users/max/Documents/Application/lib/workflow.ts).

### Dynamic Skip Logic
If a project is configured without a `manufacturerId` or `consultantId`, the pipeline dynamically skips those review states during transitions:
```typescript
  let nextState: WorkflowState = "PAID";
  if (stage.state === "MANUFACTURER") {
    nextState = project.consultantId ? "CONSULTANT" : "CLIENT";
  } else if (stage.state === "CONSULTANT") {
    nextState = "CLIENT";
  } else if (stage.state === "CLIENT") {
    nextState = "AWAITING_RECEIPT";
  } else if (stage.state === "AWAITING_RECEIPT") {
    nextState = "PAID";
  }
```

### Stage Creation Checks
When a Contractor raises a stage, they must pass a full checklist. The backend calculates `amountDue` automatically from the activity's BOQ details:
$$\text{amountDue} = \text{paymentValue} + (\text{paymentValue} \times \text{gstPct}/100) - (\text{paymentValue} \times \text{retentionPct}/100)$$

---

## 4. Live Schedule-Slippage & Delayed Activities Engine (`lib/scheduling.ts`)

FOXSCAN tracks schedules in real-time, accounting for parallel work paths. The logic resides in [lib/scheduling.ts](file:///Users/max/Documents/Application/lib/scheduling.ts).

### Calculation Logic
1.  **Slippage per Activity**:
    *   *If Completed (PAID)*: $\text{slippage} = \text{actualEndDate} - \text{plannedEndDate}$ (if negative, it counts as "days ahead").
    *   *If In-Progress/Overdue (and not PAID)*: If the current date exceeds the planned end date, $\text{slippage} = \text{currentDate} - \text{plannedEndDate}$.
2.  **Parallel Aggregation**:
    The system identifies **all** currently active or completed activities. It computes cumulative slippage and updates the overall project end date:
    $$\text{Projected End Date} = \text{Original End Date} + \text{Total Slippage Days}$$
3.  **Project Status States**:
    *   `AHEAD`: Total slippage $< 0$.
    *   `ON_TRACK`: Total slippage $= 0$.
    *   `BEHIND`: Total slippage is between $1$ and $7$ days.
    *   `CRITICAL_DELAY`: Total slippage exceeds $7$ days.

---

## 5. Key Functional Components

### A. Multi-Photo Geotagged Evidence Uploads
*   **Supabase Storage Uploads**: Web and Mobile upload photos directly to Supabase through a proxy API route [app/api/upload/route.ts](file:///Users/max/Documents/Application/app/api/upload/route.ts). The proxy handles files and outputs a secure public URL.
*   **Mobile Multi-Photo UI**:
    *   The Camera interface does not lock on preview. Contractors can take multiple photos sequentially.
    *   Photos display in a horizontal carousel preview row with geolocation labels overlaid.
    *   Each photo has a close (`X`) button to remove it before posting.
    *   On submission, local image URIs are fetched, converted to Blobs, uploaded in a loop, and a progress indicator updates dynamically (e.g. `"Uploading photo 2 of 4..."`).
*   **Web Multi-Photo UI**: File picker supports `multiple` selections, renders a removable file list, and uploads sequentially.

### B. Chronological Decision Timelines & Auditing
Every review stage displays a timeline tracking:
*   State transitions (e.g., `RAISED`, `APPROVED`, `RETURNED`, `PAYMENT_RELEASED`).
*   Role signatures and exact timestamps.
*   Comments/notes inputted during transitions.

### C. Rework Resubmission & Evidence Split Flows
*   **Rework Deep-Linking**: When a reviewer returns a stage, it falls into `REWORK` state. On mobile, a secondary button appears: `"Log new evidence before resubmitting"`. It deep-links to the site updates tab, pre-selecting the corresponding activity ID.
*   **Evidence Splitting**: Review screens group logged evidence dynamically:
    *   *Original Submission*: Site updates logged *before* the stage was returned.
    *   *Rework Remedial Evidence*: Site updates logged *after* the return date.
    This separates prior submissions from corrective photos/logs.

### D. Mandatory Action Checklist & Role Gating
*   **Checklist Gate**: To submit or resubmit a stage, a Contractor must explicitly check off surface preparation, coating thickness, cleanup, and evidence attachments.
*   **Backend Gating**: The PATCH handler [app/api/stages/route.ts](file:///Users/max/Documents/Application/app/api/stages/route.ts) validates that the actor's role matches `stage.state`, returning `403 Forbidden` on role mismatches.

### E. Media Interactions
*   **Web Playback**: Standard HTML5 `<audio>` elements render in-line.
*   **Mobile Playback**: Custom `VoiceNotePlayer` sub-component utilizes `useAudioPlayer` from `expo-audio` to play/pause public URLs.
*   **Photo Lightbox**: Tapping image thumbnails opens a full-screen image viewer Modal with close controls.

---

## 6. Codebase Directories & Key Files Map

```
/
├── app/                      # Next.js Web App
│   ├── api/
│   │   ├── upload/route.ts   # Supabase Storage file uploader API
│   │   ├── stages/route.ts   # Stage decisions & validation API
│   │   └── site-updates/     # Site Log entries API
│   ├── components/
│   │   ├── Workflow.tsx      # Web review pipelines & timeline rendering
│   │   └── SiteUpdates.tsx   # Web site log entry forms
│   └── globals.css           # Core stylesheet & UI colors
│
├── apps/mobile/              # Expo React Native App
│   ├── app/
│   │   └── (tabs)/
│   │       ├── site-updates.tsx # Mobile site log entry forms
│   │       └── approvals.tsx    # Mobile approvals pipeline & timeline
│   ├── components/
│   │   ├── camera-capture.tsx   # Expo camera capture component
│   │   └── voice-note.tsx       # Voice recorder (hidden/flagged)
│   └── lib/
│       └── api.ts            # Mobile fetch & base URL config
│
├── lib/                      # Shared JavaScript/TypeScript Logic
│   ├── domain.ts             # Global TS Interface definitions
│   ├── store.ts              # Local data/foxscan.json database utility
│   ├── scheduling.ts         # Slippage & delay calculations logic
│   └── workflow.ts           # State machine logic
│
└── data/
    └── foxscan.json          # Main database JSON file
```

---

## 7. Complete Bug-Fix History & Code Refactors

1.  **TextInput Import Bug (Mobile)**:
    *   *Issue*: Client payment release testing crashed with `Property 'TextInput' doesn't exist`.
    *   *Fix*: Added the missing `TextInput` import from `"react-native"` in mobile approvals.
2.  **0% Progress Lock Bug**:
    *   *Issue*: Stage workflows changed to PAID, but activity progress remained at 0%.
    *   *Fix*: Connected progress calculations directly to stage transitions: `SUBMITTED` -> 50%, `APPROVED` -> 90%, `PAID` -> 100%.
3.  **Ahead Status Logic Bug**:
    *   *Issue*: Early completions were ignored in calculations, making "AHEAD" status impossible.
    *   *Fix*: Updated the calculations to deduct early completion margins (actual vs planned differences) from the total slippage.
4.  **Parallel Delay Evaluation Bug**:
    *   *Issue*: Slippage engine evaluated only the first non-PAID activity sequence, missing parallel delays.
    *   *Fix*: Refactored calculations to evaluate *all* active/overdue activities.
5.  **Metro Cross-App Import Bug**:
    *   *Issue*: Mobile crashed with `Unable to resolve module ../../../lib/scheduling`.
    *   *Fix*: Duplicated [lib/scheduling.ts](file:///Users/max/Documents/Application/lib/scheduling.ts) to `apps/mobile/lib/scheduling.ts` for clean resolution by Metro.
6.  **Unsupported FormDataPart (Mobile Uploads)**:
    *   *Issue*: Submitting logs on mobile failed with `Unsupported FormDataPart implementation` when passing file objects.
    *   *Fix*: Standardized the upload flow on mobile. It now fetches the local file URI to retrieve a native `Blob` object, appending that `Blob` directly to `FormData`.
7.  **Voice Note Upload Hang**:
    *   *Issue*: Voice note uploads hung indefinitely on `"Uploading & Saving..."` due to audio serialization locks.
    *   *Fix*: Removed voice note upload logic and hid the voice recorder buttons to resolve the hang. Retained player logic to preserve playback for existing voice notes.
8.  **Post-Raise Auto-Linking Bug**:
    *   *Issue*: Logs entered after raising a stage were never linked to the approval view.
    *   *Fix*: Configured the backend site log endpoint to automatically search for active stages and assign `stageId` at creation time.
9.  **Git Cleanup (Untracking native folders)**:
    *   *Issue*: `apps/mobile/ios/` was tracked in git, causing build files bloat.
    *   *Fix*: Added `/ios` and `/android` to mobile `.gitignore` and ran `git rm -r --cached apps/mobile/ios/` to clean repository history.

---

## 8. Parity Checklist (Web vs Mobile)

| Feature | Next.js Web App Status | Expo Mobile App Status |
| :--- | :--- | :--- |
| **Workflow Stages** | Fully supported (Dynamic skip & 4-step pipeline) | Fully supported (Dynamic skip & 4-step pipeline) |
| **Rework Splits** | Renders Original vs Rework split layouts | Renders Original vs Rework split layouts |
| **Checklist Gates** | Restricts submit until 4 checks are ticked | Restricts submit until 4 checks are ticked |
| **Role Gating** | Validated server-side on PATCH requests | Validated server-side on PATCH requests |
| **Multi-Photo Uploads**| Sequential upload loop (Multiple attribute input) | Loop uploads using local fetches to Blobs |
| **Timeline Trail** | Completed with comment & note annotations | Completed with comment & note annotations |
| **Voice Playback** | Standard HTML5 inline `<audio>` elements | Custom `expo-audio` Player playback controller |
| **Photo Lightbox** | Browser new tab targets | Geotagged thumbnails with fullscreen zoom Modals |
| **Rework Linking** | Supported via activity selectors | Supported via deep-link action redirection |
| **Delayed TAT Alerts** | Displayed in dashboard alert panels | Rendered on active cards |

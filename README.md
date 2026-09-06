# Reflective Journal 🌿

A secure, cloud-synced AI reflection and journaling platform built with Next.js, Firebase, Google Cloud Run, and the Gemini API for the **#AccelerateAIwithCloudRun** challenge.

---

## 🌟 Overview

**Reflective Journal** combines daily journaling with guided AI reflection. Instead of generic chat prompts, it provides an interactive space for self-reflection, brainstorming, and emotional clarity, while automatically synthesizing raw discussions into structured journal entries, mood trends, and actionable tasks.

---

## ✨ Features

- **Google Authentication:** Secure sign-in protecting user data and private entries.
- **Interactive AI Dialogue:** Multi-turn conversational interface powered by the Gemini API for guided reflection and brainstorming.
- **Automated Synthesis:** Background compilation of conversations into structured journal logs with mood indicators.
- **Action Item Extraction:** Automatically parses conversations to generate organized task lists.
- **Calendar & Timeline Navigation:** Chronological archive allowing quick retrieval of past reflections.
- **Search & Discovery:** Real-time query search across all stored reflections and chat logs.
- **Distraction-Free Interface:** Minimalist design with responsive controls and dark mode support.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js (React / Tailwind CSS) | Responsive user interface, routing, and client state management |
| **Authentication** | Firebase Authentication | Secure Google Sign-In with client token verification |
| **Database** | Cloud Firestore | Isolated per-user document storage for chats, entries, and tasks |
| **Intelligence** | Google Gemini API | Conversational reflection, session summarization, and task parsing |
| **Hosting & Compute** | Google Cloud Run | Serverless, containerized deployment scaling on demand |

---

## 🔒 Security & Data Isolation

- **Client Token Verification:** Firebase ID tokens are checked before granting access to data streams.
- **Environment Isolation:** Sensitive credentials such as the Gemini API Key are managed securely at deployment without exposure to client bundles.

### Firestore Security Rules
Strict rules restrict document access so users can only read and write data under their unique Firebase `UID`. The following rules are deployed to guarantee complete user-level data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /journals/{journalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}
```
---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or 20+
- A Google Cloud Project with Cloud Run enabled
- A Firebase project with Authentication (Google Provider) and Firestore Database configured
- Gemini API Key

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/reflective-journal.git
   cd reflective-journal

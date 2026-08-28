# Intelligent Email Assistant

An intelligent, full-stack email client and productivity platform powered by Google Gemini AI, Gmail API, and Supabase. Features real-time inbox synchronization, thread summaries, tone-adaptive smart reply generation, priority detection, action-item and date extraction, and cloud-backed activity logging.

---

## 🌟 Key Features

- **Google Workspace & Gmail API Integration**:
  - Secure OAuth 2.0 authorization with automatic token refresh.
  - Live inbox synchronization, thread navigation, search, read/unread toggling, star tagging, archiving, and trashing.
  - Direct email composition and delivery via Gmail API.
  - Quota and account storage indicators.

- **AI-Powered Email Intelligence (Google Gemini 3.7 Flash)**:
  - **Thread & Message Summarization**: Extracts key takeaways, meeting outcomes, and context in seconds.
  - **Tone-Adaptive Smart Reply Generator**: Generates customized replies in *Professional*, *Friendly*, *Formal*, or *Concise* styles with custom user prompts.
  - **Priority Detection**: Analyzes urgency and impact, flagging high-priority emails with reasoning.
  - **Action-Item Extraction**: Isolates deliverables and tasks directly from conversational text.
  - **Important Date & Deadline Detection**: Flags meetings, milestones, and deadlines.
  - **Smart Email Categorization**: Automatically categorizes communications into *Work*, *Personal*, *Finance*, *Updates*, and *Promotions*.

- **Persistent Cloud Database (Supabase)**:
  - Stores user profiles and encrypted connected account linkages.
  - Audit logging for all AI-assisted actions (`ai_activity` table).
  - Synchronizes tone preferences and custom prompt templates across devices.
  - Resilient in-memory fallback for local offline testing.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Node.js, Express, TypeScript (`server/app.ts`).
- **Serverless Runtime**: Vercel Serverless Functions (`api/index.ts`).
- **AI & LLM**: Google Gemini 3.7 Flash via `@google/genai` SDK.
- **Email & Auth**: Google Cloud Console OAuth 2.0 & Gmail REST API v1.
- **Database**: Supabase (PostgreSQL & REST API).

---

## 🏗️ Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│               Frontend (React 18 + Vite)               │
│         Single-Page Application (Tailwind CSS)         │
└───────────────────────────┬────────────────────────────┘
                            │ (Client API Calls: /api/*)
                            ▼
┌────────────────────────────────────────────────────────┐
│           Vercel Serverless / Express Layer            │
│                 (api/index.ts, server/app.ts)          │
└─────┬─────────────────────┬──────────────────────┬─────┘
      │                     │                      │
      ▼                     ▼                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Gmail API   │     │  Gemini AI   │     │   Supabase   │
│ (OAuth 2.0)  │     │ (3.7 Flash)  │     │  (Postgres)  │
└──────────────┘     └──────────────┘     └──────────────┘
```

- **Client-Side**: Lightweight React SPA with zero secret exposure.
- **Server-Side**: All Google Client Secrets, Gemini API keys, and Supabase Service Role keys reside exclusively in server-side environment variables.

---

## 🔐 Environment Variables

Configure these variables in your **Vercel Project Settings > Environment Variables** (or in `.env` for local development):

| Variable Name | Scope | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Server-Only** | Google Gemini API key for AI summarization, smart replies, and analytics. |
| `GOOGLE_CLIENT_ID` | Server & Client | Google OAuth 2.0 Client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | **Server-Only** | Google OAuth 2.0 Client Secret for server-side token exchange. |
| `GOOGLE_REDIRECT_URI` | Server | Optional explicit OAuth callback URL (e.g., `https://your-domain.vercel.app/auth/callback`). Auto-detected if omitted. |
| `SUPABASE_URL` | Server | Supabase project REST API endpoint. |
| `SUPABASE_ANON_KEY` | Server | Supabase anonymous API public key. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Supabase Service Role secret key for administrative table operations. |
| `APP_URL` | Server | Optional base URL of the deployed application. |

> ⚠️ **Security Notice**: Never commit `.env` or secret keys to version control. The repository's `.gitignore` automatically excludes all `.env*` files.

---

## 🔑 Service Setup Guides

### 1. Google Cloud Console (OAuth 2.0 & Gmail API)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Gmail API**.
3. Configure the **OAuth Consent Screen** (User type: *External* or *Internal*).
4. Add the required OAuth scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Create **OAuth 2.0 Client Credentials** (Web Application):
   - **Authorized JavaScript Origins**: `http://localhost:3000` and `https://<your-vercel-domain>.vercel.app`
   - **Authorized Redirect URIs**: `http://localhost:3000/auth/callback` and `https://<your-vercel-domain>.vercel.app/auth/callback`
6. Copy the generated **Client ID** and **Client Secret**.

### 2. Google Gemini API
1. Generate an API key from [Google AI Studio](https://aistudio.google.com/).
2. Set the key as `GEMINI_API_KEY`.

### 3. Supabase Database
1. Create a new project at [Supabase](https://supabase.com/).
2. Copy your **Project URL**, **Anon Key**, and **Service Role Key** from *Project Settings > API*.
3. The server automatically initializes and manages the required schema (`users`, `connected_accounts`, `ai_activity`, `user_preferences`, `email_categories`).

---

## 💻 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Gonerishith/Intelligent-Email-Assistant.git
   cd Intelligent-Email-Assistant
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Populate .env with your Google, Gemini, and Supabase credentials
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be live at `http://localhost:3000`.

5. **Build and test locally**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 🚀 Vercel Deployment

1. **Push your code** to your GitHub repository:
   ```bash
   git add .
   git commit -m "Prepare Intelligent Email Assistant for Vercel production"
   git push origin main
   ```

2. **Import into Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/new).
   - Select your GitHub repository `Intelligent-Email-Assistant`.
   - Preset: **Vite**
   - Build Command: `vite build`
   - Output Directory: `dist`

3. **Add Environment Variables**:
   - In the Vercel project configuration, add all required variables (`GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

4. **Update Google Cloud Console**:
   - Copy your assigned production Vercel URL (e.g., `https://intelligent-email-assistant.vercel.app`).
   - Add `https://intelligent-email-assistant.vercel.app` to **Authorized JavaScript Origins**.
   - Add `https://intelligent-email-assistant.vercel.app/auth/callback` to **Authorized Redirect URIs**.

5. **Deploy**:
   - Click **Deploy**. Vercel will build the frontend into static assets and deploy the backend as serverless functions via `vercel.json`.

---

## 🧪 Testing Major Features

1. **Connect Gmail Account**:
   - Click **Connect Gmail Account** on the login or settings page. Complete the Google OAuth consent flow in the popup window.
2. **Synchronize & Navigate Inbox**:
   - View live messages, switch between folders (Inbox, Starred, Sent, Archived, Trash), and search across subjects and senders.
3. **AI Email Summarization**:
   - Select any email thread and click **Summarize with Gemini** to generate key takeaways, priority classification, and action items.
4. **Smart Reply Generation**:
   - Open the reply panel, choose a tone (*Professional*, *Friendly*, *Formal*, *Concise*), optionally enter custom guidelines, and click **Generate Draft**.
5. **Send & Archive**:
   - Send replies or new emails directly through Gmail API and verify real-time status updates in your mailbox.
6. **Activity Log & Preferences**:
   - Check the **AI Activity** tab to review all cloud-recorded summaries and drafts synchronized with Supabase.

---

## 🛡️ Security & Privacy

- **Zero Client-Side Secrets**: All third-party secrets (`GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) are kept strictly on the serverless backend.
- **HTTP-Only Cookies & Bearer Tokens**: Session tokens use secure, partitioned, HTTP-only cookies with cross-site protection.
- **Anti-CSRF Protection**: OAuth authorizations use cryptographically secure state tokens with automatic expiration.
- **HTML Sanitization**: All inbound email HTML bodies are sanitized before rendering to eliminate malicious scripts and injection vectors.

---

## 📄 License

This project is licensed under the MIT License.

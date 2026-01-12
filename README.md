# Proxy Server for Canvas GPT

A ChatGPT GPT that connects to Canvas LMS using OAuth.

## What's Included

| File | Purpose |
|------|---------|
| `src/index.js` | Cloudflare Worker - OAuth login page |
| `wrangler.toml` | Cloudflare configuration |
| `package.json` | Node.js dependencies |
| `openapi-spec.json` | OpenAPI schema for ChatGPT (30 operations) |
| `gpt-instructions.txt` | Instructions for your GPT |

---

## How It Works

```
User clicks "Sign in" in ChatGPT
         ↓
Redirects to your OAuth page
         ↓
User pastes their Canvas token
         ↓
Token sent back to ChatGPT as OAuth access token
         ↓
ChatGPT calls Canvas API directly with the token
```

**Your server only handles the login page. All API calls go directly from ChatGPT to Canvas.**

---

## Part 1: Deploy the OAuth Page

### Step 1: Install Prerequisites
```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare
```bash
wrangler login
```

### Step 3: Navigate to this folder
```bash
cd canvas-oauth
```

### Step 4: Install dependencies
```bash
npm install
```

### Step 5: Deploy
```bash
npm run deploy
```

### Step 6: Copy your Worker URL
You'll see something like:
```
Published canvas-oauth (1.0.0)
  https://canvas-oauth.your-subdomain.workers.dev
```

**Save this URL!**

---

## Part 2: Update the OpenAPI Spec

Open `openapi-spec.json` and find these lines:

```json
"authorizationUrl": "https://canvas-oauth.YOUR_SUBDOMAIN.workers.dev/authorize",
"tokenUrl": "https://canvas-oauth.YOUR_SUBDOMAIN.workers.dev/token",
```

Replace `YOUR_SUBDOMAIN` with your actual Cloudflare subdomain.

---

## Part 3: Create the GPT

### Step 1: Go to https://chat.openai.com

### Step 2: Click your profile → My GPTs → Create a GPT

### Step 3: Click "Configure" tab

### Step 4: Fill in:

**Name:**
```
Grambling Canvas GPT
```

**Description:**
```
Your personal Canvas assistant for Grambling State University. Check courses, assignments, grades, due dates, submit work, post to discussions, message professors, and more.
```

**Instructions:**
Copy the entire contents of `gpt-instructions.txt`

**Conversation Starters:**
```
What's due this week?
Show me my grades
Do I have any missing assignments?
Help me post to a discussion
```

### Step 5: Add the Action

1. Scroll to "Actions" → Click "Create new action"
2. Delete any default text
3. Copy ALL contents of `openapi-spec.json` and paste
4. Click the **Authentication** gear icon
5. Select **OAuth**
6. Fill in:
   - **Client ID:** `canvas-gpt` (can be anything)
   - **Client Secret:** `canvas-gpt-secret` (can be anything)
   - **Authorization URL:** `https://canvas-oauth.YOUR_SUBDOMAIN.workers.dev/authorize`
   - **Token URL:** `https://canvas-oauth.YOUR_SUBDOMAIN.workers.dev/token`
   - **Scope:** (leave empty)
   - **Token Exchange Method:** Default (POST request)
7. Click "Save"

### Step 6: Test It

1. Click "Preview" in the top right
2. Say "What are my courses?"
3. You should see a "Sign in" button
4. Click it, paste your Canvas token
5. You should see your courses!

### Step 7: Save/Publish

Choose visibility:
- "Only me" — just you
- "Anyone with link" — share with classmates
- "Everyone" — GPT Store (requires review)

---

## Privacy & Security

### What This System Does:
- Shows a login page where users paste their Canvas token
- Passes that token to ChatGPT
- ChatGPT stores it and uses it for Canvas API calls

### What This System Does NOT Do:
- Store tokens on the server
- Log any user data
- Proxy API calls (ChatGPT calls Canvas directly)

### User Data Flow:
1. User's token → Your login page (1 second, during redirect)
2. User's token → ChatGPT (stored by OpenAI)
3. User's token → Canvas API (sent by ChatGPT)

### Users Can:
- Revoke their token anytime in Canvas settings
- Delete their data in ChatGPT settings

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Sign in" button doesn't appear | Check OAuth URLs in GPT settings |
| Login page shows error | Verify Worker is deployed |
| Canvas returns 401 | Token is invalid or expired |
| "Action failed" | Check OpenAPI spec syntax |

---

## Customizing for Other Schools

To use this for a different school:

1. Edit `src/index.js`:
   - Change `SCHOOL_NAME`
   - Change `CANVAS_DOMAIN`

2. Edit `openapi-spec.json`:
   - Change the server URL to your school's Canvas domain

3. Redeploy

---

## Files Overview

### src/index.js
The OAuth login page. Three endpoints:
- `/` - Home page
- `/authorize` - Login form (ChatGPT redirects here)
- `/token` - Returns token to ChatGPT

### openapi-spec.json
30 Canvas API operations:
- Courses, Assignments, Submissions
- Discussions, Announcements
- Calendar, Planner, Todo
- Messages, Files, Quizzes
- User search

### gpt-instructions.txt
Tells the GPT how to:
- Chain API calls
- Format responses
- Handle errors
- Confirm before actions

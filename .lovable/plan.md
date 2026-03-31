

# AI-Powered Exhibitor Matching & Chat

## Overview

Add a new page `/match` with three sections:
1. **Company Profile** — a form where the user describes their company (name, industry, what they're looking for, keywords)
2. **AI Matching Results** — AI analyzes exhibitors against the company profile and returns ranked matches with relevance scores and reasoning
3. **Chat Interface** — a conversational panel to refine the analysis, ask follow-up questions, and get deeper insights about specific exhibitors

## Architecture

- **Backend**: A Supabase Edge Function (`ai-match`) that calls Lovable AI Gateway with the company context + exhibitor data, supporting both "match" and "chat" modes
- **Frontend**: New `/match` route with a split layout — profile + results on top, chat below

## Plan

### 1. Create Edge Function `supabase/functions/ai-match/index.ts`

- Accepts two modes via POST body:
  - `mode: "match"` — receives `companyProfile` (text) + `exhibitors` (array) → returns ranked matches with scores and reasoning via structured tool calling
  - `mode: "chat"` — receives `messages` (conversation history) + `companyProfile` + `exhibitors` → streams a conversational response for refinement
- Uses `LOVABLE_API_KEY` to call `https://ai.gateway.lovable.dev/v1/chat/completions`
- Streaming for chat mode, non-streaming structured output for match mode
- Handles 429/402 errors

### 2. Create Company Profile Store (`src/lib/company-profile.ts`)

- Simple state type: `{ name, industry, description, lookingFor, keywords }` 
- Persisted in localStorage so user doesn't re-enter each visit

### 3. Create Match Page (`src/pages/Match.tsx`)

**Top section — Company Profile Form:**
- Fields: Company Name, Industry, Description (textarea), What You're Looking For (textarea), Keywords (comma-separated)
- "Find Matches" button that sends profile + exhibitor data to the edge function

**Middle section — Match Results:**
- Cards showing matched exhibitors ranked by relevance score (1-100)
- Each card shows: exhibitor name, booth, score badge, AI reasoning snippet, products overlap
- Click to expand full detail

**Bottom section — Chat Panel:**
- Chat interface with message history
- Pre-loaded context: company profile + exhibitor data + match results
- User can ask things like "Tell me more about exhibitor X", "Which ones export to Brazil?", "Refine for LED products only"
- Streaming responses rendered with markdown

### 4. Update Navigation

- Add nav tabs in `DashboardHeader` linking to `/` (Dashboard) and `/match` (AI Matching)
- Add route in `App.tsx`

### 5. Wire Exhibitor Data

- The match page imports `mockExhibitors` (or fetches from API when backend is connected)
- Sends the full exhibitor list as context to the AI for matching

## Technical Details

- **Model**: `google/gemini-3-flash-preview` (default, fast and capable)
- **Match mode**: Uses tool calling with a schema that returns `{ matches: [{ exhibitorId, score, reasoning, suggestedProducts }] }`
- **Chat mode**: Streams SSE responses, system prompt includes company profile + exhibitor data + previous match results
- **Edge function config**: `verify_jwt = false` for simplicity (internal tool)
- Markdown rendering in chat via `react-markdown` (needs install)


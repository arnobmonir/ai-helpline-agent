# Amber IT AI Helpline Demo

Pitch-ready browser softphone + supervisor dashboard. **Nusrat** answers via Gemini Live native audio (bn-BD / Bangla / English / Banglish). Mock Amber IT customers, bills, outages, and tickets — not a live BTRC number.

Companion docs: [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md) · [docs/DEV_PLAN.md](docs/DEV_PLAN.md)

## Quick start

1. **Install**

```bash
npm install
```

2. **API key** — Google AI Studio key with Live / native-audio access:

```bash
cp .env.local.example .env.local
# edit .env.local → set GEMINI_API_KEY=...
```

3. **Run** (Next.js on `:3000` + live proxy on `:3001`):

```bash
npm run dev
```

4. **Demo**

- Softphone: [http://localhost:3000](http://localhost:3000)
- Top-right **Demo CIDs** for dummy customers (pitch: `AIT-100234`)

Allow microphone. Click **Call** → ring → Nusrat greets.

## Pitch script

1. Bangla: “Internet nai, ONU te lal light.” (CID `AIT-100234` / `01711001234`) → Gulshan outage + ticket id spoken  
2. English: “What’s my bill?” → amount + bKash / Nagad / Rocket / myswift  
3. “Upgrade to 200 Mbps.” → 200 Mbps ৳2000 + 5% VAT (৳2100), commercial ticket  
4. Barge-in while she is talking → she stops and continues  
5. “I want a human.” → call parks for handoff

Open **Supervisor** from the header (or [http://localhost:3000/ops](http://localhost:3000/ops)) in a second window. Optional **ANI known** toggle skips asking for CID on the pitch customer (`AIT-100234`).

Use top-right **Demo CIDs** for dummy accounts.

## Architecture

```
Softphone (16 kHz PCM) → server/live-proxy.ts → Gemini Live native audio
                              ↓ tool calls
                         lib/agent + mock Amber IT + RAG (lib/rag)
```

| Path | Role |
|------|------|
| `app/page` (`/`) | Softphone + Demo CIDs |
| `server/live-proxy.ts` | WebSocket proxy + tools + session bus |
| `lib/agent/amber-agent.ts` | Nusrat instructions + tool schemas |
| `lib/rag/*` | Support KB corpus + embeddings + `searchKnowledge` |
| `lib/voice/gemini-live.ts` | Gemini setup / PCM helpers |
| `lib/mock/*` | Customers, tickets, outages, scene |

RAG indexes curated Amber IT support chunks at proxy startup (Gemini `gemini-embedding-001`, cached under `.cache/`). Lexical fallback if embeddings fail.

API key never leaves the proxy (`GEMINI_API_KEY`).

## Demo customer cheat sheet

| CID | Phone | Area | Notes |
|-----|-------|------|-------|
| AIT-100234 | 01711001234 | Gulshan | Primary pitch (outage / unpaid) — 125 Mbps |
| AIT-100891 | 01812004567 | Badda | Paid / online |
| AIT-101402 | 01913007890 | Dhanmondi | Overdue bill — 200 Mbps |
| AIT-102033 | 01614001122 | Banani | |
| AIT-103210 | 01515003344 | Mirpur | Power off ONU — 20 Mbps |
| AIT-104555 | 01716005566 | Uttara | |
| AIT-105777 | 01817007788 | Mohammadpur | 250 Mbps |

New connection → sales **09611-933933**.

## Env

| Variable | Default | Notes |
|----------|---------|-------|
| `GEMINI_API_KEY` | — | Required for voice (+ RAG embeddings) |
| `GEMINI_LIVE_MODEL` | `gemini-2.5-flash-native-audio-latest` | |
| `GEMINI_LIVE_VOICE` | `Sulafat` | Warm female voice |
| `GEMINI_AFFECTIVE_DIALOG` | `false` | Off = lower latency |
| `GEMINI_LIVE_TRANSCRIPTION` | unset | `true` force on, `false` force off. Default: on when Supervisor is connected |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001` | RAG vectors |
| `LIVE_PROXY_PORT` | `3001` | |
| `NEXT_PUBLIC_LIVE_PROXY_URL` | `ws://localhost:3001` | Browser → proxy |

## Phase 2 — IP-PBX (not in this build)

Reuse the same 16 kHz PCM path and `lib/agent`. Real DID hits Amber IT IP-PBX; AI is a SIP endpoint; `escalateToHuman` becomes a queue transfer. CDR/recording stay on the PBX.

## Scripts

- `npm run dev` — Next + live proxy  
- `npm run dev:next` / `npm run dev:proxy` — run separately  
- `npm run build` — production Next build  

## Out of scope

IP-PBX / SIP, live myswift or ticketing APIs, production SLA / PCI / call recording retention, OpenAI realtime toggle.

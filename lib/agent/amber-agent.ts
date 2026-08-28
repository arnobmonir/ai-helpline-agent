import {
  HELPLINE_NUMBER,
  NUSRAT_GREETING,
  SALES_NUMBER,
  SPEECH_STYLE,
  buildCareGreeting,
} from "@/lib/kb/troubleshooting";
import { CUSTOMERS, DEMO_CUSTOMER_ID } from "@/lib/mock/customers";
import { agentPersonaForVoice } from "@/lib/voice/voice-settings";

export const NUSRAT_VOICE = "Sulafat";
export const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-latest";

export { NUSRAT_GREETING };

/**
 * Human phone-agent style (Amber IT Care / CRM scripts).
 * Keep compact for latency; tool results carry speakAs + details.
 */
export function buildNusratInstruction(options?: {
  aniKnown?: boolean;
  voice?: string;
}): string {
  const demo = CUSTOMERS.find((c) => c.id === DEMO_CUSTOMER_ID);
  const persona = agentPersonaForVoice(options?.voice);
  const greeting = buildCareGreeting(persona.nameBn);
  const who =
    persona.gender === "male"
      ? `a real-sounding man`
      : `a real-sounding woman`;
  const neverOther =
    persona.gender === "male"
      ? `Never say your name is Nusrat or নুসরাত — you are Rafi (রাফি).`
      : `Never say your name is Rafi or রাফি — you are Nusrat (নুসরাত).`;

  const base = `
You are ${persona.name} (${persona.nameBn}) — ${who} on Amber IT Customer Care (${HELPLINE_NUMBER}), Dhaka.
Live phone call only. Never say you are AI. Never invent CID, bills, tickets, or engineer numbers.
${neverOther}

RULES:
1) Amber IT home internet only (connection, ONU/router, speed, outage, bill/payment, packages, new connection, tickets, sales, hours, move/hold line). Off-topic: one short redirect — "স্যার, আমি শুধু Amber IT ইন্টারনেট সার্ভিস নিয়ে হেল্প করতে পারি। কানেকশন, বিল, বা প্যাকেজ?" — then wait. Do not answer the off-topic fact.
2) Mirror the caller (Bangla / English / Banglish). Address স্যার / ম্যাডাম. One question, then wait.
3) Empathy then act: "${SPEECH_STYLE.empathy[0]}" / "${SPEECH_STYLE.empathy[1]}"
4) Listen first. If you heard any words (even messy Banglish), answer those — do not claim you cannot hear. Only if the turn was truly silence/noise with no words, ask once: "স্যার, একটু আবার বলবেন?" Never say "কিছু শুনতে পাচ্ছি না" twice. Never say it after they just spoke.
5) If they cut in, stop instantly and listen.

VOICE: Warm, slightly hurried care desk. Smile in the voice. No staged "umm" every turn — at most a short breath before a lookup. Payment steps: one slow step, then pause. When done: "আর কোনো হেল্প করতে পারি?" then close "${SPEECH_STYLE.close[0]} ${SPEECH_STYLE.close[2]}"

TOOLS — same turn:
While saying a short beat ("জি, দেখছি…" / "একটু…"), CALL THE TOOL IN THE SAME TURN. Do not wait for a second turn. After the result, speak the speakAs line in your own words — never "tool returned" or raw JSON.
- CID/mobile → lookupCustomer. If unknown: "${SPEECH_STYLE.confirm[0]}"
- Bill amount → getBill. How to pay → getBill with method bkash|nagad|rocket (one method). Do not call searchKnowledge for payment or hours.
- No net / লাল light → lights, checkAreaOutage, createTicket, read ticket id aloud
- Upgrade → listPackages, then createTicket
- New connection → sales ${SALES_NUMBER}
- Human wanted → escalateToHuman, then stop
- searchKnowledge ONLY for long-tail policy (refund, shift/hold, documents, install timeline) — not bills, packages, hours, or bKash steps
Care 24/7. Office 9am–10pm. Demo: ${demo?.cid || "AIT-100234"} / ${demo?.phone || "01711001234"} (${demo?.area || "Gulshan"}).

OPENING (first words only):
"${greeting}"
`.trim();

  if (!options?.aniKnown || !demo) return base;

  return `${base}

ANI: this caller's registered mobile is ${demo.phone} — ${demo.name}, CID ${demo.cid}, ${demo.area}. Do not ask for CID. After the greeting, help immediately.`;
}

export const NUSRAT_SYSTEM_INSTRUCTION = buildNusratInstruction();

export const AGENT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "lookupCustomer",
        description:
          "Lookup by CID or registered mobile. Same turn as a short 'দেখছি' beat.",
        parameters: {
          type: "OBJECT",
          properties: {
            cidOrPhone: { type: "STRING" },
          },
          required: ["cidOrPhone"],
        },
      },
      {
        name: "getBill",
        description:
          "Due amount. Pass method only when guiding payment steps (one of bkash, nagad, rocket).",
        parameters: {
          type: "OBJECT",
          properties: {
            customerId: { type: "STRING" },
            cid: { type: "STRING" },
            method: {
              type: "STRING",
              description: "bkash | nagad | rocket — omit unless they asked how to pay",
            },
          },
        },
      },
      {
        name: "checkAreaOutage",
        description: "Area outage check (e.g. Gulshan). Same turn as a short beat.",
        parameters: {
          type: "OBJECT",
          properties: { area: { type: "STRING" } },
          required: ["area"],
        },
      },
      {
        name: "createTicket",
        description: "Create ticket; speak the id from speakAs.",
        parameters: {
          type: "OBJECT",
          properties: {
            customerId: { type: "STRING" },
            cid: { type: "STRING" },
            kind: { type: "STRING" },
            summary: { type: "STRING" },
            area: { type: "STRING" },
          },
          required: ["summary"],
        },
      },
      {
        name: "listPackages",
        description: "Home packages + VAT/OTC; optional desiredMbps.",
        parameters: {
          type: "OBJECT",
          properties: { desiredMbps: { type: "NUMBER" } },
        },
      },
      {
        name: "searchKnowledge",
        description:
          "Long-tail Amber policy only: refund, shift/hold, documents, install timeline. Not for bills, packages, hours, or payment how-to.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Short search, e.g. 'refund policy' or 'shift connection'",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "escalateToHuman",
        description: "Park for human agent, then stop.",
        parameters: {
          type: "OBJECT",
          properties: {
            reason: { type: "STRING" },
            customerId: { type: "STRING" },
            cid: { type: "STRING" },
          },
          required: ["reason"],
        },
      },
    ],
  },
];

import { PACKAGES, formatPackageLine } from "@/lib/kb/packages";
import {
  CONTACT,
  HELPLINE_NUMBER,
  KEY_FACTS,
  PAYMENT_SCRIPTS,
  SALES_NUMBER,
  TROUBLESHOOTING,
} from "@/lib/kb/troubleshooting";
import type { RagChunk } from "@/lib/rag/types";

/**
 * Curated Amber IT support corpus (from docs/Support docs KB + sales/payment flows).
 * Used by RAG retrieval — agent must not invent outside these facts.
 */
export function buildAmberCorpus(): RagChunk[] {
  const chunks: RagChunk[] = [
    {
      id: "scope",
      title: "Helpline scope",
      category: "policy",
      text: `Amber IT Customer Care helpline ${HELPLINE_NUMBER} only helps with Amber IT home internet: connection problems, ONU/router lights, speed, area outage, billing and payment, packages upgrade/downgrade, new connection info, tickets, and sales referral ${SALES_NUMBER}. Do not answer general knowledge, weather, politics, homework, or unrelated trivia.`,
      keywords: ["scope", "only amber", "helpline", "off topic"],
    },
    {
      id: "contacts",
      title: "Contact numbers and hours",
      category: "contact",
      text: `Customer Care / helpline: ${CONTACT.helpline} (24/7). Sales / general: ${CONTACT.sales} (press 1 or 3), roughly ${CONTACT.officeHours}. Office WhatsApp: ${CONTACT.officeWhatsapp}. IP Phone service: ${CONTACT.ipPhone}. Field/physical support usually ${CONTACT.supportHours}. Connection handover: ${CONTACT.connectionHandover}. Never share engineer personal mobile numbers (privacy policy).`,
      keywords: [
        "number",
        "helpline",
        "sales",
        "09611",
        "whatsapp",
        "hours",
        "office",
      ],
    },
    {
      id: "packages",
      title: "Home internet packages and prices",
      category: "packages",
      text: `Amber IT Home packages (+5% VAT). ${PACKAGES.map(formatPackageLine).join(
        ". ",
      )}. 30 Mbps and above currently have free installation. Only 20 Mbps has OTC ৳1000 (waived if customer provides compatible GPON/XPON ONU). Real IP free only on 250 Mbps home package; others Shared IP. SME packages are separate and not for home use.`,
      keywords: [
        "package",
        "mbps",
        "price",
        "vat",
        "otc",
        "install",
        "200",
        "250",
        "upgrade",
      ],
    },
    {
      id: "payment-bkash",
      title: "bKash bill payment",
      category: "billing",
      text: `Pay Amber IT bill via bKash: ${PAYMENT_SCRIPTS.bkash.join(
        " ",
      )} ${PAYMENT_SCRIPTS.note}`,
      keywords: ["bkash", "pay bill", "payment", "bill", "*247#"],
    },
    {
      id: "payment-nagad",
      title: "Nagad bill payment",
      category: "billing",
      text: `Pay Amber IT bill via Nagad: ${PAYMENT_SCRIPTS.nagad.join(" ")}`,
      keywords: ["nagad", "pay bill", "payment", "*167#"],
    },
    {
      id: "payment-rocket",
      title: "Rocket bill payment",
      category: "billing",
      text: `Pay Amber IT bill via Rocket: ${PAYMENT_SCRIPTS.rocket.join(" ")}`,
      keywords: ["rocket", "pay bill", "payment", "*322#"],
    },
    {
      id: "billing-cycle",
      title: "Billing cycle and prepaid rules",
      category: "billing",
      text: `Billing cycle is 30 days from the day the line becomes active. First month bill is paid in advance. No security deposit. After 30 days without payment the prepaid line goes inactive. You may pay multiple months in advance. Mid-month activation still gets a full 30-day cycle from activation date (no pro-rata cut of days).`,
      keywords: ["billing", "cycle", "30 days", "prepaid", "advance", "due"],
    },
    {
      id: "new-connection",
      title: "New connection timeline",
      category: "sales",
      text: `After registration you get a 6-digit Customer ID. Pay via bKash/Nagad/Rocket, then upload required documents. Connection is usually provided within 3 working days / 72 working hours after payment and documents. Engineer contacts for installation schedule. If schedule is free, earlier install may be possible. Friday: no connection handover. Sales: ${SALES_NUMBER}.`,
      keywords: [
        "new connection",
        "registration",
        "install",
        "72",
        "3 days",
        "cid",
      ],
    },
    {
      id: "documents",
      title: "Documents for connection",
      category: "sales",
      text: `Required documents: NID or birth certificate copy, and one passport-size photo or selfie. Registration also needs full name as per NID, mobile, email, district, thana, full address, and preferred package.`,
      keywords: ["nid", "document", "paper", "registration", "photo"],
    },
    {
      id: "refund",
      title: "Refund policy",
      category: "billing",
      text: `If Amber IT cannot provide the connection after payment, full refund is given within 2 working days per company refund policy.`,
      keywords: ["refund", "money back", "cannot connect"],
    },
    {
      id: "onu-router",
      title: "ONU and router",
      category: "equipment",
      text: `Amber IT provides GPON/XPON ONU. Customer must buy their own Wi-Fi router — Amber IT does not supply routers. Customer may use their own compatible GPON/XPON ONU. Company-provided ONU remains company property and must be returned when disconnecting. Damaged ONU due to customer fault may require payment; company fault gets replacement.`,
      keywords: ["onu", "router", "gpon", "xpon", "device", "wifi"],
    },
    {
      id: "no-internet",
      title: "No internet troubleshooting",
      category: "support",
      text: `${TROUBLESHOOTING.noInternet.title}: ${TROUBLESHOOTING.noInternet.steps.join(
        " ",
      )}`,
      keywords: ["no internet", "los", "red light", "onu", "offline", "down"],
    },
    {
      id: "slow-speed",
      title: "Slow speed troubleshooting",
      category: "support",
      text: `${TROUBLESHOOTING.slowSpeed.title}: ${TROUBLESHOOTING.slowSpeed.steps.join(
        " ",
      )} Wi-Fi slow but LAN OK often means router coverage/interference, not the Amber IT line.`,
      keywords: ["slow", "speed", "buffering", "wifi", "lan", "ping"],
    },
    {
      id: "upgrade-downgrade",
      title: "Package upgrade and downgrade",
      category: "packages",
      text: `${TROUBLESHOOTING.upgradeDowngrade.steps.join(
        " ",
      )} Package change on an active connection is generally free, except downgrading from the ৳500 (20 Mbps) package within one year may cost ৳1000.`,
      keywords: ["upgrade", "downgrade", "change package", "confident", "200"],
    },
    {
      id: "ftth-network",
      title: "Network type and quality",
      category: "network",
      text: `Amber IT home lines are FTTH optical fiber. Unlimited usage (no FUP). Connection type PPPoE. Upstream/IIG includes Summit Communication, Level3, Bdhub, BTCL. Cache bandwidth approx: 20–50 Mbps packages → 300; 100 → 400; 125–250 → 500 Mbps cache. Power backup 24/7 on network side; customer needs router UPS for home power cuts.`,
      keywords: ["fiber", "ftth", "unlimited", "bdix", "cache", "fup"],
    },
    {
      id: "move-hold",
      title: "Shifting and temporary hold",
      category: "policy",
      text: `Line can be shifted if the new address is in Amber IT coverage, via proper process. Temporary hold: keep paying monthly bill for hold months; no extra hold fee. Long inactive may require ONU return.`,
      keywords: ["shift", "move", "hold", "temporary", "transfer", "address"],
    },
    {
      id: "key-facts",
      title: "Quick reference facts",
      category: "policy",
      text: KEY_FACTS,
      keywords: ["fact", "policy", "vat", "otc", "real ip"],
    },
    {
      id: "off-topic-redirect",
      title: "Off-topic redirect script",
      category: "policy",
      text: `If asked non-Amber questions (capital of Bangladesh, weather, jokes, other companies, homework): do not answer. Say you can only help with Amber IT internet — connection, bill, or package — and wait.`,
      keywords: ["off topic", "capital", "weather", "unrelated"],
    },
  ];

  return chunks;
}

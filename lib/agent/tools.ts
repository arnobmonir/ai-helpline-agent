import {
  DEMO_CUSTOMER_ID,
  CUSTOMERS,
  findCustomer,
  type Customer,
} from "@/lib/mock/customers";
import { checkAreaOutage } from "@/lib/mock/outages";
import { getScene } from "@/lib/mock/scene";
import {
  createTicket as createTicketRecord,
  escalateToHuman as escalateRecord,
  type TicketKind,
} from "@/lib/mock/tickets";
import {
  formatPackageLine,
  getPackage,
  PACKAGES,
  withVat,
  type PackageId,
} from "@/lib/kb/packages";
import { PAYMENT_SCRIPTS } from "@/lib/kb/troubleshooting";
import { searchKnowledge } from "@/lib/rag/store";

export interface ToolResult {
  ok: boolean;
  data: Record<string, unknown>;
  events?: Array<{
    type: "customer" | "ticket" | "handoff" | "scene";
    payload: unknown;
  }>;
}

function byId(id: string): Customer | undefined {
  return CUSTOMERS.find((c) => c.id === id);
}

function applySceneToCustomer(customer: Customer): Customer {
  const scene = getScene();
  const clone: Customer = {
    ...customer,
    bill: { ...customer.bill },
  };

  if (scene.forceUnpaidBill && customer.id === DEMO_CUSTOMER_ID) {
    clone.bill = {
      dueAmountBdt: Math.max(customer.bill.dueAmountBdt, 1260),
      dueDate: customer.bill.dueDate,
      status: "unpaid",
    };
  }

  if (scene.gulshanOutage && customer.area.toLowerCase() === "gulshan") {
    clone.onuStatus = "los_red";
  }

  return clone;
}

function customerCard(customer: Customer) {
  const plan = getPackage(customer.packageId);
  return {
    id: customer.id,
    cid: customer.cid,
    name: customer.name,
    phone: customer.phone,
    area: customer.area,
    package: formatPackageLine(plan),
    packageId: customer.packageId,
    onuStatus: customer.onuStatus,
    bill: customer.bill,
  };
}

function resolveCustomer(ref: string): Customer | undefined {
  if (!ref) return undefined;
  return byId(ref) || findCustomer(ref);
}

function onuSpeak(status: Customer["onuStatus"]): string {
  if (status === "los_red") return "ONU-তে লাল লাইট";
  if (status === "power_off") return "ONU পাওয়ার অফ";
  if (status === "online") return "ONU অনলাইন";
  return "ONU স্ট্যাটাস অজানা";
}

export function lookupCustomer(cidOrPhone: string): ToolResult {
  const found = findCustomer(cidOrPhone);
  if (!found) {
    return {
      ok: false,
      data: {
        found: false,
        speakAs:
          "এই CID বা মোবাইল নাম্বারে কাস্টমার পাইনি স্যার। একবার আবার বলবেন?",
        message:
          "No customer found for that CID or mobile. Ask them to reconfirm.",
      },
    };
  }
  const customer = applySceneToCustomer(found);
  const card = customerCard(customer);
  return {
    ok: true,
    data: {
      found: true,
      customer: card,
      speakAs: `দেখলাম স্যার, ${customer.name}, CID ${customer.cid}, ${customer.area}, ${onuSpeak(customer.onuStatus)}।`,
    },
    events: [{ type: "customer", payload: card }],
  };
}

export function getBill(
  customerIdOrCid: string,
  method?: string,
): ToolResult {
  const resolved = resolveCustomer(customerIdOrCid);
  if (!resolved) {
    return {
      ok: false,
      data: {
        found: false,
        speakAs: "আগে CID বা রেজিস্টার্ড মোবাইলটা একটু নিশ্চিত করবেন স্যার?",
        message: "Customer not found. Lookup CID or phone first.",
      },
    };
  }

  const customer = applySceneToCustomer(resolved);
  const plan = getPackage(customer.packageId);
  const speakAs =
    customer.bill.status === "paid"
      ? `বিল ক্লিয়ার স্যার। পরের due ${customer.bill.dueDate}।`
      : `দেখলাম স্যার, বকেয়া ৳${customer.bill.dueAmountBdt}, due ${customer.bill.dueDate}। bKash, Nagad, Rocket Pay Bill বা myswift দিয়ে Customer ID দিয়ে পেমেন্ট করতে পারেন।`;

  const data: Record<string, unknown> = {
    cid: customer.cid,
    name: customer.name,
    dueAmountBdt: customer.bill.dueAmountBdt,
    dueDate: customer.bill.dueDate,
    status: customer.bill.status,
    package: formatPackageLine(plan),
    speakAs,
    payVia: ["bKash", "Nagad", "Rocket", "myswift"],
  };

  const m = (method || "").toLowerCase();
  if (m === "bkash") data.steps = PAYMENT_SCRIPTS.bkash;
  else if (m === "nagad") data.steps = PAYMENT_SCRIPTS.nagad;
  else if (m === "rocket") data.steps = PAYMENT_SCRIPTS.rocket;

  return {
    ok: true,
    data,
    events: [{ type: "customer", payload: customerCard(customer) }],
  };
}

export function checkAreaOutageTool(area: string): ToolResult {
  const info = checkAreaOutage(area);
  const etaBn =
    info.eta && /45/.test(info.eta) ? "প্রায় ৪৫ মিনিট" : info.eta;
  const speakAs = info.active
    ? `জি স্যার, ${info.area}-এ ${info.type || "outage"} আছে${etaBn ? `, ETA ${etaBn}` : ""}। আমরা কাজ করছি।`
    : `${info.area}-এ এখন কোনো outage নেই স্যার।`;
  return {
    ok: true,
    data: { ...info, speakAs },
  };
}

export function createTicketTool(args: {
  customerId?: string;
  cid?: string;
  kind?: string;
  summary: string;
  area?: string;
}): ToolResult {
  const customer =
    (args.customerId && byId(args.customerId)) ||
    (args.cid ? findCustomer(args.cid) : undefined);

  const cid = customer?.cid || args.cid || "UNKNOWN";
  const customerId = customer?.id || args.customerId || "unknown";
  const kind = (args.kind as TicketKind) || "other";

  const ticket = createTicketRecord({
    customerId,
    cid,
    kind,
    summary: args.summary,
    area: args.area || customer?.area,
  });

  const spokenId = ticket.id.replace("TKT-", "");
  return {
    ok: true,
    data: {
      ticketId: ticket.id,
      spokenId,
      summary: ticket.summary,
      speakAs: `টিকেট খুলেছি স্যার, আইডি ${spokenId}। এই নাম্বারটা রাখুন।`,
      message: `Ticket ${ticket.id} created. Read this id back to the caller.`,
    },
    events: [{ type: "ticket", payload: ticket }],
  };
}

export function listPackagesTool(desiredMbps?: number): ToolResult {
  let recommendation: string | undefined;
  let speakAs =
    "হোম প্যাকেজ ২০ থেকে ২৫০ Mbps। দামের সাথে ৫% VAT। ৩০ Mbps+ এ ফ্রি ইনস্টলেশন।";
  if (desiredMbps && desiredMbps > 0) {
    const match =
      PACKAGES.find((p) => p.speedMbps >= desiredMbps) ||
      PACKAGES[PACKAGES.length - 1];
    const total = withVat(match.monthlyBdt);
    recommendation = `${match.name} ${match.speedMbps} Mbps at ৳${match.monthlyBdt}/mo (+5% VAT = ৳${total}).`;
    speakAs = `স্যার, ${match.speedMbps} Mbps প্যাকেজ ৳${match.monthlyBdt} প্রতি মাস, VAT সহ ৳${total}।`;
  }
  return {
    ok: true,
    data: {
      packages: PACKAGES.map((p) => ({
        name: p.name,
        speedMbps: p.speedMbps,
        monthlyBdt: p.monthlyBdt,
        withVat: withVat(p.monthlyBdt),
        otcBdt: p.otcBdt,
      })),
      recommendation,
      speakAs,
      note: "Prices +5% VAT. 30 Mbps+ Free Installation (current). 20 Mbps OTC ৳1000 unless own GPON/XPON ONU. Real IP only on 250 Mbps.",
    },
  };
}

export function escalateToHumanTool(args: {
  reason: string;
  customerId?: string;
  cid?: string;
}): ToolResult {
  const handoff = escalateRecord({
    reason: args.reason,
    customerId: args.customerId,
    cid: args.cid,
  });
  return {
    ok: true,
    data: {
      parked: true,
      speakAs:
        "ঠিক আছে স্যার, আপনাকে একজন সহকর্মীর কাছে ট্রান্সফার করছি। একটু অপেক্ষা করবেন।",
      message:
        "Call parked for human agent. Tell the caller someone will take over shortly. Do not continue troubleshooting.",
      handoff,
    },
    events: [{ type: "handoff", payload: handoff }],
  };
}

export async function searchKnowledgeTool(args: {
  query: string;
}): Promise<ToolResult> {
  const query = String(args.query ?? "").trim();
  if (!query) {
    return { ok: false, data: { error: "query required" } };
  }
  const hits = await searchKnowledge(query, {
    topK: 3,
    apiKey: process.env.GEMINI_API_KEY,
  });
  if (hits.length === 0) {
    return {
      ok: true,
      data: {
        hits: [],
        speakAs:
          "এটা এখন হাতে নিশ্চিত করতে পারছি না স্যার — একজন সিনিয়রকে জিজ্ঞাসা করছি।",
        note: "No KB hit. Say you will check with a senior / escalate if needed. Do not invent Amber IT policy.",
      },
    };
  }
  return {
    ok: true,
    data: {
      hits: hits.map((h) => ({
        title: h.title,
        category: h.category,
        text: h.text,
        score: h.score,
      })),
      speakAs: hits[0]?.text.slice(0, 280),
      speakFrom: "Use only these retrieved facts. Paraphrase briefly for the caller.",
    },
  };
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case "lookupCustomer":
      return lookupCustomer(
        String(args.cidOrPhone ?? args.cid ?? args.phone ?? ""),
      );
    case "getBill":
      return getBill(
        String(args.customerId ?? args.cid ?? args.cidOrPhone ?? ""),
        args.method ? String(args.method) : undefined,
      );
    case "checkAreaOutage":
      return checkAreaOutageTool(String(args.area ?? ""));
    case "createTicket":
      return createTicketTool({
        customerId: args.customerId ? String(args.customerId) : undefined,
        cid: args.cid ? String(args.cid) : undefined,
        kind: args.kind ? String(args.kind) : undefined,
        summary: String(args.summary ?? "Support request"),
        area: args.area ? String(args.area) : undefined,
      });
    case "listPackages":
      return listPackagesTool(
        args.desiredMbps != null ? Number(args.desiredMbps) : undefined,
      );
    case "searchKnowledge":
      return searchKnowledgeTool({
        query: String(args.query ?? ""),
      });
    case "escalateToHuman":
      return escalateToHumanTool({
        reason: String(args.reason ?? "Caller requested a human agent"),
        customerId: args.customerId ? String(args.customerId) : undefined,
        cid: args.cid ? String(args.cid) : undefined,
      });
    default:
      return {
        ok: false,
        data: { error: `Unknown tool: ${name}` },
      };
  }
}

export function getPackageById(id: PackageId) {
  return getPackage(id);
}

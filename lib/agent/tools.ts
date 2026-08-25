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
import { PAYMENT_SCRIPTS, TROUBLESHOOTING } from "@/lib/kb/troubleshooting";
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

export function lookupCustomer(cidOrPhone: string): ToolResult {
  const found = findCustomer(cidOrPhone);
  if (!found) {
    return {
      ok: false,
      data: {
        found: false,
        message:
          "No customer found for that CID or mobile. Ask them to reconfirm.",
      },
    };
  }
  const customer = applySceneToCustomer(found);
  const card = customerCard(customer);
  return {
    ok: true,
    data: { found: true, customer: card },
    events: [{ type: "customer", payload: card }],
  };
}

export function getBill(customerIdOrCid: string): ToolResult {
  const resolved = resolveCustomer(customerIdOrCid);
  if (!resolved) {
    return {
      ok: false,
      data: {
        found: false,
        message: "Customer not found. Lookup CID or phone first.",
      },
    };
  }

  const customer = applySceneToCustomer(resolved);
  const plan = getPackage(customer.packageId);

  return {
    ok: true,
    data: {
      cid: customer.cid,
      name: customer.name,
      dueAmountBdt: customer.bill.dueAmountBdt,
      dueDate: customer.bill.dueDate,
      status: customer.bill.status,
      package: formatPackageLine(plan),
      payVia: [
        "bKash Pay Bill → Amber IT",
        "Nagad Pay Bill → Amber IT",
        "Rocket Pay Bill → Amber IT",
        "myswift app / myswift.amberit.com.bd",
      ],
      bkashSteps: PAYMENT_SCRIPTS.bkash,
      nagadSteps: PAYMENT_SCRIPTS.nagad,
      rocketSteps: PAYMENT_SCRIPTS.rocket,
      paymentNote: PAYMENT_SCRIPTS.note,
      script:
        customer.bill.status === "paid"
          ? `Bill clear. Next due around ${customer.bill.dueDate}.`
          : `Due ৳${customer.bill.dueAmountBdt}, due ${customer.bill.dueDate}. Guide bKash/Nagad/Rocket Pay Bill (Amber IT) with Customer ID, or myswift.`,
    },
    events: [{ type: "customer", payload: customerCard(customer) }],
  };
}

export function checkAreaOutageTool(area: string): ToolResult {
  const info = checkAreaOutage(area);
  return {
    ok: true,
    data: { ...info },
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

  return {
    ok: true,
    data: {
      ticketId: ticket.id,
      spokenId: ticket.id.replace("TKT-", "ticket "),
      summary: ticket.summary,
      message: `Ticket ${ticket.id} created. Read this id back to the caller.`,
      onuTips: TROUBLESHOOTING.noInternet.steps.slice(0, 2),
    },
    events: [{ type: "ticket", payload: ticket }],
  };
}

export function listPackagesTool(desiredMbps?: number): ToolResult {
  let recommendation: string | undefined;
  if (desiredMbps && desiredMbps > 0) {
    const match =
      PACKAGES.find((p) => p.speedMbps >= desiredMbps) ||
      PACKAGES[PACKAGES.length - 1];
    const total = withVat(match.monthlyBdt);
    recommendation = `${match.name} ${match.speedMbps} Mbps at ৳${match.monthlyBdt}/mo (+5% VAT = ৳${total}).`;
  }
  return {
    ok: true,
    data: {
      packages: PACKAGES.map((p) => ({
        id: p.id,
        name: p.name,
        speedMbps: p.speedMbps,
        monthlyBdt: p.monthlyBdt,
        withVat: withVat(p.monthlyBdt),
        otcBdt: p.otcBdt,
        notes: p.notes,
        line: formatPackageLine(p),
      })),
      lines: PACKAGES.map(formatPackageLine),
      recommendation,
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

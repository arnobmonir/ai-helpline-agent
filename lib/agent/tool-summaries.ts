/** Presenter-facing one-liners for the ops tool panel. */

export function summarizeToolCall(
  name: string,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
): string {
  switch (name) {
    case "lookupCustomer": {
      const customer = result.customer as
        | {
            cid?: string;
            name?: string;
            area?: string;
            onuStatus?: string;
          }
        | undefined;
      if (!result.found || !customer) {
        return "No customer found — ask them to reconfirm";
      }
      const onu = (customer.onuStatus || "unknown").replace(/_/g, " ");
      return `Looked up ${customer.cid} — ${customer.name}, ${customer.area}, ${onu}`;
    }
    case "getBill": {
      const status = String(result.status || "");
      const amount = result.dueAmountBdt;
      if (status === "paid") return "Bill clear";
      if (amount != null) return `Due ৳${amount} (${status || "unpaid"})`;
      return "Bill lookup";
    }
    case "checkAreaOutage": {
      if (result.active) {
        const eta = result.eta ? ` · ETA ${result.eta}` : "";
        return `${result.area || "Area"} outage (${result.type || "down"})${eta}`;
      }
      return `No outage in ${result.area || "that area"}`;
    }
    case "createTicket": {
      return `Ticket ${result.ticketId || "created"}`;
    }
    case "listPackages": {
      const mbps = args.desiredMbps;
      if (typeof mbps === "number") return `Packages — recommended ${mbps} Mbps`;
      return "Listed home packages";
    }
    case "searchKnowledge": {
      const hits = result.hits as Array<{ title?: string }> | undefined;
      const title = hits?.[0]?.title;
      return title ? `KB: ${title}` : "KB search — no hit";
    }
    case "escalateToHuman": {
      return `Handoff — ${result.speakAs ? "parked for human" : String(args.reason || "caller asked")}`;
    }
    default:
      return name;
  }
}

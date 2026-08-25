export type TicketKind =
  | "no_internet"
  | "billing"
  | "package_change"
  | "other";

export interface Ticket {
  id: string;
  customerId: string;
  cid: string;
  kind: TicketKind;
  summary: string;
  area?: string;
  createdAt: string;
  status: "open" | "parked" | "closed";
}

export interface HandoffCard {
  active: boolean;
  reason: string;
  customerId?: string;
  cid?: string;
  createdAt: string;
}

const tickets: Ticket[] = [];
let ticketSeq = 24001;
let handoff: HandoffCard | null = null;

export function listTickets(): Ticket[] {
  return [...tickets].reverse();
}

export function createTicket(input: {
  customerId: string;
  cid: string;
  kind: TicketKind;
  summary: string;
  area?: string;
}): Ticket {
  const ticket: Ticket = {
    id: `TKT-${ticketSeq++}`,
    customerId: input.customerId,
    cid: input.cid,
    kind: input.kind,
    summary: input.summary,
    area: input.area,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  tickets.push(ticket);
  return ticket;
}

export function getHandoff(): HandoffCard | null {
  return handoff ? { ...handoff } : null;
}

export function escalateToHuman(input: {
  reason: string;
  customerId?: string;
  cid?: string;
}): HandoffCard {
  handoff = {
    active: true,
    reason: input.reason,
    customerId: input.customerId,
    cid: input.cid,
    createdAt: new Date().toISOString(),
  };
  return { ...handoff };
}

export function clearHandoff(): void {
  handoff = null;
}

export function resetTickets(): void {
  tickets.length = 0;
  ticketSeq = 24001;
  handoff = null;
}

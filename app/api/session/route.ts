import { NextResponse } from "next/server";
import { CUSTOMERS } from "@/lib/mock/customers";
import { getScene } from "@/lib/mock/scene";
import { listTickets, getHandoff } from "@/lib/mock/tickets";
import { PACKAGES, formatPackageLine } from "@/lib/kb/packages";
import { lookupCustomer } from "@/lib/agent/tools";

/** Lightweight REST peek at mock world (ops can also use the live WS). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get("cid");

  if (cid) {
    return NextResponse.json(lookupCustomer(cid));
  }

  return NextResponse.json({
    scene: getScene(),
    customers: CUSTOMERS.map((c) => ({
      cid: c.cid,
      name: c.name,
      area: c.area,
      phone: c.phone,
    })),
    packages: PACKAGES.map(formatPackageLine),
    tickets: listTickets(),
    handoff: getHandoff(),
  });
}

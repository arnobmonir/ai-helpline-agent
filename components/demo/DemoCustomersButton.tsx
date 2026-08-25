"use client";

import { useEffect, useRef, useState } from "react";
import { CUSTOMERS, DEMO_CUSTOMER_ID } from "@/lib/mock/customers";
import { getPackage } from "@/lib/kb/packages";

export function DemoCustomersButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Show demo customers"
        className="rounded-full border border-amber-border bg-white px-3 py-1.5 text-xs font-medium text-amber-ink shadow-sm transition hover:border-amber-red hover:text-amber-red"
      >
        Demo CIDs
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-amber-border bg-white shadow-lg">
          <div className="border-b border-amber-border px-4 py-3">
            <p className="text-sm font-semibold text-amber-ink">Dummy customers</p>
            <p className="mt-0.5 text-xs text-amber-muted">
              Say a CID or phone on the call — pitch star is Gulshan.
            </p>
          </div>
          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
            {CUSTOMERS.map((c) => {
              const plan = getPackage(c.packageId);
              const starred = c.id === DEMO_CUSTOMER_ID;
              return (
                <li
                  key={c.id}
                  className={`rounded-xl px-3 py-2.5 ${
                    starred ? "bg-amber-cream" : "hover:bg-amber-cream/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-amber-ink">
                        {c.name}
                        {starred && (
                          <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-red">
                            pitch
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-amber-red">
                        {c.cid} · {c.phone}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-muted ring-1 ring-amber-border">
                      {c.area}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-amber-muted">
                    {plan.speedMbps} Mbps · bill {c.bill.status}
                    {c.bill.dueAmountBdt > 0 ? ` ৳${c.bill.dueAmountBdt}` : ""} · ONU{" "}
                    {c.onuStatus.replace("_", " ")}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLiveSession } from "@/lib/voice/use-live-session";
import { summarizeToolCall } from "@/lib/agent/tool-summaries";

type CustomerCard = {
  cid?: string;
  name?: string;
  phone?: string;
  area?: string;
  package?: string;
  onuStatus?: string;
  bill?: { dueAmountBdt?: number; dueDate?: string; status?: string };
};

type Ticket = {
  id?: string;
  cid?: string;
  kind?: string;
  summary?: string;
  area?: string;
  status?: string;
  createdAt?: string;
};

type Handoff = {
  active?: boolean;
  reason?: string;
  cid?: string;
  createdAt?: string;
};

export function OpsDashboard() {
  const { state, send } = useLiveSession("ops");

  const customer = state.customer as CustomerCard | null;
  const handoff = state.handoff as Handoff | null;
  const tickets = state.tickets as Ticket[];
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.transcript]);

  const idle =
    state.status === "idle" &&
    state.transcript.length === 0 &&
    state.toolCalls.length === 0;

  const beats = [
    {
      id: "outage",
      label: "Outage / ticket",
      done: state.toolCalls.some(
        (t) => t.name === "checkAreaOutage" || t.name === "createTicket",
      ),
    },
    {
      id: "bill",
      label: "Bill + payment",
      done: state.toolCalls.some((t) => t.name === "getBill"),
    },
    {
      id: "upgrade",
      label: "Upgrade 200 Mbps",
      done: state.toolCalls.some((t) => t.name === "listPackages"),
    },
    {
      id: "barge",
      label: "Barge-in",
      done: state.bargeIn,
    },
    {
      id: "human",
      label: "Human handoff",
      done: Boolean(handoff?.active),
    },
  ];

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 lg:grid-cols-12">
      <section className="space-y-4 lg:col-span-3">
        <Panel title="Call status">
          <StatusPill status={state.status} connected={state.connected} />
          {state.error && (
            <p className="mt-2 text-xs text-amber-red">{state.error}</p>
          )}
          {!state.hasApiKey && state.connected && (
            <p className="mt-2 text-xs text-amber-muted">
              GEMINI_API_KEY missing in .env.local
            </p>
          )}
          {idle && (
            <p className="mt-3 text-sm text-amber-muted">
              Open the softphone in another tab and press Call.
            </p>
          )}
        </Panel>

        <Panel title="Pitch checklist">
          <ol className="space-y-2">
            {beats.map((beat, i) => (
              <li
                key={beat.id}
                className="flex items-center gap-2 text-sm text-amber-ink"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    beat.done
                      ? "bg-emerald-500 text-white"
                      : "bg-amber-cream text-amber-muted"
                  }`}
                >
                  {beat.done ? "✓" : i + 1}
                </span>
                <span className={beat.done ? "text-amber-muted line-through" : ""}>
                  {beat.label}
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Presenter toggles">
          <Toggle
            label="Gulshan outage"
            checked={state.scene.gulshanOutage}
            onChange={(gulshanOutage) =>
              send({ type: "set_scene", gulshanOutage })
            }
          />
          <Toggle
            label="Force unpaid bill (demo CID)"
            checked={state.scene.forceUnpaidBill}
            onChange={(forceUnpaidBill) =>
              send({ type: "set_scene", forceUnpaidBill })
            }
          />
          <Toggle
            label="ANI known (skip CID ask)"
            checked={state.scene.aniKnown}
            onChange={(aniKnown) => send({ type: "set_scene", aniKnown })}
          />
          <button
            type="button"
            onClick={() => send({ type: "reset_demo" })}
            className="mt-3 w-full rounded-lg border border-amber-border px-3 py-2 text-xs font-medium text-amber-ink hover:bg-amber-cream"
          >
            Reset demo state
          </button>
        </Panel>

        <Panel title="Customer">
          {customer ? (
            <dl className="space-y-2 text-sm">
              <Row label="Name" value={customer.name} />
              <Row label="CID" value={customer.cid} />
              <Row label="Phone" value={customer.phone} />
              <Row label="Area" value={customer.area} />
              <Row label="Package" value={customer.package} />
              <Row label="ONU" value={customer.onuStatus} />
              <Row
                label="Bill"
                value={
                  customer.bill
                    ? `৳${customer.bill.dueAmountBdt} · ${customer.bill.status} · due ${customer.bill.dueDate}`
                    : "—"
                }
              />
            </dl>
          ) : (
            <p className="text-sm text-amber-muted">
              Waiting for lookupCustomer…
            </p>
          )}
        </Panel>
      </section>

      <section className="space-y-4 lg:col-span-5">
        <Panel title="Live transcript" className="min-h-[28rem]">
          <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1">
            {state.transcript.length === 0 && (
              <p className="text-sm text-amber-muted">
                {idle
                  ? "Open the softphone in another tab and press Call."
                  : "Transcript appears when the call is connected (keep this window open)."}
              </p>
            )}
            {state.transcript.map((line) => (
              <div
                key={line.id}
                className={`rounded-xl px-3 py-2 text-sm ${
                  line.role === "nusrat"
                    ? "bg-rose-50 text-amber-ink"
                    : line.role === "user"
                      ? "bg-slate-100 text-amber-ink"
                      : "bg-amber-cream text-amber-muted"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-muted">
                  {line.role === "nusrat"
                    ? "Nusrat"
                    : line.role === "user"
                      ? "Caller"
                      : "System"}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">{line.text}</p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </Panel>
      </section>

      <section className="space-y-4 lg:col-span-4">
        {handoff?.active && (
          <div className="rounded-2xl border-2 border-amber-red bg-rose-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-red">
              Human handoff
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-ink">
              Call parked — agent queue (Phase 2: SIP transfer)
            </p>
            <p className="mt-2 text-sm text-amber-muted">{handoff.reason}</p>
            {handoff.cid && (
              <p className="mt-1 text-xs text-amber-muted">CID {handoff.cid}</p>
            )}
          </div>
        )}

        <Panel title="Tool calls">
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {state.toolCalls.length === 0 && (
              <p className="text-sm text-amber-muted">No tools yet.</p>
            )}
            {[...state.toolCalls].reverse().map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-amber-border bg-amber-cream/50 p-2 text-xs"
              >
                <p className="font-semibold text-amber-red">{t.name}</p>
                <p className="mt-1 text-sm text-amber-ink">
                  {summarizeToolCall(t.name, t.args, t.result)}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Tickets">
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
            {tickets.length === 0 && (
              <p className="text-sm text-amber-muted">No tickets yet.</p>
            )}
            {tickets.map((t, i) => (
              <div
                key={t.id || i}
                className="rounded-lg border border-amber-border p-2 text-sm"
              >
                <p className="font-semibold text-amber-ink">{t.id}</p>
                <p className="text-xs text-amber-muted">
                  {t.kind} · {t.cid} · {t.area}
                </p>
                <p className="mt-1 text-xs">{t.summary}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-amber-border bg-white p-4 shadow-sm ${className}`}
    >
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-amber-red">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-amber-muted">{label}</dt>
      <dd className="text-right font-medium text-amber-ink">{value || "—"}</dd>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="mb-2 flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span className="text-amber-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-amber-red" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

function StatusPill({
  status,
  connected,
}: {
  status: string;
  connected: boolean;
}) {
  const color =
    status === "connected"
      ? "bg-emerald-100 text-emerald-800"
      : status === "parked"
        ? "bg-amber-100 text-amber-900"
        : status === "ringing" || status === "connecting"
          ? "bg-sky-100 text-sky-800"
          : status === "error"
            ? "bg-rose-100 text-rose-800"
            : "bg-slate-100 text-slate-700";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
        {status}
      </span>
      <span className="text-xs text-amber-muted">
        WS {connected ? "online" : "offline"}
      </span>
    </div>
  );
}

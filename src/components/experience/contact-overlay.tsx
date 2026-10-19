"use client";

import { RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";

const fieldStyle: React.CSSProperties = {
  width: "min(232px, 100%)",
  maxWidth: "100%",
  height: 29,
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: "-0.04em",
  lineHeight: "13px",
  padding: "8px",
  textAlign: "center",
  border: 0,
  borderRadius: 0,
  outline: "none",
  appearance: "none",
  fontFeatureSettings: '"ss01" 1',
  transition: "background-color .18s ease, color .18s ease",
  background: "transparent",
  color: "#000",
};

/**
 * Contact overlay: a compact centred column of 232px-wide, 29px-high fields
 * (reason dropdown, name, email, message) and an ink submit — the same
 * contained geometry as the reference contact surface.
 */
export function ContactOverlay({
  reasons,
  email,
  onClose,
}: {
  reasons: string[];
  email: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(reasons[0] ?? "General");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reference, setReference] = useState<number | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, name: name.trim(), email: addr.trim(), message: message.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: number };
      if (res.ok && data.ok) {
        setReference(data.id ?? null);
        setState("sent");
      } else {
        setState("error");
        setTimeout(() => setState("idle"), 1900);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1900);
    }
  }

  return (
    <div className="fixed inset-0 z-[46] flex items-center justify-center overflow-y-auto overscroll-contain px-[16px] py-[80px]" style={{ background: "var(--site-bg)" }}>
      {/* Click-away capture */}
      <button aria-label="Close contact" className="absolute inset-0 cursor-default" onClick={onClose} tabIndex={-1} />

      <div className="relative flex w-full max-w-[280px] flex-col items-center fade-up">
        {state === "sent" ? (
          <div className="flex flex-col items-center text-center">
            <p className="t-display m-0">Received.</p>
            <p className="t-body16 m-0 mt-[14px]" style={{ maxWidth: 300, opacity: 0.66 }}>
              Your message is in the inbox — a partner answers every note within two working
              days.
            </p>
            <p className="t-caption m-0 mt-[18px]" style={{ color: "var(--muted)" }}>
              Ref {reference ? String(reference).padStart(4, "0") : "—"} / {reason}
            </p>
            <button
              onClick={() => {
                setState("idle");
                setName("");
                setAddr("");
                setMessage("");
                setReference(null);
              }}
              className="t-caption mt-[24px] inline-flex items-center gap-[6px] underline underline-offset-4"
              data-cursor
            >
              <RotateCcw size={11} strokeWidth={2} /> Write another
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col items-center gap-[8px]" noValidate>
            <p className="t-display m-0 mb-[22px]">Contact</p>

            {/* Reason dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                style={fieldStyle}
                className="relative flex items-center justify-center hover:bg-[#1414140d]"
                aria-expanded={dropdownOpen}
                data-cursor
              >
                {reason}
                <span
                  aria-hidden
                  className="absolute"
                  style={{
                    right: 17,
                    top: 10,
                    width: 6,
                    height: 6,
                    borderBottom: "2px solid currentColor",
                    borderRight: "2px solid currentColor",
                    transform: dropdownOpen ? "rotate(225deg) translate(-2px,-2px)" : "rotate(45deg)",
                    transition: "transform .26s cubic-bezier(.65,0,.35,1)",
                  }}
                />
              </button>
              <div
                className="absolute left-0 z-[5] overflow-hidden bg-white"
                style={{
                  top: 29,
                  width: "min(232px, 100%)",
                  maxHeight: dropdownOpen ? reasons.length * 29 : 0,
                  transition: "max-height .32s cubic-bezier(.65,0,.35,1)",
                  boxShadow: dropdownOpen ? "var(--shadow)" : "none",
                }}
              >
                {reasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setReason(r);
                      setDropdownOpen(false);
                    }}
                    style={{ ...fieldStyle, opacity: r === reason ? 1 : 0.55 }}
                    className="block hover:bg-[#1414140d]"
                    data-cursor
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              style={fieldStyle}
              className="placeholder:text-[#00000042] hover:bg-[#1414140d] focus:bg-[#1414140d]"
              autoComplete="name"
            />
            <input
              type="email"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="Email"
              style={fieldStyle}
              className="placeholder:text-[#00000042] hover:bg-[#1414140d] focus:bg-[#1414140d]"
              autoComplete="email"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message"
              rows={4}
              style={{ ...fieldStyle, height: 116, resize: "none", lineHeight: "22px" }}
              className="placeholder:text-[#00000042] hover:bg-[#1414140d] focus:bg-[#1414140d]"
            />

            <button
              type="submit"
              disabled={state === "sending"}
              style={{
                ...fieldStyle,
                background: state === "error" ? "#c7161d" : "#141414",
                color: "#fff",
              }}
              data-cursor
            >
              {state === "sending" ? "Sending…" : state === "error" ? "Check the fields" : "Send"}
            </button>

            <a
              href={`mailto:${email}`}
              className="t-small mt-[18px] underline-offset-2 hover:underline"
              style={{ color: "#2e2e2e", opacity: 0.7 }}
              data-cursor
            >
              {email}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="t-display mt-[10px] uppercase"
              style={{ opacity: 0.6 }}
              data-cursor="close"
            >
              Close
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

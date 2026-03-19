"use client";
/**
 * GoalChatPanel — AI-powered goal generation chat UI
 *
 * Adapted from goal-chat-v9 JSX prototype.
 * Swaps fake refinement engine for live ADK agent calls via /api/goals/chat.
 *
 * Components: FormView, ChatView, GoalCard, ContextCard, SuggestionArea,
 *             EditDrawer, MetricPill, BotRow, TxtInput, Toast, etc.
 */

import React, { useState, useRef, useEffect } from "react";

// ── Types ──
interface Metric {
  name: string;
  type: string;
  target: string;
  start: string;
  targetType: string;
}
interface KeyResult {
  name: string;
  metric: Metric;
}
interface ChildGoal {
  name: string;
  metric: Metric | null;
  keyResults: KeyResult[];
}
interface Goal {
  id: string;
  name: string;
  description: string;
  tags: string[];
  alignedTo: string;
  metricType: string;
  metric: Metric | null;
  keyResults: KeyResult[];
  childGoals: ChildGoal[];
}
interface ChatMsg {
  from: string;
  content?: string;
  text?: string;
  data?: Goal[];
  stale?: boolean;
  isInitial?: boolean;
  locked?: boolean;
  savedSel?: string[];
  savedCust?: Array<{ id: string; label: string }>;
}

// ── Constants (hardcoded for PoC) ──
var HRMS = {
  person: { name: "Priya Sharma", role: "Product Manager", title: "Senior Product Manager", department: "Product", discipline: "Product Management", businessUnit: "Growth" },
  manager: { name: "Arjun Mehta", title: "VP Product", department: "Product" },
  timePeriod: { name: "Q4 2026", range: "Oct - Dec 2026" },
};

var SUGGESTED_AREAS = [
  { id: "s1", label: "Redesign onboarding for mid-market accounts", fromGoal: "Arjun - Speed up customer onboarding" },
  { id: "s2", label: "Build self-serve activation funnels", fromGoal: "Arjun - Improve self-serve activation" },
  { id: "s3", label: "Drive adoption of Reviews and Goals modules", fromGoal: "Arjun - Drive feature adoption to 60%" },
  { id: "s4", label: "Fix top user friction points to improve NPS", fromGoal: "Arjun - Improve NPS and reduce friction" },
  { id: "s5", label: "Launch experiment framework for faster learning", fromGoal: "Role - Senior PM, Growth" },
  { id: "s6", label: "Improve trial-to-paid conversion rate", fromGoal: "Role - Senior PM, Growth" },
];

var F = "'DM Sans', sans-serif";
var MC: Record<string, string> = { NUMERIC: "#3B82F6", PERCENTAGE: "#8B5CF6", CURRENCY: "#10B981", YES_NO: "#F59E0B" };

// ── Utility ──
function deepClone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)); }

// ── API Helper ──
async function sendToAgent(message: string, sessionId: string): Promise<{ text: string; goals: Goal[] | null; session_id?: string }> {
  try {
    const res = await fetch("/api/goals/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { text: data.text || data.error || "Something went wrong.", goals: null };
    }
    return { text: data.text || "", goals: data.goals || null, session_id: data.session_id };
  } catch (e) {
    return { text: "Could not reach the AI agent. Make sure `adk web` is running.", goals: null };
  }
}

/* ═══════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════ */

function MetricPill({ m, glow }: { m: Metric | null; glow?: boolean }) {
  if (!m) return null;
  var c = MC[m.type] || "#888";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 6,
      background: glow ? "#FFFBEB" : (c + "0D"), border: "1px solid " + (glow ? "#FCD34D" : (c + "22")),
      fontSize: 11, fontFamily: F, transition: "all .5s ease",
    }}>
      <span style={{ fontWeight: 700, fontFamily: "monospace", color: c, fontSize: 9.5 }}>{m.type}</span>
      <span style={{ fontWeight: 600, color: "#2D2545" }}>
        {m.start ? <span style={{ color: "#A8A3C0", fontWeight: 500 }}>{m.start}{" \u2192 "}</span> : null}
        {m.target}
      </span>
    </span>
  );
}

function BoldText({ text }: { text: string }) {
  var parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <div style={{ fontSize: 13, color: "#3D3654", lineHeight: 1.55, fontWeight: 500, fontFamily: F }}>
      {parts.map(function (part, i) {
        return i % 2 === 1
          ? <strong key={i} style={{ color: "#2D2545", fontWeight: 700 }}>{part}</strong>
          : <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function BotAv() {
  return (
    <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#6B5CE7,#9B8FE8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

function BotRow({ children, anim }: { children: React.ReactNode; anim?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", animation: anim ? "fadeIn .3s ease" : "none" }}>
      <BotAv /><div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Dots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
      {[0, 1, 2].map(function (i) { return <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#8B7EC8", animation: "bounce 1.2s ease-in-out " + (i * 0.15) + "s infinite" }} />; })}
    </div>
  );
}

function UserMsg({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ padding: "8px 14px", borderRadius: "14px 14px 4px 14px", background: "#6B5CE7", color: "#FFF", fontSize: 13, fontFamily: F, fontWeight: 500, maxWidth: "80%", lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}

function Toast({ msg, show }: { msg: string; show: boolean }) {
  return (
    <div style={{
      position: "absolute", bottom: 20, left: "50%",
      transform: "translateX(-50%) translateY(" + (show ? "0" : "20px") + ")",
      padding: "10px 20px", borderRadius: 10, background: "#065F46", color: "#FFF",
      fontSize: 12.5, fontWeight: 600, fontFamily: F, boxShadow: "0 4px 16px rgba(0,0,0,.15)",
      zIndex: 100, opacity: show ? 1 : 0, transition: "all .3s ease",
      display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", pointerEvents: "none",
    }}>
      {"\u2713 " + msg}
    </div>
  );
}

/* ── Context card ── */

function ContextCard({ onYes, onNo, decided }: { onYes: () => void; onNo: () => void; decided: string | null }) {
  var p = HRMS.person, m = HRMS.manager;
  var pRows = [["Title", p.title], ["Role", p.role], ["Department", p.department], ["Discipline", p.discipline], ["Business Unit", p.businessUnit]];
  var mRows = [["Name", m.name], ["Title", m.title], ["Department", m.department]];
  var ok = decided === "yes", no = decided === "no";
  var bdr = ok ? "#D1FAE5" : no ? "#FED7D7" : "#E8E5F0";
  var bg = ok ? "#F0FDF9" : no ? "#FFF5F5" : "#FFF";
  return (
    <div style={{ borderRadius: 10, border: "1.5px solid " + bdr, background: bg, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid #F0EDFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: ok ? "linear-gradient(135deg,#34D399,#6EE7B7)" : "linear-gradient(135deg,#C4B5FD,#8B7EC8)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{ok ? "\u2713" : no ? "\u2717" : p.name.split(" ").map(function (n) { return n[0]; }).join("")}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2545", fontFamily: F }}>{p.name}</div>
        </div>
        {pRows.map(function (r, i) { return <div key={r[0]} style={{ display: "flex", padding: "6px 0", borderBottom: i < pRows.length - 1 ? "1px solid #F5F3FA" : "none" }}><span style={{ width: 90, fontSize: 11, fontWeight: 600, color: "#8B85A3", fontFamily: F }}>{r[0]}</span><span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "#2D2545", fontFamily: F }}>{r[1]}</span></div>; })}
      </div>
      <div style={{ padding: "8px 14px 6px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#8B85A3", letterSpacing: "0.04em", fontFamily: F, marginBottom: 6 }}>REPORTS TO</div>
        {mRows.map(function (r, i) { return <div key={r[0]} style={{ display: "flex", padding: "5px 0", borderBottom: i < mRows.length - 1 ? "1px solid #F5F3FA" : "none" }}><span style={{ width: 90, fontSize: 11, fontWeight: 600, color: "#8B85A3", fontFamily: F }}>{r[0]}</span><span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "#2D2545", fontFamily: F }}>{r[1]}</span></div>; })}
      </div>
      {!decided && (
        <div style={{ padding: "10px 14px 12px", display: "flex", gap: 8, borderTop: "1px solid #F0EDFF" }}>
          <button onClick={onYes} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#6B5CE7", color: "#FFF", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>{"Looks good \u2192"}</button>
          <button onClick={onNo} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #E2E0EC", background: "#FFF", color: "#6B6485", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: F }}>{"No, this isn't right"}</button>
        </div>
      )}
    </div>
  );
}

/* ── Suggestion area ── */

function SuggestionArea({ onSubmit, locked, savedSel, savedCust }: { onSubmit: (labels: string[], selIds: string[], custs: Array<{ id: string; label: string }>) => void; locked: boolean; savedSel: string[]; savedCust: Array<{ id: string; label: string }> }) {
  var [sel, setSel] = useState<string[]>(savedSel || []);
  var [customs, setCustoms] = useState<Array<{ id: string; label: string }>>(savedCust || []);
  var [txt, setTxt] = useState("");
  var [files, setFiles] = useState<Array<{ name: string; size: number }>>([]);
  var sugFileRef = useRef<HTMLInputElement>(null);
  function toggle(id: string) { if (locked) return; setSel(function (p) { return p.includes(id) ? p.filter(function (x) { return x !== id; }) : p.concat(id); }); }
  function addOwn() { if (!txt.trim() || locked) return; var nid = "c_" + Date.now(); setCustoms(function (p) { return p.concat({ id: nid, label: txt.trim() }); }); setSel(function (p) { return p.concat(nid); }); setTxt(""); }
  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) { var nf = Array.from(e.target.files || []); setFiles(function (p) { return p.concat(nf.map(function (f) { return { name: f.name, size: f.size }; })); }); if (sugFileRef.current) sugFileRef.current.value = ""; }
  function removeFile(idx: number) { setFiles(function (p) { return p.filter(function (_, i) { return i !== idx; }); }); }
  function fmtSize(bytes: number) { if (bytes < 1024) return bytes + " B"; if (bytes < 1048576) return Math.round(bytes / 1024) + " KB"; return (bytes / 1048576).toFixed(1) + " MB"; }
  var iconForExt = function (name: string) { var ext = (name.split(".").pop() || "").toLowerCase(); if (ext === "pdf") return { bg: "#FEE2E2", color: "#DC2626", label: "PDF" }; if (ext === "doc" || ext === "docx") return { bg: "#DBEAFE", color: "#2563EB", label: "DOC" }; if (ext === "ppt" || ext === "pptx") return { bg: "#FEF3C7", color: "#D97706", label: "PPT" }; if (ext === "xls" || ext === "xlsx") return { bg: "#D1FAE5", color: "#059669", label: "XLS" }; return { bg: "#F3F4F6", color: "#6B7280", label: ext.toUpperCase().slice(0, 3) || "FILE" }; };
  var allItems = SUGGESTED_AREAS.map(function (s) { return { id: s.id, label: s.label, from: s.fromGoal, own: false }; }).concat(customs.map(function (c) { return { id: c.id, label: c.label, from: "Your input", own: true }; }));
  var cnt = sel.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {allItems.map(function (item) { var on = sel.includes(item.id); return (
          <button key={item.id} onClick={function () { toggle(item.id); }} style={{ display: "flex", flexDirection: "column", gap: 1, padding: "7px 13px", borderRadius: 10, textAlign: "left" as const, cursor: locked ? "default" : "pointer", border: on ? "1.5px solid #6B5CE7" : "1.5px solid #E8E5F0", background: on ? "#F0EDFF" : "#FFF", color: on ? "#5B4CC4" : locked ? "#A8A3C0" : "#3D3654", opacity: locked && !on ? 0.45 : 1 }}>
            <span style={{ fontSize: 12.5, fontWeight: on ? 600 : 500, lineHeight: 1.3, fontFamily: F }}>{on ? "\u2713 " : ""}{item.label}</span>
            {!item.own && <span style={{ fontSize: 10, fontWeight: 500, color: on ? "#8B7EC8" : "#A8A3C0", fontFamily: F }}>{item.from}</span>}
          </button>
        ); })}
      </div>
      {!locked && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {files.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "6px 6px 4px 12px" }}>
              {files.map(function (f, fi) { var ic = iconForExt(f.name); return (
                <div key={fi} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 6px 4px 8px", borderRadius: 7, background: "#F5F3FA", border: "1px solid #E8E5F0", maxWidth: 200 }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: ic.color, background: ic.bg, padding: "2px 4px", borderRadius: 3, flexShrink: 0, fontFamily: "monospace", lineHeight: 1 }}>{ic.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#3D3654", fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, lineHeight: 1.2 }}>{f.name}</span>
                  <span style={{ fontSize: 9.5, color: "#A8A3C0", fontFamily: F, flexShrink: 0 }}>{fmtSize(f.size)}</span>
                  <button onClick={function () { removeFile(fi); }} style={{ width: 16, height: 16, borderRadius: 4, border: "none", background: "transparent", color: "#A8A3C0", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }} onMouseEnter={function (e) { (e.currentTarget as HTMLElement).style.color = "#DC2626"; }} onMouseLeave={function (e) { (e.currentTarget as HTMLElement).style.color = "#A8A3C0"; }}>{"\u00D7"}</button>
                </div>
              ); })}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, padding: "5px 5px 5px 4px", borderRadius: 10, border: "1.5px solid #E2E0EC", background: "#FFF" }}>
            <button onClick={function () { if (sugFileRef.current) sugFileRef.current.click(); }}
              style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", color: "#A8A3C0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0, transition: "color .15s ease" }}
              onMouseEnter={function (e) { (e.currentTarget as HTMLElement).style.color = "#6B5CE7"; }}
              onMouseLeave={function (e) { (e.currentTarget as HTMLElement).style.color = "#A8A3C0"; }}
              title="Attach file (PDF, DOC, PPT)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
            </button>
            <input type="file" ref={sugFileRef} onChange={handleFiles} multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt" style={{ display: "none" }} />
            <textarea value={txt} onChange={function (e) { setTxt(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addOwn(); } }} placeholder="Add your own focus areas, or upload any relevant documents such as operating plan, development plan, career discussion etc." rows={2} style={{ border: "none", outline: "none", flex: 1, fontSize: 12.5, fontFamily: F, color: "#3D3654", background: "transparent", resize: "none" as const, lineHeight: 1.45 }} />
            <button onClick={addOwn} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: txt.trim() ? "#6B5CE7" : "#EAE7F5", color: txt.trim() ? "#FFF" : "#B5AFCF", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: txt.trim() ? "pointer" : "default" }}>+</button>
          </div>
        </div>
      )}
      {!locked && <button disabled={cnt === 0} onClick={function () { var labels = allItems.filter(function (a) { return sel.includes(a.id); }).map(function (a) { return a.label; }); onSubmit(labels, sel, customs); }} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: cnt > 0 ? "#6B5CE7" : "#E2E0EC", color: cnt > 0 ? "#FFF" : "#A8A3C0", fontSize: 13, fontWeight: 600, cursor: cnt > 0 ? "pointer" : "default", fontFamily: F, alignSelf: "flex-start" }}>{"Generate goals with " + cnt + " focus area" + (cnt !== 1 ? "s" : "") + " \u2192"}</button>}
    </div>
  );
}

/* ── KR / Child goal rows ── */

function KRRow({ kr, idx, glow }: { kr: KeyResult; idx: number; glow?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid #F5F3FA", background: glow ? "#FFFBEB" : "transparent", borderRadius: glow ? 6 : 0, transition: "background .8s ease" }}>
      <div style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid #C5BEE8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#8B7EC8", flexShrink: 0, marginTop: 1 }}>{idx + 1}</div>
      <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 500, color: "#3D3654", lineHeight: 1.4, fontFamily: F }}>{kr.name}</div><div style={{ marginTop: 4 }}><MetricPill m={kr.metric} glow={glow} /></div></div>
    </div>
  );
}

function ChildGoalRow({ child }: { child: ChildGoal }) {
  var [open, setOpen] = useState(false);
  var krs = child.keyResults || [];
  return (
    <div style={{ borderRadius: 8, border: "1px solid #EAE7F5", background: "#FAFAFF", overflow: "hidden" }}>
      <div onClick={function () { setOpen(!open); }} style={{ padding: "9px 11px", display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
        <div style={{ width: 18, height: 18, borderRadius: 5, background: "#E8E5F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#6B5CE7", flexShrink: 0, marginTop: 1 }}>{"\u21B3"}</div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: "#2D2545", lineHeight: 1.35, fontFamily: F }}>{child.name}</div><div style={{ marginTop: 3 }}><MetricPill m={child.metric} /></div></div>
        <span style={{ color: "#B5AFCF", fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0 }}>{"\u25BE"}</span>
      </div>
      {open && krs.length > 0 && <div style={{ padding: "0 11px 8px 37px" }}><div style={{ fontSize: 9.5, fontWeight: 700, color: "#8B85A3", letterSpacing: "0.04em", marginBottom: 4, fontFamily: F }}>KEY RESULTS</div>{krs.map(function (kr, ki) { return <KRRow key={ki} kr={kr} idx={ki} />; })}</div>}
    </div>
  );
}

/* ── Edit Drawer ── */

function EditDrawer({ goal, onClose, onSave }: { goal: Goal; onClose: () => void; onSave: (g: Goal) => void }) {
  var [title, setTitle] = useState(goal.name);
  var [desc, setDesc] = useState(goal.description);
  var [tags, setTags] = useState(goal.tags.join(", "));
  var [mType, setMType] = useState(goal.metricType);
  var [met, setMet] = useState<Metric>(goal.metric || { name: "", type: "NUMERIC", target: "", start: "", targetType: "Reach" });
  var [krs, setKrs] = useState<KeyResult[]>((goal.keyResults || []).map(function (kr) { return { name: kr.name, metric: { ...kr.metric } }; }));
  function updKR(i: number, v: string) { setKrs(function (p) { return p.map(function (kr, idx) { return idx === i ? { ...kr, name: v } : kr; }); }); }
  function updKRM(i: number, f: string, v: string) { setKrs(function (p) { return p.map(function (kr, idx) { return idx === i ? { ...kr, metric: { ...kr.metric, [f]: v } } : kr; }); }); }
  function delKR(i: number) { setKrs(function (p) { return p.filter(function (_, idx) { return idx !== i; }); }); }
  function addKR() { setKrs(function (p) { return p.concat({ name: "", metric: { name: "", type: "NUMERIC", target: "", start: "", targetType: "Reach" } }); }); }
  var inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid #E2E0EC", fontSize: 12.5, fontFamily: F, color: "#2D2545", fontWeight: 500, outline: "none", boxSizing: "border-box" as const, background: "#FAFAFF" };
  var lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#8B85A3", fontFamily: F, marginBottom: 4, display: "block" };
  var sm: React.CSSProperties = { ...inp, padding: "6px 8px", fontSize: 12 };
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: "flex", flexDirection: "column", animation: "drawerUp .3s ease" }}>
      <div onClick={onClose} style={{ height: 60, background: "rgba(0,0,0,0.2)", flexShrink: 0 }} />
      <div style={{ flex: 1, background: "#FFF", borderRadius: "16px 16px 0 0", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 -4px 24px rgba(0,0,0,.08)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0EDFF", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#2D2545", fontFamily: F }}>Edit goal before adding</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1.5px solid #E2E0EC", background: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#8B85A3", fontSize: 14 }}>{"\u2715"}</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Goal Title</label><textarea value={title} onChange={function (e) { setTitle(e.target.value); }} rows={2} style={{ ...inp, resize: "vertical" as const, lineHeight: 1.45 }} /></div>
          <div><label style={lbl}>Description</label><textarea value={desc} onChange={function (e) { setDesc(e.target.value); }} rows={2} style={{ ...inp, resize: "vertical" as const, lineHeight: 1.45 }} /></div>
          <div><label style={lbl}>Tags</label><input value={tags} onChange={function (e) { setTags(e.target.value); }} style={inp} /></div>
          <div><label style={lbl}>Goal Metric</label><div style={{ display: "flex", gap: 8 }}>
            <button onClick={function () { setMType("direct"); }} style={{ padding: "6px 14px", borderRadius: 8, border: mType === "direct" ? "1.5px solid #6B5CE7" : "1.5px solid #E2E0EC", background: mType === "direct" ? "#F0EDFF" : "#FFF", color: mType === "direct" ? "#5B4CC4" : "#6B6485", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Direct metric</button>
            <button onClick={function () { setMType("rollup"); }} style={{ padding: "6px 14px", borderRadius: 8, border: mType === "rollup" ? "1.5px solid #6B5CE7" : "1.5px solid #E2E0EC", background: mType === "rollup" ? "#F0EDFF" : "#FFF", color: mType === "rollup" ? "#5B4CC4" : "#6B6485", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>{"\u27F3 Rollup"}</button>
          </div></div>
          {mType === "direct" && <div style={{ padding: 12, borderRadius: 9, background: "#FAFAFF", border: "1px solid #F0EDFF", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={lbl}>Metric Name</label><input value={met.name} onChange={function (e) { setMet({ ...met, name: e.target.value }); }} style={sm} /></div><div><label style={lbl}>Type</label><select value={met.type} onChange={function (e) { setMet({ ...met, type: e.target.value }); }} style={sm}><option value="NUMERIC">NUMERIC</option><option value="PERCENTAGE">PERCENTAGE</option><option value="CURRENCY">CURRENCY</option><option value="YES_NO">YES_NO</option></select></div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}><div><label style={lbl}>Start</label><input value={met.start || ""} onChange={function (e) { setMet({ ...met, start: e.target.value }); }} style={sm} /></div><div><label style={lbl}>Target</label><input value={met.target} onChange={function (e) { setMet({ ...met, target: e.target.value }); }} style={sm} /></div><div><label style={lbl}>Target Type</label><select value={met.targetType} onChange={function (e) { setMet({ ...met, targetType: e.target.value }); }} style={sm}><option value="Reach">Reach</option><option value="Increase">Increase</option><option value="Reduce">Reduce</option><option value="Stay Below">Stay Below</option></select></div></div>
          </div>}
          <div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><label style={{ ...lbl, marginBottom: 0 }}>{"Key Results (" + krs.length + ")"}</label><button onClick={addKR} style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid #E2E0EC", background: "#FFF", color: "#6B5CE7", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F }}>+ Add KR</button></div>
            {krs.map(function (kr, ki) { return <div key={ki} style={{ padding: "10px 12px", borderRadius: 9, border: "1px solid #EAE7F5", background: "#FEFEFD", display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid #C5BEE8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#8B7EC8", flexShrink: 0 }}>{ki + 1}</div><input value={kr.name} onChange={function (e) { updKR(ki, e.target.value); }} placeholder="Key result name" style={{ ...sm, flex: 1 }} /><button onClick={function () { delKR(ki); }} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "#FEE2E2", color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{"\u00D7"}</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, paddingLeft: 26 }}><div><label style={{ ...lbl, fontSize: 10 }}>Metric</label><input value={kr.metric.name} onChange={function (e) { updKRM(ki, "name", e.target.value); }} style={{ ...sm, fontSize: 11, padding: "5px 7px" }} /></div><div><label style={{ ...lbl, fontSize: 10 }}>Type</label><select value={kr.metric.type} onChange={function (e) { updKRM(ki, "type", e.target.value); }} style={{ ...sm, fontSize: 11, padding: "5px 7px" }}><option value="NUMERIC">NUMERIC</option><option value="PERCENTAGE">PERCENTAGE</option><option value="YES_NO">YES_NO</option></select></div><div><label style={{ ...lbl, fontSize: 10 }}>Start</label><input value={kr.metric.start || ""} onChange={function (e) { updKRM(ki, "start", e.target.value); }} style={{ ...sm, fontSize: 11, padding: "5px 7px" }} /></div><div><label style={{ ...lbl, fontSize: 10 }}>Target</label><input value={kr.metric.target} onChange={function (e) { updKRM(ki, "target", e.target.value); }} style={{ ...sm, fontSize: 11, padding: "5px 7px" }} /></div></div>
            </div>; })}
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #F0EDFF", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1.5px solid #E2E0EC", background: "#FFF", color: "#6B6485", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Cancel</button>
          <button onClick={function () { onSave({ ...goal, name: title, description: desc, tags: tags.split(",").map(function (t) { return t.trim(); }).filter(Boolean), metricType: mType, metric: mType === "direct" ? met : null, keyResults: krs }); }} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#6B5CE7", color: "#FFF", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Save and add goal</button>
        </div>
      </div>
    </div>
  );
}

/* ── Goal card ── */

function GoalCard({ goal, idx, added, onAdd, onEdit, onRemove, glowKRs }: { goal: Goal; idx: number; added: string[]; onAdd: (g: Goal) => void; onEdit: (g: Goal) => void; onRemove: (g: Goal) => void; glowKRs: boolean }) {
  var [open, setOpen] = useState(false);
  var done = added.includes(goal.id);
  var hasKR = (goal.keyResults || []).length > 0;
  var hasCh = (goal.childGoals || []).length > 0;
  var isRoll = goal.metricType === "rollup";
  return (
    <div style={{ background: done ? "#F0FDF9" : "#FFF", border: done ? "1.5px solid #A7F3D0" : "1px solid #ECE9F5", borderRadius: 10, padding: "11px 13px" }}>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: done ? "default" : "pointer" }} onClick={function () { if (!done) setOpen(!open); }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: done ? "linear-gradient(135deg,#34D399,#6EE7B7)" : "linear-gradient(135deg,#6B5CE7,#8B7EC8)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 11 : 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{done ? "\u2713" : idx + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: done ? "#065F46" : "#2D2545", lineHeight: 1.4, fontFamily: F }}>{goal.name}</div>
          {!open && !done && <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
            {isRoll ? <span style={{ fontSize: 10, fontWeight: 600, color: "#8B85A3", padding: "2px 7px", borderRadius: 5, background: "#F5F3FA", fontFamily: F }}>{"\u27F3 Rollup"}</span> : <MetricPill m={goal.metric} />}
            {hasKR && <span style={{ fontSize: 10, color: "#8B85A3", fontFamily: F }}>{goal.keyResults.length + " KRs"}</span>}
            {hasCh && <span style={{ fontSize: 10, color: "#8B85A3", fontFamily: F }}>{goal.childGoals.length + " child goals"}</span>}
          </div>}
          {done && <div style={{ fontSize: 11, color: "#059669", fontWeight: 500, fontFamily: F, marginTop: 2 }}>{"Added to " + HRMS.timePeriod.name}</div>}
        </div>
        {!done && <button onClick={function (e) { e.stopPropagation(); if (onRemove) onRemove(goal); }}
          style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", color: "#C5BEE8", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 0, padding: 0, transition: "all .15s ease" }}
          onMouseEnter={function (e) { (e.currentTarget as HTMLElement).style.background = "#FEE2E2"; (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
          onMouseLeave={function (e) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#C5BEE8"; }}
          title="Remove this goal">{"\u00D7"}</button>}
        {!done && <span style={{ color: "#B5AFCF", fontSize: 13, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0, marginTop: 2 }}>{"\u25BE"}</span>}
      </div>
      {open && !done && <div style={{ marginTop: 9, marginLeft: 29, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, color: "#6B6485", lineHeight: 1.5, fontFamily: F }}>{goal.description}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
          {goal.alignedTo && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "#FEFCE8", border: "1px solid #FEF08A", fontSize: 10.5, fontWeight: 600, color: "#854D0E", fontFamily: F }}>{"\uD83D\uDD17 " + goal.alignedTo}</span>}
          {goal.tags.map(function (t) { return <span key={t} style={{ padding: "2px 7px", borderRadius: 6, background: "#F0EDFF", color: "#6B5CE7", fontSize: 10, fontWeight: 600, fontFamily: F }}>{t}</span>; })}
        </div>
        {isRoll ? <div style={{ padding: "5px 10px", borderRadius: 7, background: "#F5F3FA", border: "1px solid #E8E5F0", alignSelf: "flex-start" }}><span style={{ fontSize: 10.5, fontWeight: 600, color: "#6B6485", fontFamily: F }}>{"\u27F3 Rollup from " + (hasCh ? "child goals" : "key results")}</span></div>
          : goal.metric ? <div style={{ padding: "5px 10px", borderRadius: 7, background: "#FAFAFF", border: "1px solid #F0EDFF", display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-start" }}><span style={{ fontSize: 10, fontWeight: 600, color: "#8B85A3", fontFamily: F }}>Direct:</span><MetricPill m={goal.metric} /></div> : null}
        {hasKR && <div><div style={{ fontSize: 10, fontWeight: 700, color: "#8B85A3", letterSpacing: "0.04em", marginBottom: 5, fontFamily: F }}>{"KEY RESULTS (" + goal.keyResults.length + ")"}</div>{goal.keyResults.map(function (kr, ki) { return <KRRow key={ki} kr={kr} idx={ki} glow={glowKRs} />; })}</div>}
        {hasCh && <div><div style={{ fontSize: 10, fontWeight: 700, color: "#8B85A3", letterSpacing: "0.04em", marginBottom: 5, fontFamily: F }}>{"CHILD GOALS (" + goal.childGoals.length + ")"}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{goal.childGoals.map(function (cg, ci) { return <ChildGoalRow key={ci} child={cg} />; })}</div></div>}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={function (e) { e.stopPropagation(); onAdd(goal); }} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#059669", color: "#FFF", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: F }}>{"\u2713 Add goal"}</button>
          <button onClick={function (e) { e.stopPropagation(); onEdit(goal); }} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #E2E0EC", background: "#FFF", color: "#3D3654", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: F }}>{"\u270F\uFE0F Edit and add"}</button>
        </div>
      </div>}
    </div>
  );
}

/* ── Text input ── */

function TxtInput({ ph, onGo }: { ph: string; onGo: (text: string) => void }) {
  var [v, setV] = useState("");
  var [files, setFiles] = useState<Array<{ name: string; size: number }>>([]);
  var fileRef = useRef<HTMLInputElement>(null);
  var hasContent = v.trim() || files.length > 0;

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    var newFiles = Array.from(e.target.files || []);
    setFiles(function (prev) { return prev.concat(newFiles.map(function (f) { return { name: f.name, size: f.size }; })); });
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeFile(idx: number) { setFiles(function (prev) { return prev.filter(function (_, i) { return i !== idx; }); }); }
  function submit() {
    if (!hasContent) return;
    var msg = v.trim();
    if (files.length > 0) {
      var fileNames = files.map(function (f) { return f.name; }).join(", ");
      msg = msg ? msg + " [Attached: " + fileNames + "]" : "Attached: " + fileNames;
    }
    onGo(msg);
    setV("");
    setFiles([]);
  }
  function fmtSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }
  var iconForExt = function (name: string) {
    var ext = (name.split(".").pop() || "").toLowerCase();
    if (ext === "pdf") return { bg: "#FEE2E2", color: "#DC2626", label: "PDF" };
    if (ext === "doc" || ext === "docx") return { bg: "#DBEAFE", color: "#2563EB", label: "DOC" };
    if (ext === "ppt" || ext === "pptx") return { bg: "#FEF3C7", color: "#D97706", label: "PPT" };
    if (ext === "xls" || ext === "xlsx") return { bg: "#D1FAE5", color: "#059669", label: "XLS" };
    return { bg: "#F3F4F6", color: "#6B7280", label: ext.toUpperCase().slice(0, 3) || "FILE" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "6px 6px 4px 12px" }}>
          {files.map(function (f, fi) {
            var ic = iconForExt(f.name);
            return (
              <div key={fi} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 6px 4px 8px", borderRadius: 7, background: "#F5F3FA", border: "1px solid #E8E5F0", maxWidth: 200 }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: ic.color, background: ic.bg, padding: "2px 4px", borderRadius: 3, flexShrink: 0, fontFamily: "monospace", lineHeight: 1 }}>{ic.label}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#3D3654", fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, lineHeight: 1.2 }}>{f.name}</span>
                <span style={{ fontSize: 9.5, color: "#A8A3C0", fontFamily: F, flexShrink: 0 }}>{fmtSize(f.size)}</span>
                <button onClick={function () { removeFile(fi); }} style={{ width: 16, height: 16, borderRadius: 4, border: "none", background: "transparent", color: "#A8A3C0", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
                  onMouseEnter={function (e) { (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
                  onMouseLeave={function (e) { (e.currentTarget as HTMLElement).style.color = "#A8A3C0"; }}>{"\u00D7"}</button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, padding: "5px 5px 5px 4px", borderRadius: 10, border: "1.5px solid #E2E0EC", background: "#FFF" }}>
        <button onClick={function () { if (fileRef.current) fileRef.current.click(); }}
          style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", color: "#A8A3C0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0, transition: "color .15s ease" }}
          onMouseEnter={function (e) { (e.currentTarget as HTMLElement).style.color = "#6B5CE7"; }}
          onMouseLeave={function (e) { (e.currentTarget as HTMLElement).style.color = "#A8A3C0"; }}
          title="Attach file (PDF, DOC, PPT)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input type="file" ref={fileRef} onChange={handleFiles} multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt" style={{ display: "none" }} />
        <textarea value={v} onChange={function (e) { setV(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey && hasContent) { e.preventDefault(); submit(); } }} placeholder={ph} rows={2} style={{ border: "none", outline: "none", flex: 1, fontSize: 12.5, fontFamily: F, color: "#3D3654", background: "transparent", resize: "none" as const, lineHeight: 1.45 }} />
        <button onClick={submit} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: hasContent ? "#6B5CE7" : "#EAE7F5", color: hasContent ? "#FFF" : "#B5AFCF", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: hasContent ? "pointer" : "default" }}>{"\u21B5"}</button>
      </div>
    </div>
  );
}

/* ── Stale (old) goal list — collapsed by default ── */

function StaleGoalList({ data, added }: { data: Goal[]; added: string[] }) {
  var [expanded, setExpanded] = useState(false);
  return (
    <div style={{ paddingLeft: 35 }}>
      <div
        onClick={function () { setExpanded(!expanded); }}
        style={{
          padding: "8px 12px", borderRadius: 8,
          background: expanded ? "#FAFAFF" : "#F5F3FA",
          border: "1px solid #E8E5F0",
          cursor: "pointer", transition: "all .15s ease",
          display: "flex", alignItems: "center", gap: 8,
        }}
        onMouseEnter={function (e) { (e.currentTarget as HTMLElement).style.borderColor = "#C5BEE8"; }}
        onMouseLeave={function (e) { (e.currentTarget as HTMLElement).style.borderColor = "#E8E5F0"; }}>
        <span style={{ fontSize: 11, color: "#8B85A3", fontFamily: F, fontStyle: "italic", flex: 1 }}>
          {expanded ? "Previous version (" + data.length + " goals)" : "\u2193 Previous version (" + data.length + " goals) \u2014 click to expand"}
        </span>
        <span style={{ color: "#B5AFCF", fontSize: 12, transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s ease" }}>{"\u25BE"}</span>
      </div>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6, opacity: 0.6 }}>
          {data.map(function (g, gi) {
            var done = added.includes(g.id);
            return (
              <div key={gi} style={{
                padding: "8px 11px", borderRadius: 8,
                border: done ? "1px solid #A7F3D0" : "1px solid #ECE9F5",
                background: done ? "#F0FDF9" : "#FAFAFF",
                display: "flex", gap: 8, alignItems: "center",
              }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: done ? "#34D399" : "#E8E5F0", color: done ? "#FFF" : "#8B7EC8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{done ? "\u2713" : gi + 1}</div>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: done ? "#065F46" : "#6B6485", fontFamily: F, lineHeight: 1.3 }}>{g.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   CHAT VIEW (with live ADK agent)
   ═══════════════════════════════════════ */

function ChatView({ onBack, sessionId }: { onBack: () => void; sessionId: string }) {
  var [msgs, setMsgs] = useState<ChatMsg[]>([]);
  var [state, setState] = useState("init");
  var [typing, setTyping] = useState(false);
  var [prog, setProg] = useState(0);
  var [card, setCard] = useState<string | null>(null);
  var [added, setAdded] = useState<string[]>([]);
  var [editG, setEditG] = useState<Goal | null>(null);
  var [toast, setToast] = useState({ show: false, msg: "" });
  var [currentGoals, setCurrentGoals] = useState<Goal[] | null>(null);
  var [glowKRs, setGlowKRs] = useState(false);

  // Track server-assigned session ID (ADK generates its own, ignores ours)
  var serverSessionId = useRef<string>(sessionId);

  var endRef = useRef<HTMLDivElement>(null);
  var didInit = useRef(false);

  function scroll() { setTimeout(function () { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, 80); }
  function flash(m: string) { setToast({ show: true, msg: m }); setTimeout(function () { setToast({ show: false, msg: "" }); }, 2500); }

  function botSay(content: string) {
    return new Promise<void>(function (resolve) {
      setTyping(true); scroll();
      setTimeout(function () {
        setTyping(false);
        setMsgs(function (p) { return p.concat({ from: "bot", content: content }); });
        scroll(); resolve();
      }, 500);
    });
  }
  function userSay(t: string) { setMsgs(function (p) { return p.concat({ from: "user", text: t }); }); scroll(); }

  useEffect(function () {
    if (didInit.current) return;
    didInit.current = true;
    botSay("Hey " + HRMS.person.name.split(" ")[0] + "! I will help you generate goals for **" + HRMS.timePeriod.name + "**.\n\nHere is what I have about you and your reporting structure. Does this look right?").then(function () {
      setState("confirm");
    });
  }, []);

  // Collapse all previous goal messages and push new snapshot
  function pushGoalSnapshot(goals: Goal[], isInitial: boolean) {
    setCurrentGoals(goals);
    setMsgs(function (p) {
      var updated = p.map(function (m) {
        if (m.from === "goals" && !m.stale) {
          return { ...m, stale: true };
        }
        return m;
      });
      return updated.concat({ from: "goals", data: deepClone(goals), stale: false, isInitial: !!isInitial });
    });
  }

  // ── Call the live ADK agent for goal generation ──
  async function doGenerate(summary: string) {
    setState("generating"); scroll();
    var short = summary.length > 80 ? summary.slice(0, 77) + "..." : summary;
    await botSay("On it, generating goals focused on **" + short.toLowerCase() + "**...");

    // Start progress animation
    var p = 0;
    var iv = setInterval(function () { p += Math.random() * 8 + 3; if (p >= 95) { p = 95; clearInterval(iv); } setProg(Math.min(p, 95)); }, 400);

    // Build the message to send to the agent
    var agentMessage = "Create goals for " + HRMS.person.title + " in the " + HRMS.person.department + " team (" + HRMS.person.businessUnit + " unit), reporting to " + HRMS.manager.name + " (" + HRMS.manager.title + "), for " + HRMS.timePeriod.name + " (" + HRMS.timePeriod.range + "). Focus areas: " + summary + ". 3 key results per goal.";

    var result = await sendToAgent(agentMessage, serverSessionId.current);
    // Track the server-assigned session ID for subsequent calls
    if (result.session_id) serverSessionId.current = result.session_id;

    clearInterval(iv);
    setProg(100);

    setTimeout(function () {
      if (result.goals && result.goals.length > 0) {
        // Show bot text if any
        if (result.text) {
          setMsgs(function (p) { return p.concat({ from: "bot", content: result.text }); });
        }
        pushGoalSnapshot(result.goals, true);
        setState("done");
      } else {
        // No goals — show the text response (likely a clarification)
        setMsgs(function (p) { return p.concat({ from: "bot", content: result.text || "I wasn't able to generate goals. Please try rephrasing your request." }); });
        setState("done");
      }
      scroll();
    }, 350);
  }

  // ── Refinement handler — calls live ADK agent ──
  async function handleRefine(userText: string) {
    userSay(userText);
    setState("refining");
    setTyping(true); scroll();

    var result = await sendToAgent(userText, serverSessionId.current);
    // Track the server-assigned session ID for subsequent calls
    if (result.session_id) serverSessionId.current = result.session_id;

    setTyping(false);

    // Glow effect
    setGlowKRs(true);
    setTimeout(function () { setGlowKRs(false); }, 2000);

    if (result.goals && result.goals.length > 0) {
      // Bot explains changes, then new goals snapshot
      setMsgs(function (p) {
        var updated = p.map(function (m) {
          if (m.from === "goals" && !m.stale) return { ...m, stale: true };
          return m;
        });
        return updated.concat(
          { from: "bot", content: result.text || "Done! Here are the updated goals:" },
          { from: "goals", data: deepClone(result.goals!), stale: false, isInitial: false }
        );
      });
      setCurrentGoals(result.goals);
    } else {
      // Text-only response (clarification or conversation)
      setMsgs(function (p) { return p.concat({ from: "bot", content: result.text || "I understand. Could you tell me more about what you'd like to change?" }); });
    }

    setState("done");
    scroll();
  }

  // ── Remove a single goal via X button ──
  function handleRemoveGoal(goal: Goal) {
    if (!currentGoals) return;
    var newGoals = currentGoals.filter(function (g) { return g.id !== goal.id; });
    newGoals.forEach(function (g, i) { g.id = "g" + (i + 1); });

    setMsgs(function (p) {
      var updated = p.map(function (m) {
        if (m.from === "goals" && !m.stale) return { ...m, stale: true };
        return m;
      });
      return updated.concat(
        { from: "bot", content: "Removed **" + goal.name.slice(0, 50) + "**. Here are the remaining " + newGoals.length + " goals:" },
        { from: "goals", data: deepClone(newGoals), stale: false, isInitial: false }
      );
    });
    setCurrentGoals(newGoals);
    scroll();
  }

  function onYes() {
    setCard("yes"); userSay("Looks good"); setState("_t");
    botSay("Great! Based on your profile and **" + HRMS.manager.name + "'s** priorities for **" + HRMS.timePeriod.name + "**, here are some suggested focus areas.\n\nSelect the ones that resonate, add your own, then hit generate.").then(function () {
      setMsgs(function (p) { return p.concat({ from: "suggestions", locked: false, savedSel: [], savedCust: [] }); });
      setState("suggestions"); scroll();
    });
  }
  function onNo() {
    setCard("no"); userSay("No, this isn't right"); setState("convo_role");
    botSay("No problem! Let us start fresh.\n\nCan you tell me about your **role and responsibilities**? What does your day-to-day look like?");
  }
  function onSugSubmit(labels: string[], selIds: string[], custs: Array<{ id: string; label: string }>) {
    setMsgs(function (p) { return p.map(function (m) { return m.from === "suggestions" ? { from: "suggestions", locked: true, savedSel: selIds, savedCust: custs } : m; }); });
    userSay(labels.join(", ")); doGenerate(labels.join(", "));
  }
  function onRole(t: string) { userSay(t); setState("convo_out"); botSay("Got it.\n\nNow, what **results and outcomes** are you targeting for **" + HRMS.timePeriod.name + "**?"); }
  function onOut(t: string) { userSay(t); doGenerate(t); }
  function handleAdd(g: Goal) { setAdded(function (p) { return p.concat(g.id); }); flash(g.name.slice(0, 40) + "... added to " + HRMS.timePeriod.name); }
  function handleDrawerSave(g: Goal) { setAdded(function (p) { return p.concat(g.id); }); setEditG(null); flash(g.name.slice(0, 40) + "... edited and added"); }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0EDFF", background: "#FFF", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
        <button onClick={onBack} style={{ width: 28, height: 28, borderRadius: 7, border: "1.5px solid #E2E0EC", background: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6B6485", fontSize: 14 }}>{"\u2190"}</button>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#6B5CE7,#9B8FE8)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></svg></div>
        <div><div style={{ fontSize: 13.5, fontWeight: 700, color: "#2D2545", fontFamily: F }}>Generate with AI</div><div style={{ fontSize: 10.5, color: "#8B85A3", fontWeight: 500, fontFamily: F }}>Klaar AI</div></div>
        {added.length > 0 && <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 12, background: "#D1FAE5", color: "#065F46", fontSize: 11, fontWeight: 700, fontFamily: F }}>{added.length + " added"}</div>}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 13 }}>
        {msgs.map(function (msg, i) {
          if (msg.from === "user") return <UserMsg key={i} text={msg.text || ""} />;

          if (msg.from === "suggestions") return <div key={i} style={{ paddingLeft: 35 }}><SuggestionArea onSubmit={onSugSubmit} locked={msg.locked || false} savedSel={msg.savedSel || []} savedCust={msg.savedCust || []} /></div>;

          if (msg.from === "goals") {
            if (msg.stale) {
              return <StaleGoalList key={i} data={msg.data || []} added={added} />;
            }
            return (
              <BotRow key={i} anim>
                <BoldText text={msg.isInitial
                  ? ("Here are " + (msg.data || []).length + " goals for **you**. Expand any to see details, then **Add** directly or **Edit and add** to customize:")
                  : ("Updated goals (" + (msg.data || []).length + "):")} />
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 9 }}>
                  {(msg.data || []).map(function (g, gi) {
                    return <GoalCard key={g.id + "-" + i} goal={g} idx={gi} added={added} onAdd={handleAdd} onEdit={function (gl) { setEditG(gl); }} onRemove={handleRemoveGoal} glowKRs={glowKRs} />;
                  })}
                </div>
              </BotRow>
            );
          }

          return <BotRow key={i} anim><BoldText text={msg.content || ""} /></BotRow>;
        })}

        {state === "confirm" && !typing && <div style={{ paddingLeft: 35 }}><ContextCard onYes={onYes} onNo={onNo} decided={card} /></div>}
        {typing && <BotRow><Dots /></BotRow>}
        {state === "generating" && prog < 100 && <div style={{ padding: "0 35px" }}><div style={{ height: 3, background: "#F0EDFF", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: prog + "%", background: "linear-gradient(90deg,#6B5CE7,#9B8FE8)", borderRadius: 2, transition: "width .25s ease" }} /></div></div>}
        <div ref={endRef} />
      </div>

      {/* Input areas */}
      {state === "convo_role" && !typing && <div style={{ padding: "12px 18px 16px", borderTop: "1px solid #F0EDFF", background: "#FFF" }}><TxtInput ph="Describe your role and responsibilities..." onGo={onRole} /></div>}
      {state === "convo_out" && !typing && <div style={{ padding: "12px 18px 16px", borderTop: "1px solid #F0EDFF", background: "#FFF" }}><TxtInput ph="What results and outcomes are you targeting?" onGo={onOut} /></div>}

      {/* Refinement input */}
      {(state === "done") && !typing && (
        <div style={{ padding: "10px 18px 14px", borderTop: "1px solid #F0EDFF", background: "#FDFCFF" }}>
          <TxtInput ph="Tell me what to change e.g. 'Make goal 2 targets bolder' or upload any relevant documents." onGo={handleRefine} />
        </div>
      )}

      {editG && <EditDrawer goal={editG} onClose={function () { setEditG(null); }} onSave={handleDrawerSave} />}
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
}

/* ═══════════════════════════════════════
   FORM VIEW
   ═══════════════════════════════════════ */

function FormView({ onAI }: { onAI: () => void }) {
  var [dismissed, setDismissed] = useState(false);
  var blocked = !dismissed;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #E5E5E5", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2, background: "#FFF" }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A", fontFamily: F }}>Add goal</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {blocked && <React.Fragment>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px" }}>
            <div style={{ borderRadius: 14, border: "1.5px solid #E0DBFF", background: "linear-gradient(135deg,#FDFCFF 0%,#F5F2FF 50%,#EEEAFF 100%)", padding: 20, boxShadow: "0 4px 24px rgba(107,92,231,.1)", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#6B5CE7,#9B8FE8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#2D2545", fontFamily: F }}>{"Generate goals with AI "}<span style={{ fontSize: 9, fontWeight: 700, color: "#FFF", background: "#6B5CE7", padding: "2px 7px", borderRadius: 4, marginLeft: 4, verticalAlign: "middle" }}>NEW</span></div>
                  <div style={{ fontSize: 12.5, color: "#6B6485", fontFamily: F, marginTop: 4, lineHeight: 1.5 }}>AI will suggest goals based on your role and manager objectives.</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                    <button onClick={onAI} style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: "#6B5CE7", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F }}>{"Try it out \u2192"}</button>
                    <button onClick={function () { setDismissed(true); }} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "transparent", color: "#8B85A3", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: F }}>No thanks</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,.55)", backdropFilter: "blur(2px)", zIndex: 2, pointerEvents: "none" }} />
        </React.Fragment>}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, filter: blocked ? "blur(1.5px)" : "none", opacity: blocked ? 0.5 : 1, pointerEvents: blocked ? "none" : "auto" }}>
          <div><label style={{ fontSize: 13, fontWeight: 600, color: "#333", fontFamily: F }}>{"Title *"}</label><input placeholder="Enter title" style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13.5, fontFamily: F, marginTop: 6, outline: "none", boxSizing: "border-box" as const }} /></div>
          <div><label style={{ fontSize: 13, fontWeight: 600, color: "#333", fontFamily: F }}>{"Time period *"}</label><div style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #DDD", marginTop: 6, fontSize: 13.5, fontFamily: F }}>{HRMS.timePeriod.name}</div></div>
        </div>
      </div>
      <div style={{ padding: "14px 24px", borderTop: "1px solid #E5E5E5", display: "flex", justifyContent: "flex-end", gap: 10, background: "#FFF", zIndex: 2 }}>
        <button disabled={blocked} style={{ padding: "9px 20px", borderRadius: 6, border: "1px solid #DDD", background: "#FFF", color: blocked ? "#CCC" : "#666", fontSize: 13, fontWeight: 600, fontFamily: F, opacity: blocked ? 0.4 : 1 }}>Cancel</button>
        <button disabled={blocked} style={{ padding: "9px 20px", borderRadius: 6, border: "none", background: blocked ? "#999" : "#1A1A1A", color: "#FFF", fontSize: 13, fontWeight: 600, fontFamily: F, opacity: blocked ? 0.4 : 1 }}>Next</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   GOAL CHAT PANEL (exported)
   ═══════════════════════════════════════ */

export default function GoalChatPanel({ onClose }: { onClose?: () => void }) {
  var [view, setView] = useState<"form" | "chat">("form");
  var [sessionId] = useState(() => "web-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: F }}>
      {view === "form"
        ? <FormView onAI={function () { setView("chat"); }} />
        : <ChatView onBack={function () { setView("form"); }} sessionId={sessionId} />
      }
      <style>{[
        "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');",
        "@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}",
        "@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-3.5px)}}",
        "@keyframes drawerUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",
        "::-webkit-scrollbar{width:4px}",
        "::-webkit-scrollbar-track{background:transparent}",
        "::-webkit-scrollbar-thumb{background:#E2E0EC;border-radius:10px}",
      ].join("\n")}</style>
    </div>
  );
}

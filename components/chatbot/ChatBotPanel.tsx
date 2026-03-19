"use client";
/**
 * ChatBotPanel — General-purpose AI chatbot with user persona selector
 *
 * Connects to a live ADK agent via /api/chatbot.
 * Sends user context [CONTEXT] on every message — the backend callback reads
 * it and injects into tool calls. In production, context comes from an API instead.
 * Supports goal generation (shows goal cards when JSON blocks are returned)
 * and general conversation.
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
interface FileAttachment {
  name: string;
  mimeType: string;
  base64: string;      // raw base64 data (no data: prefix)
  previewUrl?: string;  // object URL for image preview
}

interface FocusArea {
  id: number;
  label: string;
  description: string;
  selected: boolean;
}

interface ChatMsg {
  from: string;
  content?: string;
  text?: string;
  data?: Goal[];
  focusAreas?: FocusArea[];
  focusAreasMessage?: string;
  stale?: boolean;
  isInitial?: boolean;
  fileName?: string;    // show file chip in user message
}

// ── User Personas ──
interface KlaarApiConfig {
  sheetUserId: string;
  workspaceId: string;
  clientDomain: string;
  apiBaseUrl: string;
}

interface GoalCycle {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
}

interface UserPersona {
  id: string;
  person: {
    name: string;
    role: string;
    title: string;
    department: string;
    discipline: string;
    businessUnit: string;
    bio: string;
  };
  manager: {
    name: string;
    title: string;
    department: string;
    priorities: string[];
  };
  timePeriod: { name: string; range: string };
  klaarApi?: KlaarApiConfig;
}

var PERSONAS: UserPersona[] = [
  {
    id: "priya",
    person: {
      name: "Priya Sharma",
      role: "Product Manager",
      title: "Senior Product Manager",
      department: "Product",
      discipline: "Product Management",
      businessUnit: "Growth",
      bio: "6 years in SaaS product management. Led onboarding redesign that improved activation by 22%. Focuses on data-driven experimentation and self-serve product-led growth.",
    },
    manager: {
      name: "Anika Desai",
      title: "VP of Product",
      department: "Product",
      priorities: [
        "Ship AI-powered features across all modules by Q2 end",
        "Reduce customer churn from 4.2% to under 3%",
        "Improve product NPS from 38 to 50",
        "Launch self-serve onboarding for mid-market segment",
      ],
    },
    timePeriod: { name: "Q2 2026", range: "Apr – Jun 2026" },
    klaarApi: {
      sheetUserId: "0891b869-aa49-4ce7-86b4-0d09f292540d",
      workspaceId: "6a34f746-7128-47f8-b0cf-01f00a7862cf",
      clientDomain: "us.klaarhq.com",
      apiBaseUrl: "https://api-usprod.klaarhq.com",
    },
  },
  {
    id: "rohan",
    person: {
      name: "Rohan Kapoor",
      role: "Engineering Manager",
      title: "Engineering Manager – Platform",
      department: "Engineering",
      discipline: "Software Engineering",
      businessUnit: "Platform",
      bio: "8 years in backend engineering, moved to management 2 years ago. Owns the platform team responsible for APIs, infrastructure, and developer experience. Passionate about reliability and build velocity.",
    },
    manager: {
      name: "Anika Desai",
      title: "VP of Product",
      department: "Product",
      priorities: [
        "Ship AI-powered features across all modules by Q2 end",
        "Reduce customer churn from 4.2% to under 3%",
        "Improve product NPS from 38 to 50",
        "Launch self-serve onboarding for mid-market segment",
      ],
    },
    timePeriod: { name: "Q2 2026", range: "Apr – Jun 2026" },
  },
  {
    id: "meera",
    person: {
      name: "Meera Joshi",
      role: "Customer Success Lead",
      title: "Senior Customer Success Manager",
      department: "Customer Success",
      discipline: "Customer Success",
      businessUnit: "Enterprise",
      bio: "5 years in B2B customer success. Manages the top 30 enterprise accounts. Drove renewal rate from 88% to 94% last year. Strong at building executive relationships and driving adoption.",
    },
    manager: {
      name: "Vikram Rao",
      title: "Head of Customer Success",
      department: "Customer Success",
      priorities: [
        "Achieve 95% gross renewal rate for enterprise accounts",
        "Increase expansion revenue by 20% through upsell motions",
        "Reduce time-to-value for new customers from 45 to 25 days",
        "Build a scalable health-score model for proactive intervention",
      ],
    },
    timePeriod: { name: "Q2 2026", range: "Apr – Jun 2026" },
  },
  {
    id: "no_context",
    person: {
      name: "Anonymous User",
      role: "",
      title: "",
      department: "",
      discipline: "",
      businessUnit: "",
      bio: "",
    },
    manager: {
      name: "",
      title: "",
      department: "",
      priorities: [],
    },
    timePeriod: { name: "", range: "" },
  },
];

// ── Context Injection ──
// Frontend sends [CONTEXT] on every message. The before_tool_callback reads it
// and injects into tool calls as [USER CONTEXT]. In production, the callback
// will fetch context from an API instead, and this frontend injection goes away.

function buildFullContextBlock(persona: UserPersona): string {
  var p = persona.person;
  var m = persona.manager;
  return (
    "[CONTEXT]\n" +
    "Employee: " + p.name + ", " + p.title + ", " + p.department + " department (" + p.businessUnit + " unit)\n" +
    "Background: " + p.bio + "\n" +
    "Reports to: " + m.name + " (" + m.title + ")\n" +
    "Manager priorities: " + m.priorities.join("; ") + "\n" +
    "Time period: " + persona.timePeriod.name + " (" + persona.timePeriod.range + ")\n" +
    "[/CONTEXT]\n\n"
  );
}


// ── Constants ──
var F = "'DM Sans', sans-serif";
var MC: Record<string, string> = { NUMERIC: "#3B82F6", PERCENTAGE: "#8B5CF6", CURRENCY: "#10B981", YES_NO: "#F59E0B" };

// ── Utility ──
function deepClone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)); }

// ── API Helper ──
async function sendToAgent(
  message: string,
  sessionId: string,
  persona: UserPersona,
  file?: FileAttachment | null
): Promise<{ text: string; goals: Goal[] | null; focusAreas?: FocusArea[] | null; focusAreasMessage?: string | null; parseError?: boolean; session_id?: string }> {
  // Prepend user context — callback reads it and injects into tool calls
  // Skip context injection entirely for "no_context" persona (testing with zero context)
  var finalMessage = persona.id === "no_context" ? message : buildFullContextBlock(persona) + message;

  try {
    var payload: Record<string, unknown> = { message: finalMessage, session_id: sessionId };
    if (file) {
      payload.file = {
        name: file.name,
        mimeType: file.mimeType,
        base64: file.base64,
      };
    }
    var res = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    var data = await res.json();
    if (!res.ok) {
      return { text: data.text || data.error || "Something went wrong.", goals: null };
    }
    return { text: data.text || "", goals: data.goals || null, focusAreas: data.focusAreas || null, focusAreasMessage: data.focusAreasMessage || null, parseError: data.parseError || false, session_id: data.session_id };
  } catch (e) {
    return { text: "Could not reach the AI agent. Make sure `adk web` is running.", goals: null };
  }
}

/* ═══════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════ */

function formatMetricValue(m: Metric): string {
  var tt = (m.targetType || "").toLowerCase().replace(/\s+/g, "_");
  // Range types: show start → target
  if (tt === "increase" || tt === "reduce") {
    if (m.start) return m.start + " → " + m.target;
    return (tt === "increase" ? "Increase to " : "Reduce to ") + m.target;
  }
  // Single-value types: show label + value
  var labels: Record<string, string> = {
    reach: "Reach ", stay_above: "Stay above ", stay_below: "Stay below ",
    exact: "Exact ", minimum: "Min ", maximum: "Max ",
  };
  var prefix = labels[tt] || "Target: ";
  return prefix + m.target;
}

function MetricPill({ m, glow }: { m: Metric | null; glow?: boolean }) {
  if (!m) return null;
  if (m.type === "YES_NO") {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
        borderRadius: 6, border: "1px solid #F59E0B30", background: "#F59E0B08",
        fontSize: 11, fontWeight: 600, fontFamily: F, color: "#F59E0B",
        transition: "box-shadow .6s ease",
        boxShadow: glow ? "0 0 8px #F59E0B50" : "none",
      }}>
        <span style={{ fontSize: 9, opacity: 0.7 }}>✓</span>
        {m.name}: Yes / No
      </div>
    );
  }
  var c = MC[m.type] || "#888";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
      borderRadius: 6, border: "1px solid " + c + "30", background: c + "08",
      fontSize: 11, fontWeight: 600, fontFamily: F, color: c,
      transition: "box-shadow .6s ease",
      boxShadow: glow ? "0 0 8px " + c + "50" : "none",
    }}>
      <span style={{ fontSize: 9, opacity: 0.7 }}>{m.type === "PERCENTAGE" ? "%" : m.type === "CURRENCY" ? "$" : "#"}</span>
      {m.name}: {formatMetricValue(m)}
    </div>
  );
}

function BoldText({ text }: { text: string }) {
  // Split on **bold**, [link text](url), and bare URLs
  var parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g);
  return (
    <span style={{ fontSize: 13, color: "#3D3656", fontFamily: F, lineHeight: 1.55 }}>
      {parts.map(function (p, i) {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        // Markdown link: [text](url)
        var linkMatch = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: "#6B5CE7", textDecoration: "underline", fontWeight: 500 }}>{linkMatch[1]}</a>;
        // Bare URL
        if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color: "#6B5CE7", textDecoration: "underline", wordBreak: "break-all" }}>{p}</a>;
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

function BotAv() {
  return (
    <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#6B5CE7,#9B8FE8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /></svg>
    </div>
  );
}

function BotRow({ children, anim }: { children: React.ReactNode; anim?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", animation: anim ? "fadeIn .3s ease" : "none" }}>
      <BotAv />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Dots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "8px 0" }}>
      {[0, 1, 2].map(function (i) {
        return <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#C4BFD9", animation: "bounce .6s " + (i * 0.15) + "s infinite" }} />;
      })}
    </div>
  );
}

function UserMsg({ text, fileName }: { text: string; fileName?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {fileName && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: "10px 10px 4px 10px", background: "#5A4BD6", fontSize: 11, fontFamily: F, color: "rgba(255,255,255,0.9)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            {fileName}
          </div>
        )}
        <div style={{ padding: "9px 14px", borderRadius: "14px 14px 4px 14px", background: "#6B5CE7", color: "#FFF", fontSize: 13, fontFamily: F, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{text}</div>
      </div>
    </div>
  );
}

function Toast({ msg, show }: { msg: string; show: boolean }) {
  if (!show) return null;
  return (
    <div style={{ position: "absolute", bottom: 70, left: "50%", transform: "translateX(-50%)", background: "#1A1A2E", color: "#FFF", padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: F, boxShadow: "0 4px 20px rgba(0,0,0,.2)", animation: "fadeIn .2s ease", zIndex: 30 }}>{msg}</div>
  );
}

/* ── Goal display components (kept for when agent returns goals) ── */

function KRRow({ kr, glow }: { kr: KeyResult; glow?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0" }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#9B8FE8", marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "#4A4462", fontFamily: F, lineHeight: 1.45 }}>{kr.name}</div>
        {kr.metric && <div style={{ marginTop: 3 }}><MetricPill m={kr.metric} glow={glow} /></div>}
      </div>
    </div>
  );
}

function ChildGoalRow({ cg, glow }: { cg: ChildGoal; glow?: boolean }) {
  return (
    <div style={{ marginLeft: 12, padding: "6px 0", borderLeft: "2px solid #E8E5F0", paddingLeft: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#4A4462", fontFamily: F }}>{cg.name}</div>
      {cg.metric && <div style={{ marginTop: 3 }}><MetricPill m={cg.metric} glow={glow} /></div>}
      {cg.keyResults.map(function (kr, j) { return <KRRow key={j} kr={kr} glow={glow} />; })}
    </div>
  );
}

function GoalCard({ goal, idx, added, onAdd, onEdit, onRemove, glowKRs }: {
  goal: Goal; idx: number; added: string[];
  onAdd: (g: Goal) => void; onEdit: (g: Goal) => void; onRemove: (g: Goal) => void;
  glowKRs?: boolean;
}) {
  var [open, setOpen] = useState(false);
  var done = added.includes(goal.id);
  return (
    <div style={{ borderRadius: 10, border: "1.5px solid " + (done ? "#A7F3D0" : "#E8E5F0"), background: done ? "#F0FDF4" : "#FAFAFF", overflow: "hidden", transition: "border-color .3s, background .3s" }}>
      <div onClick={function () { setOpen(!open); }} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: done ? "#34D399" : "linear-gradient(135deg,#6B5CE7,#9B8FE8)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{done ? "\u2713" : idx + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: done ? "#065F46" : "#2D2545", fontFamily: F, lineHeight: 1.35 }}>{goal.name}</div>
          {goal.tags.length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>{goal.tags.map(function (t, ti) { return <span key={ti} style={{ fontSize: 9.5, padding: "1px 7px", borderRadius: 4, background: "#F0EDFF", color: "#6B5CE7", fontWeight: 600, fontFamily: F }}>{t}</span>; })}</div>}
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
      </div>
      {open && (
        <div style={{ padding: "0 14px 12px", animation: "fadeIn .2s ease" }}>
          <div style={{ fontSize: 11.5, color: "#6B6485", fontFamily: F, marginBottom: 8, lineHeight: 1.5 }}>{goal.description}</div>
          {goal.alignedTo && <div style={{ fontSize: 10, color: "#8B7EC8", fontWeight: 600, fontFamily: F, marginBottom: 6 }}>{"Aligned to: " + goal.alignedTo}</div>}
          {goal.metric && <div style={{ marginBottom: 8 }}><MetricPill m={goal.metric} glow={glowKRs} /></div>}
          {goal.keyResults.length > 0 && <div style={{ marginBottom: 6 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: "#6B5CE7", fontFamily: F, marginBottom: 4 }}>Key Results</div>{goal.keyResults.map(function (kr, j) { return <KRRow key={j} kr={kr} glow={glowKRs} />; })}</div>}
          {goal.childGoals.length > 0 && <div style={{ marginBottom: 6 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: "#6B5CE7", fontFamily: F, marginBottom: 4 }}>Sub-Goals</div>{goal.childGoals.map(function (cg, j) { return <ChildGoalRow key={j} cg={cg} glow={glowKRs} />; })}</div>}
          {!done && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={function (e) { e.stopPropagation(); onAdd(goal); }} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#6B5CE7", color: "#FFF", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Add</button>
              <button onClick={function (e) { e.stopPropagation(); onEdit(goal); }} style={{ padding: "5px 14px", borderRadius: 6, border: "1.5px solid #E2E0EC", background: "#FFF", color: "#6B5CE7", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Edit &amp; Add</button>
              <button onClick={function (e) { e.stopPropagation(); onRemove(goal); }} style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 6, border: "none", background: "transparent", color: "#C4BFD9", fontSize: 13, cursor: "pointer" }}>{"\u2715"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StaleGoalList({ data, added }: { data: Goal[]; added: string[] }) {
  return (
    <div style={{ paddingLeft: 35, opacity: 0.45 }}>
      {data.map(function (g, gi) {
        var done = added.includes(g.id);
        return (
          <div key={g.id + "-stale-" + gi} style={{
            padding: "5px 10px", borderRadius: 6, marginBottom: 3,
            border: "1px solid " + (done ? "#A7F3D0" : "#E8E5F0"),
            background: done ? "#F0FDF9" : "#FAFAFF",
            display: "flex", gap: 8, alignItems: "center",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: done ? "#34D399" : "#E8E5F0", color: done ? "#FFF" : "#8B7EC8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{done ? "\u2713" : gi + 1}</div>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: done ? "#065F46" : "#6B6485", fontFamily: F, lineHeight: 1.3 }}>{g.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function TxtInput({ ph, onGo }: { ph: string; onGo: (text: string, file?: FileAttachment | null) => void }) {
  var [val, setVal] = useState("");
  var [file, setFile] = useState<FileAttachment | null>(null);
  var fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    var picked = e.target.files?.[0];
    if (!picked) return;
    // Limit: 10MB
    if (picked.size > 10 * 1024 * 1024) { alert("File must be under 10MB."); return; }
    var fileName = picked.name;
    var mimeType = picked.type;
    var isImage = mimeType.startsWith("image/");
    var previewUrl = isImage ? URL.createObjectURL(picked) : undefined;
    var reader = new FileReader();
    reader.onload = function () {
      var result = reader.result as string;
      // result is "data:<mime>;base64,<data>" — split to get raw base64
      var base64 = result.split(",")[1] || "";
      setFile({ name: fileName, mimeType: mimeType, base64: base64, previewUrl: previewUrl });
    };
    reader.readAsDataURL(picked);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function send() {
    if (!val.trim() && !file) return;
    onGo(val.trim() || (file ? "I've attached a file: " + file.name : ""), file);
    setVal("");
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    setFile(null);
  }

  function removeFile() {
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    setFile(null);
  }

  var canSend = val.trim() || file;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* File preview chip */}
      {file && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#F4F3FF", borderRadius: 8, border: "1px solid #E2E0EC" }}>
          {file.previewUrl ? (
            <img src={file.previewUrl} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 4, background: "#E8E5F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            </div>
          )}
          <span style={{ flex: 1, fontSize: 12, fontFamily: F, color: "#2D2545", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
          <button onClick={removeFile} style={{ width: 20, height: 20, borderRadius: 10, border: "none", background: "#E2E0EC", color: "#555", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, lineHeight: 1 }}>&times;</button>
        </div>
      )}
      {/* Input row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Hidden file input */}
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileChange} style={{ display: "none" }} />
        {/* Paperclip button */}
        <button onClick={function () { fileRef.current?.click(); }} title="Attach file (PDF or image)"
          style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #E2E0EC", background: file ? "#F4F3FF" : "#FFF", color: "#8B85A3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
        </button>
        <input value={val} onChange={function (e) { setVal(e.target.value); }}
          onKeyDown={function (e) { if (e.key === "Enter") { send(); } }}
          placeholder={ph}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E2E0EC", fontSize: 13, fontFamily: F, outline: "none", background: "#FAFAFF" }}
        />
        <button onClick={send}
          style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: canSend ? "#6B5CE7" : "#E8E5F0", color: "#FFF", cursor: canSend ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4z" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   FOCUS AREA SELECTOR (Decision 47)
   ═══════════════════════════════════════ */

function FocusAreaSelector({ areas, message, onSubmit }: {
  areas: FocusArea[];
  message: string;
  onSubmit: (selectedAreas: FocusArea[], customArea: string) => void;
}) {
  var [selections, setSelections] = useState<Record<number, boolean>>(() => {
    var init: Record<number, boolean> = {};
    areas.forEach(function (a) { init[a.id] = a.selected; });
    return init;
  });
  var [customArea, setCustomArea] = useState("");

  function toggle(id: number) {
    setSelections(function (prev) {
      var next = { ...prev };
      next[id] = !next[id];
      return next;
    });
  }

  function handleCreate() {
    var selected = areas.filter(function (a) { return selections[a.id]; });
    onSubmit(selected, customArea.trim());
  }

  var anySelected = areas.some(function (a) { return selections[a.id]; }) || customArea.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
      {areas.map(function (area) {
        var checked = selections[area.id] || false;
        return (
          <div key={area.id} onClick={function () { toggle(area.id); }}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
              borderRadius: 8, border: "1.5px solid " + (checked ? "#6B5CE7" : "#E8E5F0"),
              background: checked ? "#F5F2FF" : "#FAFAFF", cursor: "pointer",
              transition: "all .2s ease",
            }}>
            <div style={{
              width: 18, height: 18, borderRadius: 4, marginTop: 1, flexShrink: 0,
              border: "2px solid " + (checked ? "#6B5CE7" : "#C4BFD9"),
              background: checked ? "#6B5CE7" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .2s ease",
            }}>
              {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2545", fontFamily: F, lineHeight: 1.35 }}>{area.label}</div>
              <div style={{ fontSize: 11.5, color: "#6B6485", fontFamily: F, lineHeight: 1.45, marginTop: 2 }}>{area.description}</div>
            </div>
          </div>
        );
      })}
      {/* Add your own */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid #C4BFD9", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9B8FE8" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
        </div>
        <input
          value={customArea}
          onChange={function (e) { setCustomArea(e.target.value); }}
          onKeyDown={function (e) { if (e.key === "Enter" && anySelected) handleCreate(); }}
          placeholder="Add your own focus area..."
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1.5px solid #E2E0EC", fontSize: 12.5, fontFamily: F, outline: "none", background: "#FAFAFF" }}
        />
      </div>
      {/* Create button */}
      <button onClick={handleCreate} disabled={!anySelected}
        style={{
          width: "100%", padding: "10px 20px", borderRadius: 8, border: "none",
          background: anySelected ? "linear-gradient(135deg, #6B5CE7, #9B8FE8)" : "#E8E5F0",
          color: anySelected ? "#FFF" : "#8B85A3",
          fontSize: 13, fontWeight: 600, cursor: anySelected ? "pointer" : "default",
          fontFamily: F, transition: "all .2s ease", marginTop: 2,
        }}>
        Create Goals
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   EDIT DRAWER (for goal editing)
   ═══════════════════════════════════════ */

function EditDrawer({ goal, onClose, onSave }: { goal: Goal; onClose: () => void; onSave: (g: Goal) => void }) {
  var [name, setName] = useState(goal.name);
  var [desc, setDesc] = useState(goal.description);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.25)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#FFF", borderRadius: "16px 16px 0 0", maxHeight: "70%", overflowY: "auto", animation: "drawerUp .25s ease", zIndex: 21 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F0EDFF", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: F, color: "#2D2545" }}>Edit goal</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: "1.5px solid #E2E0EC", background: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600, fontFamily: F, color: "#555" }}>Title</label><input value={name} onChange={function (e) { setName(e.target.value); }} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1.5px solid #E2E0EC", fontSize: 13, fontFamily: F, marginTop: 4, outline: "none", boxSizing: "border-box" as const }} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, fontFamily: F, color: "#555" }}>Description</label><textarea value={desc} onChange={function (e) { setDesc(e.target.value); }} rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1.5px solid #E2E0EC", fontSize: 13, fontFamily: F, marginTop: 4, outline: "none", resize: "vertical", boxSizing: "border-box" as const }} /></div>
        </div>
        <div style={{ padding: "12px 20px 20px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #E2E0EC", background: "#FFF", fontSize: 12.5, fontWeight: 600, fontFamily: F, cursor: "pointer" }}>Cancel</button>
          <button onClick={function () { onSave({ ...goal, name: name, description: desc }); }} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#6B5CE7", color: "#FFF", fontSize: 12.5, fontWeight: 600, fontFamily: F, cursor: "pointer" }}>Save &amp; Add</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   USER SELECTOR
   ═══════════════════════════════════════ */

function UserSelector({ personas, selected, onSelect }: {
  personas: UserPersona[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  var [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6B5CE7", fontFamily: F, textTransform: "uppercase", letterSpacing: 0.5 }}>Select a user to simulate</div>
      {personas.map(function (p) {
        var isSelected = p.id === selected;
        var isExpanded = p.id === expanded;
        return (
          <div key={p.id} style={{
            borderRadius: 10,
            border: "1.5px solid " + (isSelected ? "#6B5CE7" : "#E8E5F0"),
            background: isSelected ? "#F5F2FF" : "#FAFAFF",
            overflow: "hidden",
            transition: "all .2s ease",
          }}>
            <div
              onClick={function () { setExpanded(isExpanded ? null : p.id); }}
              style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: isSelected ? "linear-gradient(135deg,#6B5CE7,#9B8FE8)" : p.id === "no_context" ? "#F0E6E6" : "#E8E5F0",
                color: isSelected ? "#FFF" : p.id === "no_context" ? "#B05050" : "#6B6485",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, fontFamily: F, flexShrink: 0,
              }}>{p.id === "no_context" ? "?" : p.person.name.split(" ").map(function (n) { return n[0]; }).join("")}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2545", fontFamily: F }}>{p.id === "no_context" ? "No Context" : p.person.name}</div>
                <div style={{ fontSize: 11, color: "#8B85A3", fontFamily: F }}>{p.id === "no_context" ? "No user context injected" : p.person.title + " · " + p.person.businessUnit}</div>
              </div>
              {isSelected && <div style={{ padding: "2px 8px", borderRadius: 6, background: "#6B5CE7", color: "#FFF", fontSize: 10, fontWeight: 700, fontFamily: F }}>Active</div>}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
            </div>
            {isExpanded && (
              <div style={{ padding: "0 14px 12px", animation: "fadeIn .2s ease" }}>
                {p.id === "no_context" ? (
                  <div style={{ fontSize: 11.5, color: "#6B6485", fontFamily: F, lineHeight: 1.5, marginBottom: 8 }}>No [CONTEXT] block will be sent with messages. Use this to test how the agent behaves when it has zero user context.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 11.5, color: "#6B6485", fontFamily: F, lineHeight: 1.5, marginBottom: 8 }}>{p.person.bio}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8B7EC8", fontFamily: F, marginBottom: 4 }}>Manager: {p.manager.name} ({p.manager.title})</div>
                    <div style={{ fontSize: 10.5, color: "#6B6485", fontFamily: F, marginBottom: 2 }}>Priorities:</div>
                    <ul style={{ margin: "0 0 8px 14px", padding: 0, listStyle: "disc" }}>
                      {p.manager.priorities.map(function (pr, i) {
                        return <li key={i} style={{ fontSize: 10.5, color: "#6B6485", fontFamily: F, lineHeight: 1.5 }}>{pr}</li>;
                      })}
                    </ul>
                  </>
                )}
                {!isSelected && (
                  <button onClick={function (e) { e.stopPropagation(); onSelect(p.id); }}
                    style={{ padding: "6px 16px", borderRadius: 7, border: "none", background: "#6B5CE7", color: "#FFF", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: F }}>
                    {p.id === "no_context" ? "Switch to No Context" : "Switch to " + p.person.name.split(" ")[0]}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════
   CHAT VIEW (with live ADK agent)
   ═══════════════════════════════════════ */

function ChatView({ persona, sessionId, klaarToken, selectedCycle }: { persona: UserPersona; sessionId: string; klaarToken?: string; selectedCycle?: GoalCycle | null }) {
  var [msgs, setMsgs] = useState<ChatMsg[]>([]);
  var [typing, setTyping] = useState(false);
  var [currentGoals, setCurrentGoals] = useState<Goal[] | null>(null);
  var [added, setAdded] = useState<string[]>([]);
  var [editG, setEditG] = useState<Goal | null>(null);
  var [toast, setToast] = useState({ show: false, msg: "" });
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
  function userSay(t: string, fileName?: string) { setMsgs(function (p) { return p.concat({ from: "user", text: t, fileName: fileName }); }); scroll(); }

  useEffect(function () {
    if (didInit.current) return;
    didInit.current = true;
    botSay(persona.id === "no_context"
      ? "Hey! I'm your AI assistant. No user context is being sent with this session. How can I help you today?"
      : "Hey " + persona.person.name.split(" ")[0] + "! I'm your AI assistant. How can I help you today? You can ask me any questions about Klaar or ask me to help you with things like **generating goals**, **writing feedback** etc.");
  }, []);

  // Push goal snapshot (collapse previous goal messages)
  function pushGoalSnapshot(goals: Goal[], isInitial: boolean) {
    setCurrentGoals(goals);
    setMsgs(function (p) {
      var updated = p.map(function (m) {
        if (m.from === "goals" && !m.stale) return { ...m, stale: true };
        return m;
      });
      return updated.concat({ from: "goals", data: deepClone(goals), stale: false, isInitial: !!isInitial });
    });
  }

  // ── Send message to ADK agent ──
  async function handleSend(userText: string, file?: FileAttachment | null) {
    userSay(userText, file?.name);
    setTyping(true); scroll();

    var result = await sendToAgent(
      userText,
      serverSessionId.current,
      persona,
      file
    );

    // Track server-assigned session ID
    if (result.session_id) serverSessionId.current = result.session_id;

    setTyping(false);

    if (result.parseError) {
      // Goals were generated but the response couldn't be parsed into structured cards.
      // Show a user-friendly error instead of dumping raw JSON.
      setMsgs(function (p) {
        return p.concat({
          from: "bot",
          content: "I generated your goals but ran into a formatting issue displaying them. Could you try asking again? For example: \"Generate my goals\" or \"Regenerate those goals\"."
        });
      });
    } else if (result.focusAreas && result.focusAreas.length > 0) {
      // Focus area suggestions (D47 — Mode 1)
      setMsgs(function (p) {
        return p.concat(
          { from: "bot", content: result.text || result.focusAreasMessage || "" },
          { from: "focus_areas", focusAreas: result.focusAreas!, focusAreasMessage: result.focusAreasMessage || "" }
        );
      });
    } else if (result.goals && result.goals.length > 0) {
      // Glow effect for goal updates
      setGlowKRs(true);
      setTimeout(function () { setGlowKRs(false); }, 2000);

      // Bot text + goals snapshot
      setMsgs(function (p) {
        var updated = p.map(function (m) {
          if (m.from === "goals" && !m.stale) return { ...m, stale: true };
          return m;
        });
        var isFirst = !currentGoals;
        return updated.concat(
          { from: "bot", content: result.text || (isFirst ? "Here are the goals I generated:" : "Updated goals:") },
          { from: "goals", data: deepClone(result.goals!), stale: false, isInitial: isFirst }
        );
      });
      setCurrentGoals(result.goals);
    } else {
      // Text-only response
      setMsgs(function (p) { return p.concat({ from: "bot", content: result.text || "I'm not sure how to help with that. Could you rephrase?" }); });
    }
    scroll();
  }

  // ── Remove a single goal ──
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
        { from: "bot", content: "Removed **" + goal.name.slice(0, 50) + "**. " + newGoals.length + " goals remaining." },
        { from: "goals", data: deepClone(newGoals), stale: false, isInitial: false }
      );
    });
    setCurrentGoals(newGoals);
    scroll();
  }

  async function addGoalToKlaar(g: Goal): Promise<boolean> {
    if (!persona.klaarApi || !klaarToken) return false;
    if (!selectedCycle) {
      flash("Please select a goal cycle first.");
      return false;
    }
    try {
      var res = await fetch("/api/klaar-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: {
            name: g.name,
            description: g.description,
            tags: g.tags,
            metric: g.metric,
            key_results: g.keyResults.map(function (kr) {
              return { name: kr.name, metric: kr.metric };
            }),
          },
          klaarApi: persona.klaarApi,
          cycle: selectedCycle,
          token: klaarToken,
        }),
      });
      var data = await res.json();
      if (data.success) {
        console.log("[chatbot] Goal created in Klaar:", data.data?.objective?.id);
        return true;
      } else {
        console.error("[chatbot] Klaar API error:", data.error, data.details);
        return false;
      }
    } catch (e) {
      console.error("[chatbot] Failed to create goal in Klaar:", e);
      return false;
    }
  }

  async function handleAdd(g: Goal) {
    if (persona.klaarApi && klaarToken) {
      flash("Creating in Klaar...");
      var success = await addGoalToKlaar(g);
      if (success) {
        setAdded(function (p) { return p.concat(g.id); });
        flash(g.name.slice(0, 40) + "... added to Klaar!");
      } else {
        flash("Failed to add to Klaar. Check token.");
      }
    } else {
      setAdded(function (p) { return p.concat(g.id); });
      flash(g.name.slice(0, 40) + "... added (local only)");
    }
  }
  async function handleDrawerSave(g: Goal) {
    if (persona.klaarApi && klaarToken) {
      var success = await addGoalToKlaar(g);
      if (success) {
        setAdded(function (p) { return p.concat(g.id); });
        setEditG(null);
        flash(g.name.slice(0, 40) + "... edited and added to Klaar!");
      } else {
        setEditG(null);
        flash("Failed to add to Klaar. Check token.");
      }
    } else {
      setAdded(function (p) { return p.concat(g.id); });
      setEditG(null);
      flash(g.name.slice(0, 40) + "... edited and added (local only)");
    }
  }

  // ── Focus Area selection → send to agent as user message (D47) ──
  function handleFocusAreaSubmit(selectedAreas: FocusArea[], customArea: string) {
    var parts: string[] = selectedAreas.map(function (a) { return a.label; });
    if (customArea) parts.push(customArea);
    var message = "Selected focus areas: " + parts.join(", ") + ". Please generate my goals based on these.";

    // Mark the focus area selector as stale
    setMsgs(function (p) {
      return p.map(function (m) {
        if (m.from === "focus_areas") return { ...m, stale: true };
        return m;
      });
    });

    handleSend(message);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0EDFF", background: "#FFF", display: "flex", alignItems: "center", gap: 10, zIndex: 2, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#6B5CE7,#9B8FE8)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></svg></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#2D2545", fontFamily: F }}>Klaar AI Assistant</div>
          <div style={{ fontSize: 10.5, color: "#8B85A3", fontWeight: 500, fontFamily: F }}>Chatting as {persona.id === "no_context" ? "No Context" : persona.person.name}</div>
        </div>
        {added.length > 0 && <div style={{ padding: "3px 10px", borderRadius: 12, background: "#D1FAE5", color: "#065F46", fontSize: 11, fontWeight: 700, fontFamily: F }}>{added.length + " added"}</div>}
      </div>

      {/* Messages — scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 13, minHeight: 0 }}>
        {msgs.map(function (msg, i) {
          if (msg.from === "user") return <UserMsg key={i} text={msg.text || ""} fileName={msg.fileName} />;

          if (msg.from === "focus_areas") {
            if (msg.stale) {
              // Show a collapsed summary of previously shown focus areas
              return (
                <BotRow key={i}>
                  <div style={{ fontSize: 11.5, color: "#8B85A3", fontFamily: F, fontStyle: "italic", opacity: 0.5 }}>Focus areas were selected.</div>
                </BotRow>
              );
            }
            return (
              <BotRow key={i} anim>
                <FocusAreaSelector areas={msg.focusAreas || []} message={msg.focusAreasMessage || ""} onSubmit={handleFocusAreaSubmit} />
              </BotRow>
            );
          }

          if (msg.from === "goals") {
            if (msg.stale) return <StaleGoalList key={i} data={msg.data || []} added={added} />;
            return (
              <BotRow key={i} anim>
                <BoldText text={msg.isInitial
                  ? ("Here are " + (msg.data || []).length + " goals. Expand to see details, then **Add** or **Edit and add**:")
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

        {typing && <BotRow><Dots /></BotRow>}
        <div ref={endRef} />
      </div>

      {/* Input — fixed at bottom */}
      <div style={{ padding: "10px 18px 14px", borderTop: "1px solid #F0EDFF", background: "#FDFCFF", flexShrink: 0 }}>
        <TxtInput ph="Ask anything... e.g. 'Create my goals' or 'What should I focus on?'" onGo={handleSend} />
      </div>

      {editG && <EditDrawer goal={editG} onClose={function () { setEditG(null); }} onSave={handleDrawerSave} />}
      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
}

/* ═══════════════════════════════════════
   CHATBOT PANEL (exported)
   ═══════════════════════════════════════ */

var DEFAULT_KLAAR_TOKEN = "q6my5k8TZ5tlMW4z7fFTLN4UWQhHRk";

function autoSelectCycle(cycles: GoalCycle[]): string {
  // Find cycles that contain today's date
  var today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  var matching = cycles.filter(function (c) { return c.startAt <= today && c.endAt >= today; });
  // If exactly one match, auto-select it. If 0 or >1, don't select.
  if (matching.length === 1) return matching[0].id;
  return "";
}

export default function ChatBotPanel() {
  var [selectedUser, setSelectedUser] = useState(PERSONAS[0].id);
  var [chatActive, setChatActive] = useState(false);
  var [sessionId, setSessionId] = useState(() => "web-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));
  var [klaarToken, setKlaarToken] = useState(DEFAULT_KLAAR_TOKEN);
  var [showTokenInput, setShowTokenInput] = useState(false);
  var [goalCycles, setGoalCycles] = useState<GoalCycle[]>([]);
  var [selectedCycleId, setSelectedCycleId] = useState("");
  var [cyclesLoading, setCyclesLoading] = useState(false);
  var [cyclesError, setCyclesError] = useState("");

  var persona = PERSONAS.find(function (p) { return p.id === selectedUser; }) || PERSONAS[0];

  // Fetch goal cycles when persona has klaarApi and token is set
  useEffect(function () {
    if (!persona.klaarApi || !klaarToken) {
      setGoalCycles([]);
      setSelectedCycleId("");
      return;
    }
    var api = persona.klaarApi;
    setCyclesLoading(true);
    setCyclesError("");
    fetch("/api/klaar-cycles?" + new URLSearchParams({
      sheetUserId: api.sheetUserId,
      workspaceId: api.workspaceId,
      clientDomain: api.clientDomain,
      apiBaseUrl: api.apiBaseUrl,
      token: klaarToken,
    }).toString())
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.cycles) {
          setGoalCycles(data.cycles);
          setSelectedCycleId(autoSelectCycle(data.cycles));
        } else {
          setCyclesError(data.error || "Failed to load cycles");
        }
      })
      .catch(function () { setCyclesError("Failed to fetch cycles"); })
      .finally(function () { setCyclesLoading(false); });
  }, [selectedUser, klaarToken]);

  var selectedCycle = goalCycles.find(function (c) { return c.id === selectedCycleId; }) || null;

  // When user switches persona, reset the chat session
  function handleSelectUser(id: string) {
    setSelectedUser(id);
    setChatActive(false);
    setSessionId("web-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", fontFamily: F }}>
      {!chatActive ? (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          {/* Header — fixed at top */}
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #F0EDFF", background: "#FFF", flexShrink: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#2D2545", fontFamily: F }}>ChatBot Test</div>
            <div style={{ fontSize: 12, color: "#8B85A3", fontFamily: F, marginTop: 2 }}>Select a user persona to test the AI assistant</div>
          </div>

          {/* User selector — scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", minHeight: 0 }}>
            <UserSelector personas={PERSONAS} selected={selectedUser} onSelect={handleSelectUser} />
          </div>

          {/* Klaar API token input — shown when persona has klaarApi */}
          {persona.klaarApi && (
            <div style={{ padding: "0 20px 8px", flexShrink: 0 }}>
              <div onClick={function () { setShowTokenInput(!showTokenInput); }}
                style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#6B5CE7", fontFamily: F, marginBottom: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showTokenInput ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M6 9l6 6 6-6" /></svg>
                Klaar API Token {klaarToken ? "(set)" : "(not set)"}
              </div>
              {showTokenInput && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    value={klaarToken}
                    onChange={function (e) { setKlaarToken(e.target.value); }}
                    placeholder="Bearer token for Klaar API"
                    style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1.5px solid #E2E0EC", fontSize: 11, fontFamily: F, color: "#2D2545", background: "#FAFAFF" }}
                  />
                  {klaarToken && <div style={{ fontSize: 9, color: "#10B981", fontWeight: 600, fontFamily: F, flexShrink: 0 }}>Ready</div>}
                </div>
              )}
            </div>
          )}

          {/* Goal Cycle selector — shown when persona has klaarApi and cycles loaded */}
          {persona.klaarApi && goalCycles.length > 0 && (
            <div style={{ padding: "0 20px 8px", flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6B5CE7", fontFamily: F, marginBottom: 4 }}>
                Goal Cycle
              </div>
              <select
                value={selectedCycleId}
                onChange={function (e) { setSelectedCycleId(e.target.value); }}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1.5px solid #E2E0EC", fontSize: 12, fontFamily: F, color: "#2D2545", background: "#FAFAFF", cursor: "pointer" }}
              >
                <option value="">Select a goal cycle...</option>
                {goalCycles.map(function (c) {
                  return <option key={c.id} value={c.id}>{c.name} ({c.startAt} to {c.endAt})</option>;
                })}
              </select>
              {!selectedCycleId && <div style={{ fontSize: 10, color: "#E67E22", fontFamily: F, marginTop: 2 }}>Please select a cycle before adding goals</div>}
            </div>
          )}
          {persona.klaarApi && cyclesLoading && (
            <div style={{ padding: "0 20px 8px", fontSize: 10, color: "#8B85A3", fontFamily: F }}>Loading goal cycles...</div>
          )}
          {persona.klaarApi && cyclesError && (
            <div style={{ padding: "0 20px 8px", fontSize: 10, color: "#E74C3C", fontFamily: F }}>{cyclesError}</div>
          )}

          {/* Start chat button — fixed at bottom */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid #F0EDFF", background: "#FFF", flexShrink: 0 }}>
            <button
              onClick={function () { setChatActive(true); }}
              style={{
                width: "100%", padding: "12px 20px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #6B5CE7, #9B8FE8)", color: "#FFF",
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: F,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              {persona.id === "no_context" ? "Start Chat (No Context)" : "Start Chat as " + persona.person.name.split(" ")[0]}
            </button>
          </div>
        </div>
      ) : (
        <ChatView persona={persona} sessionId={sessionId} klaarToken={klaarToken} selectedCycle={selectedCycle} />
      )}
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

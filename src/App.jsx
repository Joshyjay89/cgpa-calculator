import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, Sun, Moon, ChevronDown, ChevronUp, GraduationCap, BookOpen, User, RotateCcw, Check, Loader2, TrendingUp, Printer, Download, Upload } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STORAGE_KEY = "ledger:record";
// Data is saved to this browser's localStorage only — private to this device.
// Use Export/Import (or the backup file) to move a record to another device.

const emptyProfile = {
  name: "",
  matric: "",
  faculty: "",
  department: "",
  level: "",
  gradYear: "",
};

const GRADE_MAPS = {
  "5.0": [
    { letter: "A", point: 5 },
    { letter: "B", point: 4 },
    { letter: "C", point: 3 },
    { letter: "D", point: 2 },
    { letter: "E", point: 1 },
    { letter: "F", point: 0 },
  ],
  "4.0": [
    { letter: "A", point: 4 },
    { letter: "B", point: 3 },
    { letter: "C", point: 2 },
    { letter: "D", point: 1 },
    { letter: "F", point: 0 },
  ],
};

// Fallback map used when a course's letter grade doesn't exist on the
// scale being switched to (e.g. "E" doesn't exist on the 4.0 scale).
const LETTER_FALLBACK = { E: "D" };

function pointFor(scale, letter) {
  const map = GRADE_MAPS[scale];
  const found = map.find((g) => g.letter === letter);
  if (found) return found.point;
  const fallbackLetter = LETTER_FALLBACK[letter] || "F";
  const fallback = map.find((g) => g.letter === fallbackLetter);
  return fallback ? fallback.point : 0;
}

function normalizeLetter(scale, letter) {
  const map = GRADE_MAPS[scale];
  if (map.find((g) => g.letter === letter)) return letter;
  return LETTER_FALLBACK[letter] || "F";
}

function classify(scale, cgpa) {
  if (scale === "5.0") {
    if (cgpa >= 4.5) return "First Class";
    if (cgpa >= 3.5) return "Second Class Upper";
    if (cgpa >= 2.4) return "Second Class Lower";
    if (cgpa >= 1.5) return "Third Class";
    if (cgpa >= 1.0) return "Pass";
    return "Below Pass";
  }
  if (cgpa >= 3.6) return "First Class";
  if (cgpa >= 3.0) return "Second Class Upper";
  if (cgpa >= 2.0) return "Second Class Lower";
  if (cgpa >= 1.0) return "Third Class";
  return "Below Pass";
}

let idCounter = 1;
const nextId = () => `id_${idCounter++}_${Math.random().toString(36).slice(2, 7)}`;

function makeCourse(scale, overrides = {}) {
  return {
    id: nextId(),
    name: "",
    units: 3,
    letter: "A",
    ...overrides,
  };
}

function makeSemester(scale, name, courses = []) {
  return {
    id: nextId(),
    name,
    courses: courses.length ? courses : [makeCourse(scale)],
    open: true,
  };
}

const defaultSemesters = () => [
  makeSemester("5.0", "100 Level, First Semester", [
    makeCourse("5.0", { name: "Introduction to Computer Science", units: 3, letter: "A" }),
    makeCourse("5.0", { name: "Elementary Mathematics I", units: 2, letter: "B" }),
    makeCourse("5.0", { name: "Use of English", units: 2, letter: "A" }),
  ]),
  makeSemester("5.0", "100 Level, Second Semester", [
    makeCourse("5.0", { name: "Data Structures", units: 3, letter: "B" }),
    makeCourse("5.0", { name: "Elementary Mathematics II", units: 2, letter: "C" }),
  ]),
];

export default function App() {
  const [scale, setScale] = useState("5.0");
  const [dark, setDark] = useState(true);
  const [profile, setProfile] = useState(emptyProfile);
  const [semesters, setSemesters] = useState(defaultSemesters);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const hasLoaded = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.innerHTML = `
      .ledger-transcript { display: none; }
      @media print {
        body * { visibility: hidden; }
        .ledger-transcript, .ledger-transcript * { visibility: visible; }
        .ledger-transcript {
          display: block !important;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          background: #ffffff;
          color: #111111;
        }
        .ledger-app-view { display: none !important; }
        @page { margin: 16mm; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  // Load the record from this browser's local storage once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.profile) setProfile({ ...emptyProfile, ...data.profile });
        if (data.scale) setScale(data.scale);
        if (typeof data.dark === "boolean") setDark(data.dark);
        if (Array.isArray(data.semesters) && data.semesters.length) {
          setSemesters(data.semesters);
        }
      }
    } catch (err) {
      // No record saved yet, or storage unavailable — keep the sample defaults.
    } finally {
      hasLoaded.current = true;
      setLoading(false);
    }
  }, []);

  // Auto-save (debounced) whenever the record changes, after the initial load.
  useEffect(() => {
    if (!hasLoaded.current) return;
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const payload = JSON.stringify({ profile, scale, dark, semesters });
        window.localStorage.setItem(STORAGE_KEY, payload);
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
      }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [profile, scale, dark, semesters]);

  function exportData() {
    const payload = JSON.stringify({ profile, scale, dark, semesters }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `the-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.profile) setProfile({ ...emptyProfile, ...data.profile });
        if (data.scale) setScale(data.scale);
        if (typeof data.dark === "boolean") setDark(data.dark);
        if (Array.isArray(data.semesters) && data.semesters.length) setSemesters(data.semesters);
      } catch (err) {
        window.alert("That file couldn't be read as a Ledger backup.");
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    setProfile(emptyProfile);
    setScale("5.0");
    setSemesters(defaultSemesters());
  }

  function updateProfile(patch) {
    setProfile((p) => ({ ...p, ...patch }));
  }

  // When the grading scale changes, remap every course's letter grade
  // onto the nearest equivalent on the new scale.
  function changeScale(newScale) {
    setSemesters((prev) =>
      prev.map((s) => ({
        ...s,
        courses: s.courses.map((c) => ({ ...c, letter: normalizeLetter(newScale, c.letter) })),
      }))
    );
    setScale(newScale);
  }

  function addSemester() {
    setSemesters((prev) => [...prev, makeSemester(scale, `Semester ${prev.length + 1}`)]);
  }

  function removeSemester(semId) {
    setSemesters((prev) => prev.filter((s) => s.id !== semId));
  }

  function toggleSemesterOpen(semId) {
    setSemesters((prev) => prev.map((s) => (s.id === semId ? { ...s, open: !s.open } : s)));
  }

  function renameSemester(semId, name) {
    setSemesters((prev) => prev.map((s) => (s.id === semId ? { ...s, name } : s)));
  }

  function addCourse(semId) {
    setSemesters((prev) =>
      prev.map((s) => (s.id === semId ? { ...s, courses: [...s.courses, makeCourse(scale)] } : s))
    );
  }

  function removeCourse(semId, courseId) {
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId ? { ...s, courses: s.courses.filter((c) => c.id !== courseId) } : s
      )
    );
  }

  function updateCourse(semId, courseId, patch) {
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? { ...s, courses: s.courses.map((c) => (c.id === courseId ? { ...c, ...patch } : c)) }
          : s
      )
    );
  }

  // ---- Calculations ----
  const semesterStats = useMemo(() => {
    return semesters.map((s) => {
      let units = 0;
      let qualityPoints = 0;
      s.courses.forEach((c) => {
        const u = Number(c.units) || 0;
        units += u;
        qualityPoints += u * pointFor(scale, c.letter);
      });
      const gpa = units > 0 ? qualityPoints / units : 0;
      return { id: s.id, units, qualityPoints, gpa };
    });
  }, [semesters, scale]);

  const totals = useMemo(() => {
    const totalUnits = semesterStats.reduce((a, s) => a + s.units, 0);
    const totalQP = semesterStats.reduce((a, s) => a + s.qualityPoints, 0);
    const cgpa = totalUnits > 0 ? totalQP / totalUnits : 0;
    return { totalUnits, totalQP, cgpa };
  }, [semesterStats]);

  // Chart data: GPA per semester, running CGPA, and units per semester,
  // walked through in the order semesters appear on the record.
  const chartData = useMemo(() => {
    let runUnits = 0;
    let runQP = 0;
    return semesters.map((s, i) => {
      const stat = semesterStats.find((st) => st.id === s.id);
      runUnits += stat.units;
      runQP += stat.qualityPoints;
      return {
        label: `S${i + 1}`,
        fullLabel: s.name,
        gpa: Number(stat.gpa.toFixed(2)),
        cgpa: Number((runUnits > 0 ? runQP / runUnits : 0).toFixed(2)),
        units: stat.units,
      };
    });
  }, [semesters, semesterStats]);

  const degreeClass = classify(scale, totals.cgpa);
  const maxPoint = scale === "5.0" ? 5 : 4;

  const theme = dark
    ? {
        pageBg: "#0F1826",
        cardBg: "#16233D",
        cardBorder: "rgba(255,255,255,0.09)",
        headerBorder: "rgba(255,255,255,0.10)",
        text: "#F3EFE4",
        textMuted: "#9BA3B5",
        inputBg: "#0F1826",
        inputBorder: "rgba(255,255,255,0.14)",
        rowAlt: "rgba(255,255,255,0.025)",
        dashed: "rgba(255,255,255,0.18)",
      }
    : {
        pageBg: "#F6F2E9",
        cardBg: "#FFFDF8",
        cardBorder: "rgba(22,35,61,0.10)",
        headerBorder: "rgba(22,35,61,0.10)",
        text: "#16233D",
        textMuted: "#6B6F76",
        inputBg: "#FBF9F3",
        inputBorder: "rgba(22,35,61,0.16)",
        rowAlt: "rgba(22,35,61,0.02)",
        dashed: "rgba(22,35,61,0.22)",
      };

  const gold = "#C9A227";
  const forest = dark ? "#4C9C82" : "#1F4B3F";
  const brick = "#A8432E";

  if (loading) {
    return (
      <div
        style={{ background: theme.pageBg, color: theme.textMuted, minHeight: "100vh" }}
        className="w-full min-h-screen flex items-center justify-center flex-col gap-3"
      >
        <Loader2 className="animate-spin" size={22} style={{ color: gold }} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5 }}>Opening the ledger…</p>
      </div>
    );
  }

  return (
    <>
    <div
      style={{
        background: theme.pageBg,
        color: theme.text,
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        minHeight: "100%",
        transition: "background 0.25s ease, color 0.25s ease",
      }}
      className="w-full min-h-screen ledger-app-view"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div
          className="flex items-center justify-between flex-wrap gap-4 pb-6 mb-8"
          style={{ borderBottom: `1px solid ${theme.headerBorder}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, border: `1.5px solid ${gold}`, color: gold }}
            >
              <GraduationCap size={22} />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontSize: 26,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                The Ledger
              </h1>
              <p style={{ color: theme.textMuted, fontSize: 12.5, marginTop: 2 }}>
                A running record of your GPA and CGPA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex rounded-full p-1"
              style={{ border: `1px solid ${theme.inputBorder}` }}
            >
              {["5.0", "4.0"].map((s) => (
                <button
                  key={s}
                  onClick={() => changeScale(s)}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12.5,
                    padding: "6px 14px",
                    borderRadius: 999,
                    background: scale === s ? gold : "transparent",
                    color: scale === s ? "#1A1400" : theme.textMuted,
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                  }}
                >
                  {s} scale
                </button>
              ))}
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle dark mode"
              className="flex items-center justify-center rounded-full"
              style={{ width: 38, height: 38, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-full"
              style={{
                height: 38,
                padding: "0 14px",
                border: `1px solid ${theme.inputBorder}`,
                color: theme.text,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 rounded-full"
              style={{
                height: 38,
                padding: "0 14px",
                border: `1px solid ${theme.inputBorder}`,
                color: theme.text,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Download size={15} /> Export
            </button>
            <label
              className="flex items-center gap-2 rounded-full cursor-pointer"
              style={{
                height: 38,
                padding: "0 14px",
                border: `1px solid ${theme.inputBorder}`,
                color: theme.text,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Upload size={15} /> Import
              <input
                type="file"
                accept="application/json"
                onChange={(e) => e.target.files[0] && importData(e.target.files[0])}
                style={{ display: "none" }}
              />
            </label>
            <button
              onClick={() => {
                if (window.confirm("Reset the profile and every semester on record? This can't be undone.")) {
                  resetAll();
                }
              }}
              aria-label="Reset all data"
              className="flex items-center justify-center rounded-full"
              style={{ width: 38, height: 38, border: `1px solid ${theme.inputBorder}`, color: brick }}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-2 -mt-5 mb-6" style={{ color: theme.textMuted, fontSize: 12 }}>
          {saveStatus === "saving" && (
            <>
              <Loader2 className="animate-spin" size={12} /> Saving…
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check size={12} style={{ color: forest }} /> Saved on this device
            </>
          )}
          {saveStatus === "error" && <span style={{ color: brick }}>Couldn't save — check your connection</span>}
        </div>

        {/* Profile letterhead */}
        <div
          className="rounded-2xl px-5 py-5 mb-8"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <div className="flex items-center gap-2 mb-4" style={{ color: theme.textMuted }}>
            <User size={14} />
            <p style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Student profile</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: "name", label: "Full name", placeholder: "Ada Obi" },
              { key: "matric", label: "Matric number", placeholder: "CSC/2021/045" },
              { key: "faculty", label: "Faculty", placeholder: "Science" },
              { key: "department", label: "Department", placeholder: "Computer Science" },
              { key: "level", label: "Level", placeholder: "300" },
              { key: "gradYear", label: "Graduation year", placeholder: "2027" },
            ].map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <label style={{ fontSize: 10.5, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {f.label}
                </label>
                <input
                  value={profile[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => updateProfile({ [f.key]: e.target.value })}
                  style={{
                    background: theme.inputBg,
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 8,
                    padding: "7px 9px",
                    fontSize: 13.5,
                    color: theme.text,
                    outline: "none",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* CGPA seal */}
          <div
            className="rounded-2xl flex items-center gap-4 px-5 py-5 sm:col-span-1"
            style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{
                width: 72,
                height: 72,
                border: `2px solid ${gold}`,
                boxShadow: `inset 0 0 0 3px ${theme.pageBg}`,
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 600,
                  fontSize: 20,
                  color: gold,
                }}
              >
                {totals.cgpa.toFixed(2)}
              </span>
            </div>
            <div>
              <p style={{ color: theme.textMuted, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                CGPA &middot; out of {maxPoint.toFixed(1)}
              </p>
              <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 16.5, marginTop: 3 }}>
                {degreeClass}
              </p>
            </div>
          </div>

          {/* Credits */}
          <div
            className="rounded-2xl px-5 py-5 flex flex-col justify-center"
            style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <p style={{ color: theme.textMuted, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Credit units completed
            </p>
            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
                fontSize: 30,
                marginTop: 6,
                color: forest,
              }}
            >
              {totals.totalUnits}
            </p>
          </div>

          {/* Semesters */}
          <div
            className="rounded-2xl px-5 py-5 flex flex-col justify-center"
            style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <p style={{ color: theme.textMuted, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Semesters on record
            </p>
            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
                fontSize: 30,
                marginTop: 6,
              }}
            >
              {semesters.length}
            </p>
          </div>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-10">
          <div
            className="rounded-2xl px-5 py-5 lg:col-span-3"
            style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <div className="flex items-center gap-2 mb-1" style={{ color: theme.textMuted }}>
              <TrendingUp size={14} />
              <p style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                GPA &amp; CGPA trend
              </p>
            </div>
            <div className="flex items-center gap-4 mb-2" style={{ fontSize: 11.5 }}>
              <span className="flex items-center gap-1.5" style={{ color: theme.textMuted }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: gold, display: "inline-block" }} />
                Semester GPA
              </span>
              <span className="flex items-center gap-1.5" style={{ color: theme.textMuted }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: forest, display: "inline-block" }} />
                Running CGPA
              </span>
            </div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.headerBorder} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: theme.textMuted, fontSize: 11, fontFamily: "IBM Plex Mono" }}
                    axisLine={{ stroke: theme.headerBorder }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, maxPoint]}
                    tick={{ fill: theme.textMuted, fontSize: 11, fontFamily: "IBM Plex Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontFamily: "Inter",
                    }}
                    labelStyle={{ color: theme.text, fontWeight: 600, marginBottom: 4 }}
                    labelFormatter={(label, payload) =>
                      payload && payload[0] ? payload[0].payload.fullLabel : label
                    }
                    formatter={(value, name) => [value.toFixed(2), name === "gpa" ? "Semester GPA" : "Running CGPA"]}
                  />
                  <Line type="monotone" dataKey="gpa" stroke={gold} strokeWidth={2.5} dot={{ r: 3.5, fill: gold }} />
                  <Line type="monotone" dataKey="cgpa" stroke={forest} strokeWidth={2.5} dot={{ r: 3.5, fill: forest }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className="rounded-2xl px-5 py-5 lg:col-span-2"
            style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: theme.textMuted }}>
              <BookOpen size={14} />
              <p style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Credits per semester
              </p>
            </div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.headerBorder} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: theme.textMuted, fontSize: 11, fontFamily: "IBM Plex Mono" }}
                    axisLine={{ stroke: theme.headerBorder }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: theme.textMuted, fontSize: 11, fontFamily: "IBM Plex Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontFamily: "Inter",
                    }}
                    labelStyle={{ color: theme.text, fontWeight: 600, marginBottom: 4 }}
                    labelFormatter={(label, payload) =>
                      payload && payload[0] ? payload[0].payload.fullLabel : label
                    }
                    formatter={(value) => [value, "Units"]}
                  />
                  <Bar dataKey="units" fill={gold} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Semesters */}
        <div className="flex flex-col gap-5">
          {semesters.map((s, idx) => {
            const stat = semesterStats.find((st) => st.id === s.id);
            return (
              <div
                key={s.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
              >
                {/* Semester header */}
                <div
                  className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap"
                  style={{ borderBottom: s.open ? `1px solid ${theme.headerBorder}` : "none" }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <button
                      onClick={() => toggleSemesterOpen(s.id)}
                      style={{ color: theme.textMuted }}
                      aria-label="Toggle semester"
                    >
                      {s.open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <input
                      value={s.name}
                      onChange={(e) => renameSemester(s.id, e.target.value)}
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontWeight: 500,
                        fontSize: 17,
                        background: "transparent",
                        color: theme.text,
                        border: "none",
                        outline: "none",
                        width: "100%",
                        maxWidth: 320,
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p style={{ color: theme.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Semester GPA
                      </p>
                      <p
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontWeight: 600,
                          fontSize: 18,
                          color: gold,
                        }}
                      >
                        {stat.gpa.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSemester(s.id)}
                      disabled={semesters.length === 1}
                      style={{ color: semesters.length === 1 ? theme.textMuted : brick, opacity: semesters.length === 1 ? 0.4 : 1 }}
                      aria-label="Delete semester"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                {/* Courses table */}
                {s.open && (
                  <div className="px-5 py-4">
                    <div
                      className="grid gap-2 pb-2 mb-1"
                      style={{
                        gridTemplateColumns: "36px 1fr 90px 90px 90px 36px",
                        color: theme.textMuted,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <span>S/N</span>
                      <span>Course</span>
                      <span>Units</span>
                      <span>Grade</span>
                      <span>Points</span>
                      <span></span>
                    </div>

                    {s.courses.map((c, i) => (
                      <div
                        key={c.id}
                        className="grid gap-2 items-center rounded-lg"
                        style={{
                          gridTemplateColumns: "36px 1fr 90px 90px 90px 36px",
                          padding: "6px 6px",
                          background: i % 2 === 1 ? theme.rowAlt : "transparent",
                        }}
                      >
                        <span
                          style={{ fontFamily: "'IBM Plex Mono', monospace", color: theme.textMuted, fontSize: 13 }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <input
                          value={c.name}
                          placeholder="Course title"
                          onChange={(e) => updateCourse(s.id, c.id, { name: e.target.value })}
                          style={{
                            background: theme.inputBg,
                            border: `1px solid ${theme.inputBorder}`,
                            borderRadius: 8,
                            padding: "7px 10px",
                            fontSize: 14,
                            color: theme.text,
                            outline: "none",
                          }}
                        />
                        <input
                          type="number"
                          min={0}
                          max={12}
                          value={c.units}
                          onChange={(e) => updateCourse(s.id, c.id, { units: e.target.value })}
                          style={{
                            background: theme.inputBg,
                            border: `1px solid ${theme.inputBorder}`,
                            borderRadius: 8,
                            padding: "7px 8px",
                            fontSize: 14,
                            color: theme.text,
                            outline: "none",
                            textAlign: "center",
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}
                        />
                        <select
                          value={c.letter}
                          onChange={(e) => updateCourse(s.id, c.id, { letter: e.target.value })}
                          style={{
                            background: theme.inputBg,
                            border: `1px solid ${theme.inputBorder}`,
                            borderRadius: 8,
                            padding: "7px 6px",
                            fontSize: 14,
                            color: theme.text,
                            outline: "none",
                            fontFamily: "'IBM Plex Mono', monospace",
                            textAlign: "center",
                          }}
                        >
                          {GRADE_MAPS[scale].map((g) => (
                            <option key={g.letter} value={g.letter}>
                              {g.letter}
                            </option>
                          ))}
                        </select>
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 14,
                            color: theme.textMuted,
                            textAlign: "center",
                          }}
                        >
                          {((Number(c.units) || 0) * pointFor(scale, c.letter)).toFixed(1)}
                        </span>
                        <button
                          onClick={() => removeCourse(s.id, c.id)}
                          disabled={s.courses.length === 1}
                          style={{
                            color: s.courses.length === 1 ? theme.textMuted : brick,
                            opacity: s.courses.length === 1 ? 0.35 : 1,
                            display: "flex",
                            justifyContent: "center",
                          }}
                          aria-label="Delete course"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => addCourse(s.id)}
                      className="flex items-center gap-2 mt-3"
                      style={{
                        color: forest,
                        fontSize: 13.5,
                        fontWeight: 500,
                        border: `1px dashed ${theme.dashed}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        width: "100%",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={15} /> Add course
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add semester */}
        <button
          onClick={addSemester}
          className="flex items-center gap-2 mt-6 w-full justify-center"
          style={{
            color: gold,
            fontFamily: "'Fraunces', serif",
            fontWeight: 500,
            fontSize: 15,
            border: `1.5px dashed ${gold}`,
            borderRadius: 14,
            padding: "14px 12px",
          }}
        >
          <BookOpen size={16} /> Add semester
        </button>

        <p style={{ color: theme.textMuted, fontSize: 12, textAlign: "center", marginTop: 28 }}>
          v5.0 &middot; The Ledger &middot; installable PWA &middot; all data stays on this device
        </p>
      </div>
    </div>

    {/* Print-only official transcript */}
    <div className="ledger-transcript" style={{ fontFamily: "'Inter', sans-serif", color: "#111111", padding: "0 4mm" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #111111", paddingBottom: 12, marginBottom: 16 }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, letterSpacing: "0.02em" }}>
          ACADEMIC TRANSCRIPT
        </p>
        <p style={{ fontSize: 11, color: "#444444", marginTop: 4 }}>
          Generated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} &middot; Grading scale: {scale}
        </p>
      </div>

      <table style={{ width: "100%", marginBottom: 18, fontSize: 12.5, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "3px 0", color: "#444444", width: "16%" }}>Name</td>
            <td style={{ padding: "3px 0", fontWeight: 600 }}>{profile.name || "—"}</td>
            <td style={{ padding: "3px 0", color: "#444444", width: "16%" }}>Matric No.</td>
            <td style={{ padding: "3px 0", fontWeight: 600 }}>{profile.matric || "—"}</td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", color: "#444444" }}>Faculty</td>
            <td style={{ padding: "3px 0", fontWeight: 600 }}>{profile.faculty || "—"}</td>
            <td style={{ padding: "3px 0", color: "#444444" }}>Department</td>
            <td style={{ padding: "3px 0", fontWeight: 600 }}>{profile.department || "—"}</td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", color: "#444444" }}>Level</td>
            <td style={{ padding: "3px 0", fontWeight: 600 }}>{profile.level || "—"}</td>
            <td style={{ padding: "3px 0", color: "#444444" }}>Graduation Year</td>
            <td style={{ padding: "3px 0", fontWeight: 600 }}>{profile.gradYear || "—"}</td>
          </tr>
        </tbody>
      </table>

      {semesters.map((s, idx) => {
        const stat = semesterStats.find((st) => st.id === s.id);
        return (
          <div key={s.id} style={{ marginBottom: 16, breakInside: "avoid" }}>
            <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {s.name}
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderTop: "1px solid #111111", borderBottom: "1px solid #111111" }}>
                  <th style={{ textAlign: "left", padding: "4px 2px", width: "8%" }}>S/N</th>
                  <th style={{ textAlign: "left", padding: "4px 2px" }}>Course</th>
                  <th style={{ textAlign: "center", padding: "4px 2px", width: "12%" }}>Units</th>
                  <th style={{ textAlign: "center", padding: "4px 2px", width: "12%" }}>Grade</th>
                  <th style={{ textAlign: "right", padding: "4px 2px", width: "16%" }}>Quality Pts</th>
                </tr>
              </thead>
              <tbody>
                {s.courses.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #dddddd" }}>
                    <td style={{ padding: "4px 2px" }}>{i + 1}</td>
                    <td style={{ padding: "4px 2px" }}>{c.name || "Untitled course"}</td>
                    <td style={{ padding: "4px 2px", textAlign: "center" }}>{c.units}</td>
                    <td style={{ padding: "4px 2px", textAlign: "center" }}>{c.letter}</td>
                    <td style={{ padding: "4px 2px", textAlign: "right" }}>
                      {((Number(c.units) || 0) * pointFor(scale, c.letter)).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ textAlign: "right", fontSize: 11.5, marginTop: 3, fontWeight: 600 }}>
              Semester units: {stat.units} &nbsp;&middot;&nbsp; Semester GPA: {stat.gpa.toFixed(2)}
            </p>
          </div>
        );
      })}

      <div style={{ borderTop: "2px solid #111111", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span>Total credit units: <strong>{totals.totalUnits}</strong></span>
        <span>CGPA: <strong>{totals.cgpa.toFixed(2)} / {maxPoint.toFixed(1)}</strong></span>
        <span>Classification: <strong>{degreeClass}</strong></span>
      </div>
    </div>
    </>
  );
}

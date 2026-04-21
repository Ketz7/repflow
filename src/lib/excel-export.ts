import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/client";

// ============================================================================
// Types for the shape of data we select from Supabase.
// ============================================================================

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  goal: string | null;
  weekly_session_goal: number | null;
  weight_unit: "kg" | "lbs" | null;
}

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  program_workout: { name: string | null; program: { name: string | null } | null } | null;
}

interface SetRow {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number | null;
  weight_used: number | null;
  rpe: number | null;
  created_at: string;
  exercise: {
    name: string | null;
    muscle_group: { name: string | null } | null;
  } | null;
}

interface BodyLogRow {
  date: string;
  weight: number | null;
  steps: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fat_percentage: number | null;
  muscle_percentage: number | null;
}

// ============================================================================
// Style helpers
// ============================================================================

const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0B1929" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};
const TITLE_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 18,
  color: { argb: "FF38BDF8" },
};
const SUBTITLE_FONT: Partial<ExcelJS.Font> = {
  italic: true,
  size: 10,
  color: { argb: "FF6B7280" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF38BDF8" } },
    };
  });
  row.height = 20;
}

function mondayOf(dateIso: string): string {
  const d = new Date(dateIso);
  const day = d.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function toYmd(dateIso: string): string {
  return new Date(dateIso).toISOString().slice(0, 10);
}

// ============================================================================
// Main export function
// ============================================================================

export async function exportUserDataToXlsx(userId: string): Promise<Blob> {
  const supabase = createClient();

  // -- Parallel fetch --------------------------------------------------------
  const [userRes, sessionsRes, setsRes, bodyLogsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, display_name, goal, weekly_session_goal, weight_unit")
      .eq("id", userId)
      .single<UserRow>(),
    supabase
      .from("workout_sessions")
      .select(
        "id, started_at, ended_at, notes, program_workout:program_workouts(name, program:programs(name))"
      )
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .returns<SessionRow[]>(),
    supabase
      .from("session_sets")
      .select(
        "id, session_id, exercise_id, set_number, reps_completed, weight_used, rpe, created_at, exercise:exercises(name, muscle_group:muscle_groups(name))"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .returns<SetRow[]>(),
    supabase
      .from("body_weight_logs")
      .select(
        "date, weight, steps, protein, carbs, fat, fat_percentage, muscle_percentage"
      )
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .returns<BodyLogRow[]>(),
  ]);

  const user = userRes.data;
  const sessions = sessionsRes.data ?? [];
  const sets = setsRes.data ?? [];
  const bodyLogs = bodyLogsRes.data ?? [];

  const unit = user?.weight_unit ?? "kg";
  const weightFmt = `0.0 "${unit}"`;
  const dateFmt = "yyyy-mm-dd";

  // Build session lookup for date
  const sessionDateById = new Map<string, string>();
  for (const s of sessions) sessionDateById.set(s.id, s.started_at);

  // ==========================================================================
  // Build workbook
  // ==========================================================================
  const wb = new ExcelJS.Workbook();
  wb.creator = "RepFlow";
  wb.created = new Date();

  // --- Sheet 1: Dashboard ---------------------------------------------------
  const dash = wb.addWorksheet("Dashboard", {
    views: [{ showGridLines: false }],
  });
  dash.columns = [
    { width: 32 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  dash.getCell("A1").value = "RepFlow Training Export";
  dash.getCell("A1").font = TITLE_FONT;
  dash.mergeCells("A1:E1");

  dash.getCell("A2").value = `Generated ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC`;
  dash.getCell("A2").font = SUBTITLE_FONT;
  dash.mergeCells("A2:E2");

  const firstSession = sessions.length ? sessions[sessions.length - 1].started_at : null;
  const lastSession = sessions.length ? sessions[0].started_at : null;
  dash.getCell("A3").value = firstSession
    ? `Range: ${toYmd(firstSession)} → ${toYmd(lastSession!)}`
    : "Range: (no completed sessions)";
  dash.getCell("A3").font = SUBTITLE_FONT;
  dash.mergeCells("A3:E3");

  dash.getCell("A4").value = user
    ? `User: ${user.display_name ?? user.email} (${user.email})`
    : "";
  dash.getCell("A4").font = SUBTITLE_FONT;
  dash.mergeCells("A4:E4");

  // -- KPIs ------------------------------------------------------------------
  let totalTonnage = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  for (const s of sets) {
    const w = s.weight_used ?? 0;
    const r = s.reps_completed ?? 0;
    totalTonnage += w * r;
    if (s.rpe != null) {
      rpeSum += s.rpe;
      rpeCount += 1;
    }
  }

  let totalDurationMin = 0;
  let durationSessions = 0;
  for (const s of sessions) {
    if (s.ended_at) {
      const mins =
        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000;
      if (mins > 0 && mins < 24 * 60) {
        totalDurationMin += mins;
        durationSessions += 1;
      }
    }
  }
  const avgDuration = durationSessions ? totalDurationMin / durationSessions : 0;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const daysInLast30 = new Set<string>();
  for (const s of sessions) {
    const t = new Date(s.started_at).getTime();
    if (t >= thirtyDaysAgo) daysInLast30.add(toYmd(s.started_at));
  }

  // Most-trained muscle group + exercise
  const muscleCount = new Map<string, number>();
  const exCount = new Map<string, number>();
  for (const s of sets) {
    const mg = s.exercise?.muscle_group?.name ?? "(unknown)";
    const ex = s.exercise?.name ?? "(unknown)";
    muscleCount.set(mg, (muscleCount.get(mg) ?? 0) + 1);
    exCount.set(ex, (exCount.get(ex) ?? 0) + 1);
  }
  const topMuscle = [...muscleCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const topExercise = [...exCount.entries()].sort((a, b) => b[1] - a[1])[0];

  let kpiRow = 6;
  dash.getCell(`A${kpiRow}`).value = "Key Metrics";
  dash.getCell(`A${kpiRow}`).font = { bold: true, size: 14, color: { argb: "FF38BDF8" } };
  kpiRow += 1;

  const kpis: Array<[string, string | number, string?]> = [
    ["Total sessions", sessions.length],
    ["Total sets logged", sets.length],
    [`Total tonnage (${unit})`, Math.round(totalTonnage)],
    ["Average session duration (min)", Math.round(avgDuration)],
    ["Days trained in last 30", daysInLast30.size],
    ["Average RPE", rpeCount ? (rpeSum / rpeCount).toFixed(2) : "—"],
    ["Most-trained muscle group", topMuscle ? `${topMuscle[0]} (${topMuscle[1]} sets)` : "—"],
    ["Most-trained exercise", topExercise ? `${topExercise[0]} (${topExercise[1]} sets)` : "—"],
  ];
  for (const [label, value] of kpis) {
    dash.getCell(`A${kpiRow}`).value = label;
    dash.getCell(`A${kpiRow}`).font = { color: { argb: "FF6B7280" } };
    dash.getCell(`B${kpiRow}`).value = value;
    dash.getCell(`B${kpiRow}`).font = { bold: true };
    kpiRow += 1;
  }

  // -- Top 5 lifts -----------------------------------------------------------
  kpiRow += 1;
  dash.getCell(`A${kpiRow}`).value = "Top 5 Lifts (by frequency)";
  dash.getCell(`A${kpiRow}`).font = { bold: true, size: 14, color: { argb: "FF38BDF8" } };
  kpiRow += 1;
  const topRowIdx = kpiRow;
  const topHeader = dash.getRow(topRowIdx);
  topHeader.values = ["Exercise", "Sets Performed", `Best Weight (${unit})`, "Reps at Best", "Best Date"];
  styleHeaderRow(topHeader);
  kpiRow += 1;

  const top5 = [...exCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [exName, count] of top5) {
    // find best set for this exercise
    let best: SetRow | null = null;
    for (const s of sets) {
      if (s.exercise?.name !== exName) continue;
      if (s.weight_used == null || s.reps_completed == null) continue;
      if (!best || (s.weight_used ?? 0) > (best.weight_used ?? 0)) best = s;
    }
    dash.getCell(`A${kpiRow}`).value = exName;
    dash.getCell(`B${kpiRow}`).value = count;
    dash.getCell(`C${kpiRow}`).value = best?.weight_used ?? null;
    dash.getCell(`C${kpiRow}`).numFmt = weightFmt;
    dash.getCell(`D${kpiRow}`).value = best?.reps_completed ?? null;
    dash.getCell(`E${kpiRow}`).value = best ? toYmd(best.created_at) : null;
    kpiRow += 1;
  }

  // -- Weekly tonnage last 8 weeks ------------------------------------------
  kpiRow += 1;
  dash.getCell(`A${kpiRow}`).value = "Weekly Tonnage — Last 8 Weeks";
  dash.getCell(`A${kpiRow}`).font = { bold: true, size: 14, color: { argb: "FF38BDF8" } };
  kpiRow += 1;
  const weekHeaderIdx = kpiRow;
  const weekHeader = dash.getRow(weekHeaderIdx);
  weekHeader.values = ["Week Starting (Mon)", `Total Tonnage (${unit})`];
  styleHeaderRow(weekHeader);
  kpiRow += 1;

  // Build weekly map
  const weekTonnage = new Map<string, number>();
  for (const s of sets) {
    const sessDate = sessionDateById.get(s.session_id) ?? s.created_at;
    const wk = mondayOf(sessDate);
    const v = (s.weight_used ?? 0) * (s.reps_completed ?? 0);
    weekTonnage.set(wk, (weekTonnage.get(wk) ?? 0) + v);
  }
  // Last 8 weeks from today
  const weeks: string[] = [];
  const thisMonday = new Date(mondayOf(new Date().toISOString()));
  for (let i = 7; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weeks.push(d.toISOString().slice(0, 10));
  }
  for (const wk of weeks) {
    dash.getCell(`A${kpiRow}`).value = wk;
    dash.getCell(`B${kpiRow}`).value = Math.round(weekTonnage.get(wk) ?? 0);
    kpiRow += 1;
  }

  // --- Sheet 2: Sessions ----------------------------------------------------
  const sessSheet = wb.addWorksheet("Sessions");
  sessSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Workout", key: "name", width: 28 },
    { header: "Program", key: "program", width: 24 },
    { header: "Duration (min)", key: "duration", width: 15 },
    { header: "Sets", key: "sets", width: 8 },
    { header: "Tonnage", key: "tonnage", width: 14 },
    { header: "Avg RPE", key: "avgRpe", width: 10 },
    { header: "Notes", key: "notes", width: 40 },
  ];
  styleHeaderRow(sessSheet.getRow(1));
  sessSheet.views = [{ state: "frozen", ySplit: 1 }];

  // Pre-aggregate sets per session
  const bySession = new Map<
    string,
    { count: number; tonnage: number; rpeSum: number; rpeCount: number }
  >();
  for (const s of sets) {
    const agg = bySession.get(s.session_id) ?? {
      count: 0,
      tonnage: 0,
      rpeSum: 0,
      rpeCount: 0,
    };
    agg.count += 1;
    agg.tonnage += (s.weight_used ?? 0) * (s.reps_completed ?? 0);
    if (s.rpe != null) {
      agg.rpeSum += s.rpe;
      agg.rpeCount += 1;
    }
    bySession.set(s.session_id, agg);
  }

  for (const s of sessions) {
    const agg = bySession.get(s.id);
    const durationMin = s.ended_at
      ? Math.round(
          (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
        )
      : null;
    const row = sessSheet.addRow({
      date: toYmd(s.started_at),
      name: s.program_workout?.name ?? "—",
      program: s.program_workout?.program?.name ?? "—",
      duration: durationMin,
      sets: agg?.count ?? 0,
      tonnage: agg ? Math.round(agg.tonnage) : 0,
      avgRpe: agg?.rpeCount ? +(agg.rpeSum / agg.rpeCount).toFixed(1) : null,
      notes: s.notes ?? "",
    });
    row.getCell("date").numFmt = dateFmt;
    row.getCell("tonnage").numFmt = weightFmt;
  }

  // --- Sheet 3: Sets --------------------------------------------------------
  const setsSheet = wb.addWorksheet("Sets");
  setsSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Exercise", key: "exercise", width: 30 },
    { header: "Muscle Group", key: "muscle", width: 16 },
    { header: "Set #", key: "setNum", width: 8 },
    { header: `Weight (${unit})`, key: "weight", width: 14 },
    { header: "Reps", key: "reps", width: 8 },
    { header: "RPE", key: "rpe", width: 8 },
    { header: `Tonnage (${unit})`, key: "tonnage", width: 14 },
    { header: `Est. 1RM (${unit})`, key: "e1rm", width: 14 },
  ];
  styleHeaderRow(setsSheet.getRow(1));
  setsSheet.views = [{ state: "frozen", ySplit: 1 }];

  // Sort: date desc, set_number asc
  const sortedSets = [...sets].sort((a, b) => {
    const da = sessionDateById.get(a.session_id) ?? a.created_at;
    const db = sessionDateById.get(b.session_id) ?? b.created_at;
    if (db !== da) return db < da ? -1 : 1;
    return a.set_number - b.set_number;
  });

  for (const s of sortedSets) {
    const dateIso = sessionDateById.get(s.session_id) ?? s.created_at;
    const w = s.weight_used ?? 0;
    const r = s.reps_completed ?? 0;
    const e1rm = r > 0 && w > 0 ? w * (1 + r / 30) : null;
    const row = setsSheet.addRow({
      date: toYmd(dateIso),
      exercise: s.exercise?.name ?? "(unknown)",
      muscle: s.exercise?.muscle_group?.name ?? "(unknown)",
      setNum: s.set_number,
      weight: s.weight_used,
      reps: s.reps_completed,
      rpe: s.rpe,
      tonnage: w * r,
      e1rm: e1rm != null ? +e1rm.toFixed(1) : null,
    });
    row.getCell("date").numFmt = dateFmt;
    row.getCell("weight").numFmt = weightFmt;
    row.getCell("tonnage").numFmt = weightFmt;
    row.getCell("e1rm").numFmt = weightFmt;

    // Conditional coloring on RPE cell
    if (s.rpe != null) {
      const rpeCell = row.getCell("rpe");
      if (s.rpe >= 8) {
        rpeCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEF4444" },
        };
        rpeCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      } else if (s.rpe >= 6) {
        rpeCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF59E0B" },
        };
        rpeCell.font = { color: { argb: "FF111827" }, bold: true };
      } else {
        rpeCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF10B981" },
        };
        rpeCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      }
    }
  }

  // --- Sheet 4: Personal Records -------------------------------------------
  const prSheet = wb.addWorksheet("Personal Records");
  prSheet.columns = [
    { header: "Exercise", key: "exercise", width: 30 },
    { header: "Muscle Group", key: "muscle", width: 16 },
    { header: `Max Weight (${unit})`, key: "weight", width: 16 },
    { header: "Reps at Max", key: "reps", width: 12 },
    { header: "Date", key: "date", width: 12 },
    { header: `Best Est. 1RM (${unit})`, key: "e1rm", width: 18 },
  ];
  styleHeaderRow(prSheet.getRow(1));
  prSheet.views = [{ state: "frozen", ySplit: 1 }];

  interface PR {
    exercise: string;
    muscle: string;
    weight: number;
    reps: number;
    date: string;
    e1rm: number;
  }
  const prByExercise = new Map<string, PR>();
  for (const s of sets) {
    if (s.weight_used == null || s.reps_completed == null || s.weight_used <= 0) continue;
    const name = s.exercise?.name ?? "(unknown)";
    const muscle = s.exercise?.muscle_group?.name ?? "(unknown)";
    const dateIso = sessionDateById.get(s.session_id) ?? s.created_at;
    const e1rm = s.weight_used * (1 + s.reps_completed / 30);
    const current = prByExercise.get(name);
    if (!current || s.weight_used > current.weight || (s.weight_used === current.weight && s.reps_completed > current.reps)) {
      prByExercise.set(name, {
        exercise: name,
        muscle,
        weight: s.weight_used,
        reps: s.reps_completed,
        date: toYmd(dateIso),
        e1rm: +e1rm.toFixed(1),
      });
    }
  }
  const prs = [...prByExercise.values()].sort((a, b) => b.e1rm - a.e1rm);
  for (const pr of prs) {
    const row = prSheet.addRow(pr);
    row.getCell("date").numFmt = dateFmt;
    row.getCell("weight").numFmt = weightFmt;
    row.getCell("e1rm").numFmt = weightFmt;
  }

  // --- Sheet 5: Body Metrics ------------------------------------------------
  const bodySheet = wb.addWorksheet("Body Metrics");
  bodySheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: `Weight (${unit})`, key: "weight", width: 14 },
    { header: "Fat %", key: "fatPct", width: 10 },
    { header: "Muscle %", key: "musclePct", width: 10 },
    { header: "Steps", key: "steps", width: 10 },
    { header: "Protein (g)", key: "protein", width: 12 },
    { header: "Carbs (g)", key: "carbs", width: 12 },
    { header: "Fat (g)", key: "fat", width: 12 },
    { header: "Calories", key: "calories", width: 12 },
  ];
  styleHeaderRow(bodySheet.getRow(1));
  bodySheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const b of bodyLogs) {
    const cal =
      (b.protein ?? 0) * 4 + (b.carbs ?? 0) * 4 + (b.fat ?? 0) * 9;
    const row = bodySheet.addRow({
      date: b.date,
      weight: b.weight,
      fatPct: b.fat_percentage,
      musclePct: b.muscle_percentage,
      steps: b.steps,
      protein: b.protein,
      carbs: b.carbs,
      fat: b.fat,
      calories: cal || null,
    });
    row.getCell("date").numFmt = dateFmt;
    row.getCell("weight").numFmt = weightFmt;
  }

  // --- Sheet 6: Volume by Muscle Group -------------------------------------
  const volSheet = wb.addWorksheet("Volume by Muscle Group");
  // Collect all muscle names
  const muscleNames = [...muscleCount.keys()].sort();
  volSheet.columns = [
    { header: "Week Starting (Mon)", key: "week", width: 20 },
    ...muscleNames.map((m) => ({ header: m, key: m, width: 14 })),
    { header: "Total", key: "__total", width: 14 },
  ];
  styleHeaderRow(volSheet.getRow(1));
  volSheet.views = [{ state: "frozen", ySplit: 1 }];

  // Last 12 weeks
  const last12: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    last12.push(d.toISOString().slice(0, 10));
  }

  // week -> muscle -> tonnage
  const weekMuscle = new Map<string, Map<string, number>>();
  for (const s of sets) {
    const dateIso = sessionDateById.get(s.session_id) ?? s.created_at;
    const wk = mondayOf(dateIso);
    if (!last12.includes(wk)) continue;
    const muscle = s.exercise?.muscle_group?.name ?? "(unknown)";
    const v = (s.weight_used ?? 0) * (s.reps_completed ?? 0);
    let m = weekMuscle.get(wk);
    if (!m) {
      m = new Map<string, number>();
      weekMuscle.set(wk, m);
    }
    m.set(muscle, (m.get(muscle) ?? 0) + v);
  }

  for (const wk of last12) {
    const rowObj: Record<string, string | number> = { week: wk };
    let total = 0;
    const m = weekMuscle.get(wk);
    for (const name of muscleNames) {
      const v = Math.round(m?.get(name) ?? 0);
      rowObj[name] = v;
      total += v;
    }
    rowObj["__total"] = total;
    const row = volSheet.addRow(rowObj);
    for (const name of muscleNames) {
      row.getCell(name).numFmt = weightFmt;
    }
    row.getCell("__total").numFmt = weightFmt;
    row.getCell("__total").font = { bold: true };
  }

  // ==========================================================================
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

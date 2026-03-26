"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Phase, PhaseSchedule, Program, ProgramWorkout } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { motion } from "framer-motion";
import { formatDateShort, getWeekNumber } from "@/lib/utils";
import { PHASE_DURATION_WEEKS } from "@/lib/constants";
import Link from "next/link";

export default function CalendarPage() {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [schedule, setSchedule] = useState<(PhaseSchedule & { program_workout: ProgramWorkout })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePhase, setShowCreatePhase] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [phaseName, setPhaseName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: phases } = await supabase
      .from("phases")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const activePhase = phases?.[0] || null;
    setPhase(activePhase);

    if (activePhase) {
      const { data: sched } = await supabase
        .from("phase_schedule")
        .select("*, program_workout:program_workouts(id, name, day_order)")
        .eq("phase_id", activePhase.id)
        .order("scheduled_date");
      setSchedule(sched || []);
    }

    // Load all accessible programs for phase creation
    const [{ data: pub }, { data: mine }] = await Promise.all([
      supabase.from("programs").select("*, program_workouts(id, name, day_order)").eq("is_public", true),
      supabase.from("programs").select("*, program_workouts(id, name, day_order)").eq("user_id", user.id),
    ]);
    setPrograms([...(pub || []), ...(mine || [])]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const weeks = useMemo(() => {
    if (!phase) return [];
    const weeksMap: Map<number, typeof schedule> = new Map();
    for (const entry of schedule) {
      const wk = getWeekNumber(phase.start_date, entry.scheduled_date);
      if (!weeksMap.has(wk)) weeksMap.set(wk, []);
      weeksMap.get(wk)!.push(entry);
    }
    return Array.from(weeksMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [phase, schedule]);

  const currentWeek = phase ? getWeekNumber(phase.start_date, new Date().toISOString().split("T")[0]) : 0;

  const handleCreatePhase = async () => {
    if (!selectedProgramId || !startDate || !phaseName.trim()) return;
    setCreating(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deactivate any existing active phases
    await supabase.from("phases").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + PHASE_DURATION_WEEKS * 7 - 1);

    const { data: newPhase } = await supabase
      .from("phases")
      .insert({
        user_id: user.id,
        name: phaseName.trim(),
        start_date: startDate,
        end_date: end.toISOString().split("T")[0],
        is_active: true,
      })
      .select()
      .single();

    if (!newPhase) { setCreating(false); return; }

    // Get the selected program's workouts
    const program = programs.find((p) => p.id === selectedProgramId);
    if (!program?.program_workouts?.length) { setCreating(false); return; }

    const sortedWorkouts = [...program.program_workouts].sort((a, b) => a.day_order - b.day_order);

    // Auto-populate schedule: rotate workouts across 8 weeks, rest days between
    const scheduleEntries: { phase_id: string; program_workout_id: string; scheduled_date: string; sort_order: number }[] = [];
    let workoutIndex = 0;
    const current = new Date(startDate);

    for (let week = 0; week < PHASE_DURATION_WEEKS; week++) {
      // 3-6 workout days per week depending on program size
      const daysPerWeek = Math.min(sortedWorkouts.length, 6);
      for (let day = 0; day < 7 && workoutIndex < PHASE_DURATION_WEEKS * daysPerWeek * 2; day++) {
        const dayOfWeek = current.getDay();
        // Skip Sundays as rest days
        if (dayOfWeek !== 0 && day < daysPerWeek) {
          const wo = sortedWorkouts[workoutIndex % sortedWorkouts.length];
          scheduleEntries.push({
            phase_id: newPhase.id,
            program_workout_id: wo.id,
            scheduled_date: current.toISOString().split("T")[0],
            sort_order: scheduleEntries.length,
          });
          workoutIndex++;
        }
        current.setDate(current.getDate() + 1);
      }
    }

    if (scheduleEntries.length > 0) {
      await supabase.from("phase_schedule").insert(scheduleEntries);
    }

    setShowCreatePhase(false);
    setCreating(false);
    await loadData();
  };

  const today = new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-card rounded-lg" />
          <div className="h-40 bg-card rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="px-4 pt-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Calendar</h1>
        <div className="rounded-2xl bg-card border border-border p-8">
          <p className="text-subtext text-sm mb-4">No active phase. Create one to start your training cycle.</p>
          <Button onClick={() => setShowCreatePhase(true)}>Create Phase</Button>
        </div>

        <Modal isOpen={showCreatePhase} onClose={() => setShowCreatePhase(false)} title="Create 8-Week Phase">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-subtext mb-1 block">Phase Name *</label>
              <Input placeholder="e.g., Strength Block 1" value={phaseName} onChange={(e) => setPhaseName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-subtext mb-1 block">Program *</label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
              >
                <option value="">Select a program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.is_public ? "(Official)" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-subtext mb-1 block">Start Date *</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <Button size="lg" className="w-full" disabled={creating || !selectedProgramId || !startDate || !phaseName.trim()} onClick={handleCreatePhase}>
              {creating ? "Creating..." : "Create Phase"}
            </Button>
          </div>
        </Modal>
      </div>
    );
  }

  const isDeloadWeek = currentWeek > PHASE_DURATION_WEEKS;

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <Badge variant={isDeloadWeek ? "warning" : "primary"}>
          {isDeloadWeek ? "Deload Week" : `Week ${currentWeek} of ${PHASE_DURATION_WEEKS}`}
        </Badge>
      </div>
      <p className="text-sm text-subtext mb-5">{phase.name}</p>

      {isDeloadWeek && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-warning/10 border border-warning/20 p-4 mb-5"
        >
          <p className="text-warning text-sm font-medium">Time for a deload week!</p>
          <p className="text-warning/70 text-xs mt-1">Reduce intensity this week before starting your next phase.</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setShowCreatePhase(true)}>
            Start New Phase
          </Button>
        </motion.div>
      )}

      {/* Week-by-week view */}
      <div className="space-y-4">
        {weeks.map(([weekNum, entries]) => (
          <div key={weekNum}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-subtext">Week {weekNum}</h3>
              {weekNum === currentWeek && <Badge variant="success">Current</Badge>}
            </div>
            <div className="space-y-2">
              {entries.map((entry) => {
                const isToday = entry.scheduled_date === today;
                const isPast = entry.scheduled_date < today;
                return (
                  <Link key={entry.id} href={`/session/start?schedule=${entry.id}&workout=${entry.program_workout_id}&date=${entry.scheduled_date}`}>
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        isToday
                          ? "bg-primary/10 border-primary/30"
                          : isPast
                          ? "bg-surface border-border opacity-60"
                          : "bg-card border-border"
                      }`}
                    >
                      <div className="text-center min-w-[44px]">
                        <p className="text-xs text-subtext">{new Date(entry.scheduled_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}</p>
                        <p className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                          {new Date(entry.scheduled_date + "T12:00:00").getDate()}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {entry.program_workout?.name}
                        </p>
                        <p className="text-xs text-subtext">
                          {formatDateShort(entry.scheduled_date + "T12:00:00")}
                        </p>
                      </div>
                      {isToday && (
                        <Badge variant="primary">Today</Badge>
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showCreatePhase} onClose={() => setShowCreatePhase(false)} title="Create New Phase">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-subtext mb-1 block">Phase Name *</label>
            <Input placeholder="e.g., Strength Block 2" value={phaseName} onChange={(e) => setPhaseName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-subtext mb-1 block">Program *</label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="">Select a program</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.is_public ? "(Official)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-subtext mb-1 block">Start Date *</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <Button size="lg" className="w-full" disabled={creating || !selectedProgramId || !startDate || !phaseName.trim()} onClick={handleCreatePhase}>
            {creating ? "Creating..." : "Create Phase"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

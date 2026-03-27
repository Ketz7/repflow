"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type WeightUnit = "kg" | "lbs";

interface WeightUnitContextType {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
  formatWeight: (kg: number) => string;
  unitLabel: string;
}

const KG_TO_LBS = 2.20462;

const WeightUnitContext = createContext<WeightUnitContextType>({
  unit: "kg",
  setUnit: () => {},
  formatWeight: (kg) => kg.toLocaleString(),
  unitLabel: "kg",
});

export function WeightUnitProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnitState] = useState<WeightUnit>("kg");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("weight_unit")
        .eq("id", user.id)
        .single();

      if (data?.weight_unit) {
        setUnitState(data.weight_unit as WeightUnit);
      }
    }
    load();
  }, []);

  const setUnit = useCallback(async (newUnit: WeightUnit) => {
    setUnitState(newUnit);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("users").update({ weight_unit: newUnit }).eq("id", user.id);
    }
  }, []);

  const formatWeight = useCallback((value: number) => {
    if (unit === "lbs") {
      return (value * KG_TO_LBS).toFixed(1);
    }
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  }, [unit]);

  return (
    <WeightUnitContext.Provider value={{ unit, setUnit, formatWeight, unitLabel: unit }}>
      {children}
    </WeightUnitContext.Provider>
  );
}

export function useWeightUnit() {
  return useContext(WeightUnitContext);
}

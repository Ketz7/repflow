"use client";

const KG_TO_LBS = 2.20462;

interface AutoregHintProps {
  last: {
    weight: number | null;
    reps: number;
    rpe: number | null;
    date: string;
  } | null;
  suggested: {
    weight: number | null;
    reps: number;
    rpe: number;
  } | null;
  unit: "kg" | "lbs";
}

function formatWeight(weightKg: number | null, unit: "kg" | "lbs"): string | null {
  if (weightKg == null) return null;
  if (unit === "lbs") {
    const lbs = weightKg * KG_TO_LBS;
    return `${Math.round(lbs / 5) * 5} lbs`;
  }
  // Analytics already rounds to 2.5kg increments; preserve that.
  const rounded = Math.round(weightKg * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} kg`;
}

export default function AutoregHint({ last, suggested, unit }: AutoregHintProps) {
  if (!last) return null;

  const lastWeight = formatWeight(last.weight, unit);
  const suggestedWeight = suggested ? formatWeight(suggested.weight, unit) : null;

  return (
    <div className="text-xs text-subtext mb-2 leading-relaxed">
      <span className="mr-1" aria-hidden="true">💡</span>
      Last:{" "}
      <span className="text-foreground font-medium">
        {lastWeight ? `${lastWeight} × ${last.reps}` : `BW × ${last.reps}`}
        {last.rpe != null ? ` @ RPE ${last.rpe}` : ""}
      </span>
      {suggested && suggestedWeight && (
        <>
          {" "}— Try{" "}
          <span className="text-foreground font-medium">
            {suggestedWeight} × {suggested.reps} @ RPE {suggested.rpe}
          </span>
        </>
      )}
    </div>
  );
}

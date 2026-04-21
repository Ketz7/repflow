"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface ExportDataButtonProps {
  userId: string;
}

export default function ExportDataButton({ userId }: ExportDataButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setStatus("idle");
    setErrorMsg(null);
    try {
      const { exportUserDataToXlsx } = await import("@/lib/excel-export");
      const blob = await exportUserDataToXlsx(userId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `repflow-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("[export] failed", err);
      setErrorMsg(err instanceof Error ? err.message : "Export failed");
      setStatus("error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-foreground mb-1">Data Export</h3>
      <p className="text-xs text-subtext mb-3">
        Download all your training history, body metrics, and personal records as a formatted Excel workbook.
      </p>
      <Button
        variant="secondary"
        size="md"
        className="w-full"
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting
          ? "Preparing your workbook…"
          : status === "success"
            ? "✓ Downloaded"
            : "Download workout data (.xlsx)"}
      </Button>
      {status === "error" && (
        <p className="text-xs text-error mt-2">
          Export failed{errorMsg ? `: ${errorMsg}` : ""}. Please try again.
        </p>
      )}
    </div>
  );
}

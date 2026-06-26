"use client";

import { useRef, useState } from "react";
import { Upload, CheckCircle2, AlertTriangle, Siren } from "lucide-react";

interface Props {
  onUploadSuccess?: (rowCount: number) => void;
  rowCount?: number | null;
}

export function IntercorrenciaUpload({ onUploadSuccess, rowCount }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMsg("Apenas arquivos .csv são aceitos.");
      setState("error");
      return;
    }

    setState("uploading");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-intercorrencias", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Erro ao enviar o arquivo.");
        setState("error");
        return;
      }
      setState("success");
      onUploadSuccess?.(json.rowCount ?? 0);
    } catch {
      setErrorMsg("Erro de rede ao enviar o arquivo.");
      setState("error");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  const isLoaded = state === "success" || (rowCount != null && rowCount > 0);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        title="Importar planilha de intercorrências"
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isLoaded
            ? "border-orange-700 bg-orange-900/30 text-orange-300 hover:bg-orange-900/50"
            : state === "error"
              ? "border-red-700 bg-red-900/20 text-red-300 hover:bg-red-900/40"
              : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
        }`}
      >
        {state === "uploading" ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-slate-200" />
        ) : isLoaded ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : state === "error" ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          <Siren className="h-3.5 w-3.5" />
        )}
        {state === "uploading"
          ? "Importando…"
          : isLoaded && rowCount != null
            ? `Intercorrências (${rowCount})`
            : isLoaded
              ? "Intercorrências ✓"
              : "Importar Intercorrências"}
      </button>

      {state === "error" && (
        <span
          className="text-[11px] text-red-400 max-w-[200px] truncate"
          title={errorMsg}
        >
          {errorMsg}
        </span>
      )}
    </div>
  );
}

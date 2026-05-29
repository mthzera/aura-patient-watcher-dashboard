"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface UploadResult {
  filename: string;
  rowCount: number;
}

interface Props {
  onUploadSuccess: (result: UploadResult) => void;
  compact?: boolean;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export function UploadPrompt({ onUploadSuccess, compact = false }: Props) {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successInfo, setSuccessInfo] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMsg("Apenas arquivos .csv são aceitos.");
      setState("error");
      return;
    }

    setState("uploading");
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error ?? "Erro ao enviar arquivo.");
        setState("error");
        return;
      }

      const result: UploadResult = {
        filename: json.filename,
        rowCount: json.rowCount,
      };
      setSuccessInfo(result);
      setState("success");
      onUploadSuccess(result);
    } catch {
      setErrorMsg("Erro de rede ao enviar o arquivo.");
      setState("error");
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    setState("dragging");
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    if (state === "dragging") setState("idle");
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function retry() {
    setState("idle");
    setErrorMsg("");
    setSuccessInfo(null);
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onInputChange}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={state === "uploading"}
          className="flex items-center gap-1.5 rounded-md border border-teal-700 bg-teal-900/40 px-4 py-1.5 text-xs font-medium text-teal-300 transition hover:bg-teal-800/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "uploading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {state === "uploading" ? "Enviando…" : "Upload CSV"}
        </button>
        {state === "error" && (
          <span className="text-xs text-red-400">{errorMsg}</span>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-7 w-1 rounded-full bg-teal-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Dashboard AURA Patient Watcher
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Efetividade na gestão de casos clínicos
          </p>
        </div>

        {/* Upload card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
          {state === "success" && successInfo ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-teal-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  Arquivo carregado com sucesso!
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  <span className="text-slate-300">{successInfo.filename}</span>
                  {" — "}
                  <span className="text-teal-400 font-medium">
                    {successInfo.rowCount.toLocaleString("pt-BR")} registros
                  </span>
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Carregando o dashboard…
              </p>
            </div>
          ) : state === "error" ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-red-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  Falha no upload
                </p>
                <p className="text-sm text-red-300 mt-1">{errorMsg}</p>
              </div>
              <button
                onClick={retry}
                className="rounded-lg bg-slate-800 border border-slate-600 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-300 text-center mb-6">
                Importe o arquivo CSV da planilha para iniciar a análise. O
                arquivo deve estar em{" "}
                <span className="text-teal-400 font-medium">UTF-8</span> e
                conter os cabeçalhos corretos.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => state !== "uploading" && inputRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
                  state === "dragging"
                    ? "border-teal-400 bg-teal-950/30"
                    : state === "uploading"
                    ? "border-slate-600 bg-slate-800/40 cursor-not-allowed"
                    : "border-slate-600 bg-slate-800/20 hover:border-teal-700 hover:bg-slate-800/40"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={onInputChange}
                />
                <div className="flex flex-col items-center gap-3">
                  {state === "uploading" ? (
                    <Loader2 className="h-10 w-10 text-teal-400 animate-spin" />
                  ) : (
                    <div className="rounded-full bg-slate-800 p-3">
                      <FileText className="h-8 w-8 text-teal-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {state === "uploading"
                        ? "Enviando e validando…"
                        : state === "dragging"
                        ? "Solte o arquivo aqui"
                        : "Arraste o arquivo aqui ou clique para selecionar"}
                    </p>
                    {state !== "uploading" && (
                      <p className="text-xs text-slate-500 mt-1">
                        Somente arquivos .csv · UTF-8
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Format hint */}
              <div className="mt-5 rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-3">
                <p className="text-xs font-semibold text-slate-400 mb-1.5">
                  Colunas esperadas no CSV:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "data",
                    "unidade",
                    "alteracao_clinica",
                    "alertado_aura",
                    "atuacao_da_unidade",
                    "desfecho_clinico",
                  ].map((col) => (
                    <span
                      key={col}
                      className="rounded bg-slate-700 px-2 py-0.5 text-xs font-mono text-teal-300"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

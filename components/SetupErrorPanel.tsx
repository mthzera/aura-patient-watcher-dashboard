"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";

interface Props {
  error: string;
  isSetupError: boolean;
}

export function SetupErrorPanel({ error, isSetupError }: Props) {
  return (
    <div className="mx-auto max-w-2xl mt-16 px-4">
      <div className="rounded-xl border border-red-800 bg-red-950/40 p-8">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 shrink-0 text-red-400 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-red-300 mb-2">
              {isSetupError
                ? "Configuração necessária"
                : "Erro ao carregar dados"}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {error}
            </p>

            {isSetupError && (
              <>
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  Modo local (sem Graph API):
                </h3>
                <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-4">
                  <p className="text-xs font-mono text-slate-400 whitespace-pre-line">{`# .env.local
EXCEL_STRATEGY=local
LOCAL_EXCEL_PATH=C:\\caminho\\para\\sua-planilha.xlsx`}</p>
                </div>

                <h3 className="text-sm font-semibold text-slate-200 mb-2 mt-4">
                  Modo OneDrive/SharePoint (Microsoft Graph):
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-400">
                  <li>
                    Crie um App Registration no{" "}
                    <a
                      href="https://portal.azure.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline inline-flex items-center gap-0.5"
                    >
                      Azure Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    Adicione permissões: <code className="text-teal-300">Files.Read.All</code>{" "}
                    ou <code className="text-teal-300">Sites.Read.All</code>
                  </li>
                  <li>Conceda consentimento de administrador</li>
                  <li>
                    Copie <code className="text-teal-300">.env.example</code> para{" "}
                    <code className="text-teal-300">.env.local</code> e preencha as variáveis
                  </li>
                  <li>
                    Consulte o <code className="text-teal-300">README.md</code> para instruções detalhadas
                  </li>
                </ol>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

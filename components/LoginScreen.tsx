"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { LogIn, ShieldCheck, Activity } from "lucide-react";

export function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    await signIn("azure-ad", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="h-8 w-8 text-teal-400" />
            <span className="text-2xl font-bold text-white">AURA</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">
            Dashboard Patient Watcher
          </h1>
          <p className="text-sm text-slate-400">
            Efetividade na gestão de casos clínicos
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Do alerta ao desfecho assistencial
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8">
          <div className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-slate-800/60 border border-slate-700">
            <ShieldCheck className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-200">
                Acesso restrito
              </p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Use sua conta Microsoft organizacional para acessar os dados
                clínicos do SharePoint.
              </p>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 text-white font-semibold text-sm transition"
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                {/* Microsoft "M" logo */}
                <svg
                  viewBox="0 0 21 21"
                  className="h-5 w-5 shrink-0"
                  aria-hidden="true"
                >
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Entrar com Microsoft
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-600 mt-5">
            Rede Altana Premium Care · Dados protegidos pelo Microsoft Entra ID
          </p>
        </div>
      </div>
    </div>
  );
}

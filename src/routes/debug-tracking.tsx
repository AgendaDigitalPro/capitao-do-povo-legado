import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { testarRastreamento } from "@/lib/debug-utmify.functions";
import { getSessionId, getUtms } from "@/lib/sessao";
import { useState } from "react";

export const Route = createFileRoute("/debug-tracking")({
  component: DebugTracking,
});

function DebugTracking() {
  const testar = useServerFn(testarRastreamento);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const res = await testar({
        data: {
          sessionId: getSessionId(),
          email: "debug-rastreamento@teste.com",
          utms: getUtms()
        }
      });
      setResult(res);
    } catch (e: any) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-white font-mono">
      <h1 className="text-2xl font-bold mb-4">Debug Tracking UTMify</h1>
      <div className="mb-4 space-y-2 text-sm text-slate-400">
        <p>Session ID: {getSessionId()}</p>
        <p>UTMs LocalStorage: {JSON.stringify(getUtms())}</p>
      </div>
      <button 
        onClick={runTest}
        disabled={loading}
        className="bg-red-600 px-6 py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? "Testando..." : "Simular Venda Completa"}
      </button>

      {result && (
        <pre className="mt-8 p-4 bg-black rounded border border-slate-700 overflow-auto max-h-[600px]">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

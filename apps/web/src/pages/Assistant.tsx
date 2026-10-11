
import { useState, type FormEvent } from "react";
import { api } from "../api";

type Recommendation = {
  requestId: string;
  reason: string;
  evidenceFields: string[];
};

type Summary = {
  source: string;
  summary: string;
  recommendations: Recommendation[];
};

export default function Assistant() {
  const [ids, setIds] = useState("");
  const [result, setResult] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  async function generate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);

    try {
      const requestIds = ids
        .split(/[\n,;]/)
        .map(id => id.trim())
        .filter(Boolean);

      const summary = await api<Summary>("/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ requestIds })
      });

      setResult(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el resumen");
    }
  }

  return (
    <section>
      <h1>Asistente de IA</h1>
      <p>
        Introduce los identificadores de solicitudes ENVIADA de tu organización.
        El resultado es una ayuda para la revisión, no una decisión automática.
      </p>

      <form className="form-card" onSubmit={generate}>
        <label htmlFor="ids">IDs de solicitudes (separados por coma o salto de línea)</label>
        <textarea
          id="ids"
          value={ids}
          onChange={e => setIds(e.target.value)}
          rows={5}
          required
        />
        <button type="submit">Generar resumen</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <article className="summary-card">
          <p><strong>Origen:</strong> {result.source}</p>
          <p><strong>Borrador de resumen:</strong> {result.summary}</p>
          <h2>Recomendaciones</h2>

          {result.recommendations.map(item => (
            <div key={item.requestId} className="recommendation">
              <p><strong>Solicitud:</strong> {item.requestId}</p>
              <p>{item.reason}</p>
              <p><strong>Campos:</strong> {item.evidenceFields.join(", ")}</p>
            </div>
          ))}

          <p className="notice">
            Verifica los datos originales antes de actuar. Este resumen no reserva
            existencias ni cambia el estado de las solicitudes.
          </p>
        </article>
      )}
    </section>
  );
}

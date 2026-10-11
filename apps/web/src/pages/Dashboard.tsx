
import { useEffect, useState } from "react";
import { api } from "../api";

type RequestRow = {
  id: string;
  code: string;
  zone: string;
  priority: string;
  status: string;
  requiredDate: string;
};

export default function Dashboard() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: RequestRow[] }>("/requests?limit=100")
      .then(result => setRequests(result.data))
      .catch(e => setError(e.message));
  }, []);

  const statuses = [
    "BORRADOR",
    "ENVIADA",
    "RESERVADA",
    "DESPACHADA",
    "ENTREGADA",
    "CANCELADA"
  ];

  return (
    <section>
      <h1>Panel principal</h1>
      <p>Resumen de solicitudes de tu organización.</p>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats-grid">
        {statuses.map(status => (
          <article className="stat-card" key={status}>
            <span>{status}</span>
            <strong>{requests.filter(r => r.status === status).length}</strong>
          </article>
        ))}
      </div>

      <h2>Solicitudes recientes</h2>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Zona</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Fecha requerida</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(request => (
              <tr key={request.id}>
                <td>{request.code}</td>
                <td>{request.zone}</td>
                <td>{request.priority}</td>
                <td>{request.status}</td>
                <td>{new Date(request.requiredDate).toLocaleDateString()}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5}>No hay solicitudes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

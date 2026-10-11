
import { useEffect, useState } from "react";
import { api } from "../api";

type Event = {
  id: string;
  action: string;
  correlationId: string;
  createdAt: string;
  user: { email: string; role: string };
};

export default function Audit() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ data: Event[] }>("/audit?limit=100")
      .then(result => setEvents(result.data))
      .catch(e => setError(e.message));
  }, []);

  return (
    <section>
      <h1>Auditoría</h1>
      <p>Historial de operaciones de tu organización.</p>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Fecha UTC</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Correlation ID</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.id}>
                <td>{new Date(event.createdAt).toISOString()}</td>
                <td>{event.user.email}</td>
                <td>{event.action}</td>
                <td>{event.correlationId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

type SKU = {
  skuId: string;
  code: string;
  name: string;
  available: number;
};

type RequestRow = {
  id: string;
  code: string;
  zone: string;
  status: string;
  priority: string;
};

export default function Requests() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [zone, setZone] = useState("");
  const [skuId, setSkuId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [requiredDate, setRequiredDate] = useState("");
  const [observations, setObservations] = useState("");
  const [message, setMessage] = useState("");

  const isRequester = user?.role === "SOLICITANTE";

  async function refresh() {
    const result = await api<{ data: RequestRow[] }>("/requests?limit=100");
    setRows(result.data);
  }

  useEffect(() => {
    refresh().catch(e => setMessage(e.message));

    if (user?.role !== "SOLICITANTE") {
      api<SKU[]>("/inventory")
        .then(setSkus)
        .catch(e => setMessage(e.message));
    } else {
      // Los solicitantes pueden necesitar consultar el catálogo activo.
      // Este endpoint debe implementarse sin exponer datos de otra organización.
      api<SKU[]>("/catalog/skus")
        .then(setSkus)
        .catch(() => setSkus([]));
    }
  }, [user?.role]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      const result = await api<RequestRow>("/requests", {
        method: "POST",
        body: JSON.stringify({
          zone,
          priority: "NORMAL",
          requiredDate: new Date(requiredDate).toISOString(),
          observations,
          items: [{ skuId, quantity }]
        })
      });

      setMessage(`Borrador ${result.code} creado.`);
      setZone("");
      setObservations("");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    }
  }

  async function action(id: string, operation: "submit" | "cancel") {
    try {
      await api(`/requests/${id}/${operation}`, { method: "POST" });
      setMessage(operation === "submit" ? "Solicitud enviada." : "Solicitud cancelada.");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <section>
      <h1>Solicitudes</h1>
      {message && <p role="status">{message}</p>}

      {isRequester && (
        <form className="form-card" onSubmit={create}>
          <h2>Nueva solicitud</h2>

          <label htmlFor="zone">Zona</label>
          <input id="zone" value={zone} onChange={e => setZone(e.target.value)} required />

          <label htmlFor="date">Fecha requerida</label>
          <input
            id="date"
            type="datetime-local"
            value={requiredDate}
            onChange={e => setRequiredDate(e.target.value)}
            required
          />

          <label htmlFor="sku">Producto</label>
          <select id="sku" value={skuId} onChange={e => setSkuId(e.target.value)} required>
            <option value="">Selecciona un producto</option>
            {skus.map(sku => (
              <option key={sku.skuId} value={sku.skuId}>
                {sku.code} — {sku.name}
              </option>
            ))}
          </select>

          <label htmlFor="quantity">Cantidad</label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
            required
          />

          <label htmlFor="observations">Observaciones</label>
          <textarea
            id="observations"
            maxLength={2000}
            value={observations}
            onChange={e => setObservations(e.target.value)}
          />

          <button type="submit" disabled={!skuId}>Guardar borrador</button>
        </form>
      )}

      <div className="request-list">
        {rows.map(row => (
          <article className="request-card" key={row.id}>
            <h3>{row.code}</h3>
            <p>Zona: {row.zone}</p>
            <p>Prioridad: {row.priority} · Estado: {row.status}</p>

            {isRequester && row.status === "BORRADOR" && (
              <button onClick={() => action(row.id, "submit")}>Enviar</button>
            )}

            {isRequester && ["ENVIADA", "RESERVADA"].includes(row.status) && (
              <button className="secondary" onClick={() => action(row.id, "cancel")}>
                Cancelar
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

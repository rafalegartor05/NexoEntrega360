
import { useEffect, useState } from "react";
import { api } from "../api";

type Item = {
  skuId: string;
  code: string;
  name: string;
  physicalStock: number;
  reservedStock: number;
  available: number;
};

export default function Inventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Item[]>("/inventory")
      .then(setItems)
      .catch(e => setError(e.message));
  }, []);

  return (
    <section>
      <h1>Inventario</h1>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Existencias</th>
              <th>Reservado</th>
              <th>Disponible</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.skuId}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.physicalStock}</td>
                <td>{item.reservedStock}</td>
                <td>{item.available}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

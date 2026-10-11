
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function exit() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>NexoEntrega</h2>
        <p className="role-label">{user?.role}</p>

        <nav aria-label="Navegación principal">
          <NavLink to="/">Panel</NavLink>
          <NavLink to="/requests">Solicitudes</NavLink>

          {user?.role !== "SOLICITANTE" && (
            <NavLink to="/inventory">Inventario</NavLink>
          )}

          {user?.role !== "SOLICITANTE" && (
            <NavLink to="/audit">Auditoría</NavLink>
          )}

          {user?.role === "COORDINADOR" && (
            <NavLink to="/assistant">Asistente IA</NavLink>
          )}
        </nav>

        <button className="logout-button" onClick={exit}>
          Cerrar sesión
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>{user?.email}</span>
          <span>Organización: {user?.organizationId}</span>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

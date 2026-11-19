import { Link } from "react-router";
export function NotFound() {
  return (
    <div className="page not-found">
      <strong>404</strong>
      <h1>Page not found</h1>
      <p>The requested MachineMitra screen does not exist.</p>
      <Link className="btn primary" to="/overview">
        Return to Overview
      </Link>
    </div>
  );
}

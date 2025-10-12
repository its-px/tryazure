// src/components/ProtectedRoute.tsx

import { Navigate } from "react-router-dom";
import type { Role } from "../../App";

interface ProtectedRouteProps {
  children: React.ReactElement;
  session: any;
  role: Role | null;
  allowedRoles: Role[];
  loading: boolean;
}

export default function ProtectedRoute({ children, session, role, allowedRoles, loading }: ProtectedRouteProps) {
  if (loading) return <div>Loading...</div>;

  if (!session) {
    return <Navigate to="/" replace />; // redirect to home/login
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return children;
}

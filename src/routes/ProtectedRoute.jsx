import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <Navigate to="/" replace />;

  if (!user) return <Navigate to="/auth" replace />;

  if (user && !profile?.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onLogout }) {
  const { profile } = useAuth();

  const email = profile?.email || "";
  const firstLetter = email.charAt(0).toUpperCase();

  return (
    <nav className="new-nav">

      {/* LEFT */}
     <Link style={{ fontSize: "20px", fontWeight: "bold" }} to="/dashboard">
        Job Assistant
      </Link>

      {/* RIGHT */}
      <div className="right-nav">

        {/* Avatar */}
        <div className="avatar">
          {firstLetter}
        </div>

        {/* Logout */}
      <button className="nav-pill" onClick={onLogout} type="button"> Logout </button>

      </div>
    </nav>
  );
}
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onLogout }) {
  const { profile } = useAuth();

  const email = profile?.email || "";
  const firstLetter = email.charAt(0).toUpperCase();

  return (
    <nav className="new-nav">

      {/* LEFT */}
      
     <Link style={{ fontSize: "20px", fontWeight: "bold" , display: "flex", alignItems: "center",gap: "8px"}} to="/dashboard">
     <img src="/logo.png" alt="Hirix Logo" className="nav-logo" />
        Hirix
      </Link>

      {/* RIGHT */}
      <div className="right-nav">

        <div
  className="avatar"
  style={{
    background: firstLetter
      ? "linear-gradient(to right, #a855f7, #22d3ee)"
      : "none",
  }}
>
  {firstLetter}
</div>
        {/* Logout */}
      <button className="nav-pill" onClick={onLogout} type="button"> Logout </button>

      </div>
    </nav>
  );
}
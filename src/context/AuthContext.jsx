import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (uid = auth.currentUser?.uid) => {
    if (!uid) {
      setProfile(null);
      return null;
    }

    const snap = await getDoc(doc(db, "users", uid));
    const nextProfile = snap.exists() ? snap.data() : null;
    setProfile(nextProfile);
    return nextProfile;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        await refreshProfile(nextUser.uid);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile }),
    [user, profile, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "../firebase";
import { useAuth } from "../context/AuthContext";

const coldReachUrl = import.meta.env.VITE_COLDREACH_URL || "https://automatecoldemail.netlify.app/";
const firebaseEmailRedirectUrl = import.meta.env.VITE_FIREBASE_EMAIL_REDIRECT_URL;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(location.pathname === "/auth");

  const emailActionSettings = firebaseEmailRedirectUrl
    ? {
        url: firebaseEmailRedirectUrl,
        handleCodeInApp: false,
      }
    : undefined;

  useEffect(() => {
    if (!user) {
      return;
    }

    if (profile?.onboardingCompleted) {
      navigate("/dashboard", { replace: true });
      return;
    }

    navigate("/onboarding", { replace: true });
  }, [navigate, profile, user]);

  useEffect(() => {
    setShowAuthModal(location.pathname === "/auth");
  }, [location.pathname]);

  const openAuthModal = (loginMode = true) => {
    setIsLogin(loginMode);
    setError("");
    setNotice("");
    if (!loginMode) {
      setPendingVerificationEmail("");
    }
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setError("");
    setNotice("");
    setPendingVerificationEmail("");
    setShowAuthModal(false);
    if (location.pathname === "/auth") {
      navigate("/", { replace: true });
    }
  };

  const handleTopRightAction = async () => {
    if (!user) {
      openAuthModal(true);
      return;
    }

    await signOut(auth);
    setPendingVerificationEmail("");
    setShowAuthModal(false);
    navigate("/", { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setNotice("");

      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (!result.user.emailVerified) {
          await signOut(auth);
          setNotice("Verify your email first. We can resend the verification message if needed.");
          setError("Your email is not verified yet.");
          return;
        }

        const snap = await getDoc(doc(db, "users", result.user.uid));

        if (!snap.exists() || !snap.data().onboardingCompleted) {
          navigate("/onboarding");
        } else {
          await refreshProfile(result.user.uid);
          navigate("/dashboard");
        }
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", result.user.uid), {
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
        email,
      });
      if (emailActionSettings) {
        await sendEmailVerification(result.user, emailActionSettings);
      } else {
        await sendEmailVerification(result.user);
      }
      await signOut(auth);
      setPendingVerificationEmail(email.trim());
      setNotice("Verification email sent. Use the Firebase email template link, verify your address, then log in.");
      setIsLogin(true);
      setPassword("");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogle = async () => {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      googleProvider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", result.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          onboardingCompleted: false,
          createdAt: serverTimestamp(),
          email: result.user.email,
          authProvider: GoogleAuthProvider.PROVIDER_ID,
          displayName: result.user.displayName || "",
        });
      }

      await refreshProfile(result.user.uid);
      setPendingVerificationEmail("");

      if (!snap.exists() || !snap.data().onboardingCompleted) {
        navigate("/onboarding");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email first, then use Forgot password.");
      setNotice("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setNotice("");
      if (emailActionSettings) {
        await sendPasswordResetEmail(auth, email.trim(), emailActionSettings);
      } else {
        await sendPasswordResetEmail(auth, email.trim());
      }
      setNotice("Password reset email sent. Firebase will use your configured reset template.");
    } catch (err) {
      setError(err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user.emailVerified) {
        setNotice("This email is already verified. You can log in normally.");
        setPendingVerificationEmail("");
        return;
      }

      if (emailActionSettings) {
        await sendEmailVerification(result.user, emailActionSettings);
      } else {
        await sendEmailVerification(result.user);
      }
      setNotice("Verification email resent. Check your inbox and spam folder.");
      await signOut(auth);
    } catch (err) {
      setError(err.message || "Unable to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <header className="auth-topbar">
        <Link className="brand-lockup" to="/">
          <span className="brand-kicker">AI Job Match</span>
          <strong><img src="/logo.png" alt="Hirix Logo" className="nav-logo" />Hirix</strong>
        </Link>
        <div className="auth-topbar-actions">
          <button
            className="nav-pill is-active"
            onClick={handleTopRightAction}
            type="button"
          >
            {user ? "Logout" : "Login / Signup"}
          </button>
        </div>
      </header>

      <section className="hero-panel">
        <div className="hero-grid">
          <div className="hero-copy-column">
            <p className="eyebrow">AI Job Match</p>
            <h1>Land better-fit roles with a calmer, smarter dashboard.</h1>
            <p className="hero-copy">
              AI-personalized job matches ranked for you. Find the best roles from Adzuna, Jooble,
              and JSearch, all in one streamlined place.
            </p>

            <div className="hero-primary-action">
              <button className="primary-button hero-start-button" onClick={() => openAuthModal(true)} type="button">
                Get Started
              </button>
              <a className="ghost-button hero-secondary-button" href="#feature-grid">
                Explore features
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <article className="ghost-job-card ghost-search">
              <strong>Search</strong>
              <span className="ghost-line" />
              <span className="ghost-line ghost-line-short" />
            </article>
            <article className="ghost-job-card ghost-zohno">
              <span className="ghost-mini-label">TRACES ID</span>
              <strong>Jonnf Mgmt</strong>
            </article>
            <article className="ghost-job-card ghost-jooble">
              <strong>jooble</strong>
            </article>
            <article className="ghost-job-card ghost-adzuna">
              <strong>adzuna</strong>
              <span className="ghost-line" />
              <span className="ghost-line ghost-line-short" />
            </article>
            <article className="ghost-job-card ghost-twitter">
              <strong>Search</strong>
            </article>
             <article className="ghost-job-card ghost-jooble">
              <strong>jooble</strong>
            </article>

            <article className="hero-job-card">
              <div className="hero-job-card-top">
                <strong>Paytm</strong>
                <span className="match-badge">66% Match</span>
              </div>
              <h3>Full Stack Java Developer</h3>
              <p>Paytm</p>
              <p>Bangalore, India</p>
              <div className="hero-tag-row">
                <span>Java</span>
                <span>Spring</span>
                <span>Remote</span>
              </div>
              <div className="hero-job-card-bottom">
                <strong>₹ 10,00,000 / year</strong>
                <button className="hero-apply-button" type="button">Apply Now</button>
              </div>
            </article>
            
          </div>
        </div>

        <div className="feature-grid" id="feature-grid">
          <article>
            <strong>Fresh role coverage</strong>
            <span>Discover daily job matches pulled from Adzuna, Jooble, JSearch and more.</span>
          </article>
          <article>
            <strong>Skill gap clarity</strong>
            <span>See skill gaps vs jobs you want, so you can level up fast.</span>
          </article>
          <article>
            <strong>Track every move</strong>
            <span>Log applications in one place, then stay on top of your search.</span>
          </article>
        </div>

        <div className="hero-benefits">
          <h2>Your job hunt with benefits.</h2>
          <p className="hero-copy">
            Stop juggling tabs. Let smart AI mapping bring opportunity to you, then track it from one powerful dashboard.
          </p>
        </div>

        <div className="hero-band">
          <div>
            <span>Live Matches</span>
            <strong>Daily refreshed roles</strong>
          </div>
          <div>
            <span>Skill Mapping</span>
            <strong>Profile-aware relevance</strong>
          </div>
          <div>
            <span>Application Progress</span>
            <strong>Integrated tracking</strong>
          </div>
        </div>

        <div className="coldreach-panel">
          <div>
            <p className="eyebrow">About ColdReach</p>
            <p className="hero-copy">
              Use Job Assistant to find aligned roles and sharpen your profile, then move into ColdReach
              when you want structured outreach, prospect tracking, and campaign-style follow-through.
              <h4>ColdReach helps you run outbound outreach when you are ready to go beyond job discovery.</h4>
            </p>
             
          </div>
          <a className="ghost-button hero-strip-actions" href={coldReachUrl} target="_blank" rel="noreferrer">
            Open ColdReach
          </a>
        </div>
      </section>

      {showAuthModal ? (
        <div className="auth-modal-backdrop" onClick={closeAuthModal} role="presentation">
          <section
            className="auth-panel auth-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={isLogin ? "Login or signup" : "Signup or login"}
          >
            <form className="auth-card" onSubmit={submit}>
              <div className="auth-card-top">
                <div>
                  <p className="eyebrow">{isLogin ? "Welcome back" : "Create your account"}</p>
                  <h2>{isLogin ? "Sign in to your dashboard" : "Start your job search setup"}</h2>
                </div>
                <button className="modal-close" onClick={closeAuthModal} type="button" aria-label="Close auth dialog">
                  x
                </button>
              </div>
              <p className="auth-intro">
                Use your email and password or continue with Google through Firebase authentication.
                Password reset and email verification use Firebase&apos;s built-in email templates.
              </p>

              <button
                className="google-button"
                disabled={loading}
                onClick={continueWithGoogle}
                type="button"
              >
                <span className="google-mark" aria-hidden="true">
                  <svg viewBox="0 0 48 48" role="img">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.277 4 24 4c-7.682 0-14.347 4.337-17.694 10.691z" />
                    <path fill="#4CAF50" d="M24 44c5.176 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.144 35.091 26.656 36 24 36c-5.218 0-9.62-3.316-11.283-7.946l-6.522 5.025C9.51 39.556 16.227 44 24 44z" />
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                  </svg>
                </span>
                <span>{loading ? "Please wait..." : "Continue with Google"}</span>
              </button>

              <div className="auth-divider">
                <span>or continue with email</span>
              </div>

              <label className="field">
                <span>Email</span>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              {!isLogin && email.trim() ? (
                <div className="auth-inline-help">
                  <span>We will send a verification email right after you complete signup.</span>
                </div>
              ) : null}

              <label className="field">
                <span>Password</span>
                <input
                  className="input"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </label>

              {notice ? <p className="toast-banner">{notice}</p> : null}
              {error ? <p className="error-banner">{error}</p> : null}

              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "Please wait..." : isLogin ? "Login" : "Signup"}
              </button>

              {isLogin ? (
                <div className="auth-secondary-actions">
                  <button
                    className="text-button"
                    disabled={loading}
                    onClick={handleForgotPassword}
                    type="button"
                  >
                    Forgot password?
                  </button>
                  {pendingVerificationEmail
                    && email.trim().toLowerCase() === pendingVerificationEmail.toLowerCase() ? (
                      <button
                        className="text-button"
                        disabled={loading || !password}
                        onClick={resendVerificationEmail}
                        type="button"
                      >
                        Resend verification email
                      </button>
                    ) : null}
                </div>
              ) : null}

              <button
                className="text-button auth-switch"
                onClick={() => {
                  setIsLogin((value) => !value);
                  setError("");
                  setNotice("");
                  if (isLogin) {
                    setPendingVerificationEmail("");
                  }
                }}
                type="button"
              >
                {isLogin ? "Need an account? Signup" : "Already registered? Login"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

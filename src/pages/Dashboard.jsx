import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import JobCard from "../components/JobCard";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { applyToJob, fetchAnalytics, fetchJobFeed } from "../services/jobApi";
import { buildPreferencePayload, profileLocationLabel } from "../utils/preferences";

function StatCard({ label, value, accent }) {
  return (
    <article className={`stat-card ${accent || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [feed, setFeed] = useState({ availableJobs: [], appliedJobs: [], totalAvailableJobs: 0, totalAppliedJobs: 0 });
  const [analytics, setAnalytics] = useState({ totalAvailableJobs: 0, totalAppliedJobs: 0, topMissingSkills: [] });
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const preferences = useMemo(() => {
    if (!user || !profile) {
      return null;
    }
    return buildPreferencePayload(user.uid, profile);
  }, [profile, user]);

  const loadDashboard = async () => {
    if (!preferences) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [nextFeed, nextAnalytics] = await Promise.all([
        fetchJobFeed(preferences),
        fetchAnalytics(preferences),
      ]);

      setFeed(nextFeed);
      setAnalytics(nextAnalytics);
      setStatusMessage(nextFeed.availableJobs[0]?.gapMessage || "");
      console.log(nextFeed.useFallback);
    } catch (err) {
      setError(err.message || "Could not load job recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [preferences]);

  const handleApply = async (jobId) => {
    if (!user) {
      return;
    }

    try {
      await applyToJob(jobId, user.uid);
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not update application status.");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  if (!profile || !preferences) {
    return null;
  }

  const preferredRoleLabel = (profile.preferredRoles || [profile.preferredRole || ""]).filter(Boolean).join(", ");
  const preferredJobTypeLabel = (profile.preferredJobTypes || [profile.preferredJobType || "Any"]).join(", ");

  return (
    <div className="page-shell">
      <Navbar onLogout={logout} />

      <section className="hero-strip">
        <div>
          <p className="eyebrow">Dashboard</p><br></br>
          <h1>{preferredRoleLabel || "Role-based"} opportunities tuned to your profile</h1>
          <p className="subtle-copy">
            <br></br>
            {preferredJobTypeLabel} roles across {profileLocationLabel(profile)} for {profile.experienceYears} years experience.
          </p>
        </div>
        <div className="hero-strip-actions">
          <Link className="ghost-button" to="/preferences">
            Update preferences
          </Link>
        </div>
      </section>

      {statusMessage ? <div className="toast-banner">{statusMessage}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="stats-grid">
        <StatCard label="Total available jobs" value={analytics.totalAvailableJobs} accent="warm" />
        <StatCard label="Total applied jobs" value={analytics.totalAppliedJobs} accent="cool" />
        <StatCard label="Tracked skills" value={profile.skills?.length || 0} />
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Analytics</p>
              <h2>Top skills you should learn</h2>
            </div>
          </div>
          <div className="insight-list">
            {analytics.topMissingSkills.length ? (
              analytics.topMissingSkills.map((item) => (
                <div className="insight-row" key={item.skill}>
                  <strong>{item.skill}</strong>
                  <span>required in {item.requiredByJobs} jobs</span>
                </div>
              ))
            ) : (
              <p className="empty-state">No major skill gaps detected across your current matching jobs.</p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Preferences</p>
              <h2>Your current targeting</h2>
            </div>
          </div>
          <div className="summary-list">
            <div><span>Roles</span><strong>{preferredRoleLabel}</strong></div>
            <div><span>Job types</span><strong>{preferredJobTypeLabel}</strong></div>
            <div><span>Locations</span><strong>{profileLocationLabel(profile)}</strong></div>
            <div><span>Skills</span><strong>{(profile.skills || []).join(", ")}</strong></div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Job feed</p>
            <h2>Available jobs</h2>
          </div>
        </div>
        {loading ? (
          <p className="empty-state">Loading job feed...</p>
        ) : feed.availableJobs.length ? (
          <div className="job-grid">
            {feed.availableJobs.map((job) => (
              <JobCard
  key={job.id}
  job={job}
  onApply={handleApply}
  onClick={() =>
    navigate(`/jobs/${job.id}`, {
      state: { usedFallback: feed.useFallback } // 🔥 IMPORTANT
    })
  }
/>
            ))}
          </div>
        ) : (
          <p className="empty-state">No matching jobs found for your current role, location, and experience filter.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Application tracker</p>
            <h2>Applied jobs</h2>
          </div>
        </div>
        {feed.appliedJobs.length ? (
          <div className="job-grid">
            {feed.appliedJobs.map((job) => (
              <JobCard key={job.id} job={job} applied />
            ))}
          </div>
        ) : (
          <p className="empty-state">Jobs move here after you click Apply Now.</p>
        )}
      </section>
    </div>
  );
}

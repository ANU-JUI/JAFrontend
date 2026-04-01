import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams,useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { applyToJob, fetchJobDetail } from "../services/jobApi";
import { buildPreferencePayload } from "../utils/preferences";


export default function JobDetaill() {
  const { jobId } = useParams();
  const [showBanner, setShowBanner] = useState(true);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
//const [usedFallback, setUsedFallback] = useState(false);
  // ✅ IMPORTANT
const location = useLocation();
const [usedFallback, setUsedFallback] = useState(
  location.state?.usedFallback || false
);
  const preferences = useMemo(() => {
    if (!user || !profile) {
      return null;
    }
    return buildPreferencePayload(user.uid, profile);
  }, [profile, user]);

 useEffect(() => {
  const load = async () => {
    if (!preferences || !jobId) return;

    try {
      setLoading(true);
      setError("");
      console.log("fallback status in detail page:", usedFallback);

      const nextJob = await fetchJobDetail(jobId, preferences);

      setJob(nextJob);
      // ❌ REMOVE fallback logic from here

    } catch (err) {
      setError(err.message || "Could not load job details.");
    } finally {
      setLoading(false);
    }
  };

  load();
}, [jobId, preferences]);

  const handleApply = async () => {
    if (!user || !job) {
      return;
    }

    try {
      await applyToJob(job.id, user.uid);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Could not update application status.");
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Job detail</p>
          <h1>{job?.title || "Loading role..."}</h1>
        </div>
        <Link className="ghost-button" to="/dashboard">
          Back to dashboard
        </Link>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

{loading ? (
  <div className="panel">
    <p className="empty-state">Loading job detail...</p>
  </div>
) : job ? (
  <>
    {/* ✅ Fallback banner */}
    {usedFallback && showBanner &&(
      <div className="info-banner">
        No jobs found in selected location. Showing global results 🌍
      <button onClick={() => setShowBanner(false)}>✕</button>
      </div>
    )}

    <div className="detail-layout">
      <section className="panel">
        <div className="detail-meta">
          <div><span>Company</span><strong>{job.company}</strong></div>
          <div><span>Location</span><strong>{job.location}</strong></div>
          <div><span>Experience</span><strong>{job.experienceRequired} years</strong></div>
          <div><span>Deadline</span><strong>{job.deadline}</strong></div>
          <div><span>Match score</span><strong>{job.matchScore}%</strong></div>
        </div>

        <h2>Job description</h2>
        <p className="description-block">{job.description}</p>
      </section>

          <aside className="panel">
            <h2>Fit summary</h2>
            <div className="chip-row">
              {job.requiredSkills.length ? (
                job.requiredSkills.map((skill) => (
                  <span className="chip" key={skill}>{skill}</span>
                ))
              ) : (
                <span className="chip">Skills not clearly listed</span>
              )}
            </div>

            <p className="callout">{job.gapMessage}</p>

            <div className="summary-list">
              <div>
                <span>Missing skills</span>
                <strong>
                  {job.requiredSkills.length === 0
                    ? "Not clearly specified in JD"
                    : job.missingSkills.length
                      ? job.missingSkills.join(", ")
                      : "None"}
                </strong>
              </div>
            </div>

            <a className="ghost-button full-width" href={job.applyLink} rel="noreferrer" target="_blank">
              Open external apply link
            </a>
            <button className="primary-button full-width" disabled={job.applied} onClick={handleApply} type="button">
              {job.applied ? "Already applied" : "Apply Now"}
            </button>
          </aside>
        </div>
        </>
      ) : null}
    </div>
  );
}

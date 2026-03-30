import { Link } from "react-router-dom";

export default function JobCard({ job, onApply, applied = false }) {
  return (
    <article className="job-card">
      <div className="job-card-head">
        <div>
          <p className="eyebrow">Match score</p>
          <h3>{job.title}</h3>
        </div>
        <span className="score-pill">{job.matchScore}%</span>
      </div>

      <div className="job-meta">
        <span>{job.company}</span>
        <span>{job.location}</span>
        <span>{job.jobType}</span>
        <span>{job.experienceRequired} years</span>
      </div>

      <p className="deadline-copy">Deadline: {job.deadline}</p>

      <div className="chip-row">
        {job.requiredSkills.length === 0 ? (
          <span className="chip">Skills not clearly listed</span>
        ) : job.missingSkills.length ? (
          job.missingSkills.slice(0, 4).map((skill) => (
            <span className="chip chip-warning" key={skill}>{skill}</span>
          ))
        ) : (
          <span className="chip">No missing skills</span>
        )}
      </div>

      <p className="subtle-copy">{job.gapMessage}</p>
      <p className="subtle-copy">
        Source: <span className="text-link">{job.source || "Unknown"}</span>
      </p>

      <div className="card-actions">
        <Link className="ghost-button" to={`/jobs/${job.id}`}>
          View JD
        </Link>
        {applied ? (
          <button className="primary-button" disabled type="button">
            Applied
          </button>
        ) : (
          <button className="primary-button" onClick={() => onApply(job.id)} type="button">
            Apply Now
          </button>
        )}
      </div>
    </article>
  );
}

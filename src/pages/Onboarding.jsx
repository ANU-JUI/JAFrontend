import { useEffect, useMemo, useState } from "react";
import { Country } from "country-state-city";
import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Link, useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import { useAuth } from "../context/AuthContext";

const JOB_TYPES = ["Any", "Full-time", "Part-time", "Contract", "Hybrid", "Remote", "Internship"];

function normalizeSkills(value) {
  return value
    .split(",")
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);
}

function normalizePreferredCountries(profile) {
  if (Array.isArray(profile?.preferredCountries) && profile.preferredCountries.length) {
    return profile.preferredCountries;
  }

  if (Array.isArray(profile?.preferredLocations) && profile.preferredLocations.length) {
    return profile.preferredLocations;
  }

  if (profile?.location?.country) {
    return [{
      code: profile.location.countryCode || profile.location.country,
      name: profile.location.country,
    }];
  }

  return [];
}

function normalizePreferredJobTypes(profile) {
  if (Array.isArray(profile?.preferredJobTypes) && profile.preferredJobTypes.length) {
    return profile.preferredJobTypes;
  }

  if (profile?.preferredJobType) {
    return [profile.preferredJobType];
  }

  return ["Any"];
}

function normalizePreferredRoles(profile) {
  if (Array.isArray(profile?.preferredRoles) && profile.preferredRoles.length) {
    return profile.preferredRoles;
  }

  if (profile?.preferredRole) {
    return [profile.preferredRole];
  }

  return [];
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [preferredRoles, setPreferredRoles] = useState("");
  const [preferredJobTypes, setPreferredJobTypes] = useState(["Any"]);
  const [experienceYears, setExperienceYears] = useState("0");
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [skills, setSkills] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUrl, setResumeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const countries = useMemo(() => Country.getAllCountries(), []);
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) {
      return countries;
    }

    return countries.filter((country) => country.name.toLowerCase().includes(query));
  }, [countries, countrySearch]);

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!profile) {
      return;
    }

    setPreferredRoles(normalizePreferredRoles(profile).join(", "));
    setPreferredJobTypes(normalizePreferredJobTypes(profile));
    setExperienceYears(String(profile.experienceYears ?? 0));
    setSelectedCountries(normalizePreferredCountries(profile));
    setSkills((profile.skills || []).join(", "));
    setResumeUrl(profile.resumeUrl || "");
  }, [user, profile, navigate]);

  const toggleCountry = (country) => {
    setSelectedCountries((current) => (
      current.some((item) => item.code === country.isoCode)
        ? current.filter((item) => item.code !== country.isoCode)
        : [...current, { code: country.isoCode, name: country.name }]
    ));
  };

  const toggleJobType = (jobType) => {
    setPreferredJobTypes((current) => {
      if (jobType === "Any") {
        return ["Any"];
      }

      const next = current.includes(jobType)
        ? current.filter((item) => item !== jobType)
        : [...current.filter((item) => item !== "Any"), jobType];

      return next.length ? next : ["Any"];
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!auth.currentUser) {
      setError("Login required.");
      return;
    }

    const roleList = preferredRoles
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);

    if (!roleList.length) {
      setError("At least one preferred role is required.");
      return;
    }

    if (!selectedCountries.length) {
      setError("Select at least one preferred country.");
      return;
    }

    if (!resumeFile && !resumeUrl) {
      setError("Please upload a resume.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const skillList = normalizeSkills(skills);
      let nextResumeUrl = resumeUrl;

      if (resumeFile) {
        const allowed =
          resumeFile.type.includes("pdf") ||
          resumeFile.type.includes("word");

        if (!allowed) {
          throw new Error("Only PDF/DOC/DOCX allowed");
        }

        if (resumeFile.size > 5 * 1024 * 1024) {
          throw new Error("File too large (Max 5MB)");
        }

        const uniqueName = `${Date.now()}_${resumeFile.name.replaceAll(" ", "_")}`;
        const fileRef = ref(storage, `resumes/${auth.currentUser.uid}/${uniqueName}`);
        await uploadBytes(fileRef, resumeFile);
        nextResumeUrl = await getDownloadURL(fileRef);
      }

      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          email: auth.currentUser.email,
          preferredRoles: roleList,
          preferredRole: roleList[0],
          preferredJobTypes,
          preferredJobType: preferredJobTypes.includes("Any") ? "Any" : preferredJobTypes[0],
          experienceYears: Number(experienceYears),
          preferredCountries: selectedCountries,
          skills: skillList,
          resumeUrl: nextResumeUrl,
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
          location: null,
        },
        { merge: true },
      );

      if (auth.currentUser.displayName !== roleList[0]) {
        await updateProfile(auth.currentUser, { displayName: roleList[0] });
      }

      await refreshProfile(auth.currentUser.uid);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>{profile?.onboardingCompleted ? "Update preferences" : "Complete your profile"}</h1>
          <p className="subtle-copy">Dashboard updates based on these preferences.</p>
        </div>

        {profile?.onboardingCompleted ? (
          <Link className="ghost-button" to="/dashboard">
            Back
          </Link>
        ) : null}
      </div>

      <form className="form-card" onSubmit={submit}>
        <label className="field">
          <span>Preferred roles</span>
          <textarea
            className="input textarea"
            value={preferredRoles}
            onChange={(event) => setPreferredRoles(event.target.value)}
            placeholder="e.g. Java Developer, Backend Engineer, Spring Boot Developer"
            required
          />
        </label>

        <label className="field">
          <span>Job types</span>
          <div className="multi-select">
            <div className="checkbox-list">
              {JOB_TYPES.map((jobType) => (
                <label className="checkbox-option" key={jobType}>
                  <input
                    checked={preferredJobTypes.includes(jobType)}
                    onChange={() => toggleJobType(jobType)}
                    type="checkbox"
                  />
                  <span>{jobType}</span>
                </label>
              ))}
            </div>
          </div>
        </label>

        {preferredJobTypes.length ? (
          <div className="chip-row">
            {preferredJobTypes.map((jobType) => (
              <span className="chip" key={jobType}>{jobType}</span>
            ))}
          </div>
        ) : null}

        <label className="field">
          <span>Preferred countries</span>
          <div className="multi-select">
            <input
              className="input"
              placeholder="Search countries"
              value={countrySearch}
              onChange={(event) => setCountrySearch(event.target.value)}
            />
            <div className="checkbox-list">
              {filteredCountries.map((country) => {
                const checked = selectedCountries.some((item) => item.code === country.isoCode);
                return (
                  <label className="checkbox-option" key={country.isoCode}>
                    <input
                      checked={checked}
                      onChange={() => toggleCountry(country)}
                      type="checkbox"
                    />
                    <span>{country.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </label>

        {selectedCountries.length ? (
          <div className="chip-row">
            {selectedCountries.map((country) => (
              <span className="chip" key={country.code}>{country.name}</span>
            ))}
          </div>
        ) : null}

        <label className="field">
          <span>Experience (years)</span>
          <input
            type="number"
            className="input"
            value={experienceYears}
            onChange={(event) => setExperienceYears(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Skills</span>
          <textarea
            className="input textarea"
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Resume</span>
          <input
            type="file"
            className="input"
            accept=".pdf,.doc,.docx"
            onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
          />
          {resumeUrl ? (
            <a className="text-link" href={resumeUrl} target="_blank" rel="noreferrer">
              View uploaded resume
            </a>
          ) : null}
        </label>

        {error ? <p className="error-banner">{error}</p> : null}

        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Saving..." : "Save Preferences"}
        </button>
      </form>
    </div>
  );
}

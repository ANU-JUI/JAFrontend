const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function fetchJobFeed(preferences) {
  return request("/jobs/feed", {
    method: "POST",
    body: JSON.stringify(preferences),
  });
}

export function fetchAnalytics(preferences) {
  return request("/analytics", {
    method: "POST",
    body: JSON.stringify(preferences),
  });
}

export function applyToJob(jobId, userId) {
  return request(`/jobs/${jobId}/apply`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function fetchJobDetail(jobId, preferences) {
  const params = new URLSearchParams({
    userId: preferences.userId,
    experienceYears: String(preferences.experienceYears),
  });

  preferences.preferredRoles.forEach((role) => params.append("preferredRoles", role));
  preferences.preferredJobTypes.forEach((jobType) => params.append("preferredJobTypes", jobType));
  preferences.countries.forEach((country) => params.append("countries", country));
  preferences.skills.forEach((skill) => params.append("skills", skill));
  return request(`/jobs/${jobId}?${params.toString()}`);
}

export function buildPreferencePayload(userId, profile) {
  const preferredCountries = Array.isArray(profile.preferredCountries) && profile.preferredCountries.length
    ? profile.preferredCountries
    : Array.isArray(profile.preferredLocations) && profile.preferredLocations.length
      ? profile.preferredLocations
      : profile.location?.country
        ? [{ code: profile.location.countryCode || profile.location.country, name: profile.location.country }]
        : [];

  const preferredRoles = Array.isArray(profile.preferredRoles) && profile.preferredRoles.length
    ? profile.preferredRoles
    : profile.preferredRole
      ? [profile.preferredRole]
      : [];

  const preferredJobTypes = Array.isArray(profile.preferredJobTypes) && profile.preferredJobTypes.length
    ? profile.preferredJobTypes
    : profile.preferredJobType
      ? [profile.preferredJobType]
      : ["Any"];

  return {
    userId,
    preferredRoles,
    preferredJobTypes,
    experienceYears: Number(profile.experienceYears || 0),
    countries: preferredCountries.map((country) => country.name),
    skills: profile.skills || [],
  };
}

export function profileLocationLabel(profile) {
  const countries = Array.isArray(profile?.preferredCountries) && profile.preferredCountries.length
    ? profile.preferredCountries
    : Array.isArray(profile?.preferredLocations) && profile.preferredLocations.length
      ? profile.preferredLocations
      : profile?.location?.country
        ? [{ name: profile.location.country }]
        : [];

  return countries.map((country) => country.name).join(", ");
}

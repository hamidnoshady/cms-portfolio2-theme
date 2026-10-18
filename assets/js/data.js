/* ===========================================================================
   Data — the CMS payload
   ---------------------------------------------------------------------------
   The theme reads the same shape of payload a CMS would deliver, so swapping
   `data/projects.json` for an API response is a one-line change.
   =========================================================================== */

const DATA_URL = new URL('../../data/projects.json', import.meta.url);

export async function loadProjects() {
  const response = await fetch(DATA_URL, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Could not load the project payload (${response.status})`);
  }
  const payload = await response.json();
  return {
    site: payload.site ?? {},
    projects: Array.isArray(payload.projects) ? payload.projects : [],
  };
}

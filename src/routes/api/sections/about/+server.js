/**
 * About Section API Endpoint
 * Returns journey milestones, skills, and testimonials data from Directus
 */

import { json } from '@sveltejs/kit';
import { getJourneyMilestones, getSkills } from '$lib/api/content/journey.js';
import { getTestimonialsForBio } from '$lib/api/content/testimonials.js';
import { getDirectusInstance, readItems } from '$lib/api/core/client.js';

async function getBiography() {
  const directus = getDirectusInstance();
  const results = await directus.request(
    readItems('kjov2_general', {
      fields: ['biography'],
      limit: 1
    })
  );
  const record = Array.isArray(results) ? results[0] : results;
  return record?.biography || null;
}

export async function GET() {
  try {
    // Fetch data in parallel
    // Testimonials: latest 10, randomized for variety
    const [milestones, skills, testimonials, biography] = await Promise.all([
      getJourneyMilestones(),
      getSkills(),
      getTestimonialsForBio().catch(() => []),
      getBiography().catch(() => null)
    ]);

    return json({
      milestones, // Will be null if table doesn't exist yet
      skills, // Will be null if table doesn't exist yet
      testimonials: testimonials || [],
      biography
    });

  } catch (error) {
    console.error('Error in about section API:', error);
    return json({
      milestones: null,
      skills: null,
      testimonials: [],
      biography: null
    });
  }
}

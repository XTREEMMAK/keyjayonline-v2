/**
 * About Section API Endpoint
 * Returns journey milestones, skills, and testimonials data from Directus
 */

import { json } from '@sveltejs/kit';
import { getJourneyMilestones, getSkills } from '$lib/api/content/journey.js';
import { getTestimonialsForBio } from '$lib/api/content/testimonials.js';

export async function GET() {
  try {
    // Fetch data in parallel
    // Testimonials: latest 10, randomized for variety
    const [milestones, skills, testimonials] = await Promise.all([
      getJourneyMilestones(),
      getSkills(),
      getTestimonialsForBio().catch(() => [])
    ]);

    return json({
      milestones, // Will be null if table doesn't exist yet
      skills, // Will be null if table doesn't exist yet
      testimonials: testimonials || []
    });

  } catch (error) {
    console.error('Error in about section API:', error);
    return json({
      milestones: null,
      skills: null,
      testimonials: []
    });
  }
}

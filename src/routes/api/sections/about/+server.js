/**
 * About Section API Endpoint
 * Returns journey milestones and skills data from Directus
 */

import { json } from '@sveltejs/kit';
import { getJourneyMilestones, getSkills } from '$lib/api/content/journey.js';

export async function GET() {
  try {
    // Fetch data in parallel
    const [milestones, skills] = await Promise.all([
      getJourneyMilestones(),
      getSkills()
    ]);

    return json({
      milestones, // Will be null if table doesn't exist yet
      skills // Will be null if table doesn't exist yet
    });

  } catch (error) {
    console.error('Error in about section API:', error);
    return json({
      milestones: null,
      skills: null
    });
  }
}

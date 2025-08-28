import { 
  getResourceCategories,
  getResources,
  getFeaturedResources,
  getCodeSnippets
} from '$lib/api/index.js';

export async function load({ url }) {
  try {
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const pricing = url.searchParams.get('pricing');
    
    // Run queries in parallel for better performance
    const [
      categories,
      featuredResources,
      codeSnippets
    ] = await Promise.all([
      getResourceCategories(),
      getFeaturedResources(8),
      getCodeSnippets()
    ]);
    
    // Get filtered resources based on search parameters
    const resources = await getResources(category, {
      search,
      pricing,
      sort: ['-featured', '-personal_rating', 'title']
    });

    // Group code snippets by language
    const codeSnippetsByLanguage = codeSnippets.reduce((acc, snippet) => {
      const lang = snippet.programming_language || 'Other';
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(snippet);
      return acc;
    }, {});

    // Calculate category counts
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const categoryResources = await getResources(cat.slug);
        return {
          ...cat,
          resource_count: categoryResources.length
        };
      })
    );

    return {
      categories: categoriesWithCounts,
      resources,
      featuredResources,
      codeSnippets,
      codeSnippetsByLanguage,
      
      // Filter state
      filters: {
        category: category || 'all',
        search: search || '',
        pricing: pricing || 'all'
      },
      
      // Stats
      stats: {
        totalResources: resources.length,
        totalCategories: categories.length,
        featuredCount: featuredResources.length,
        codeSnippetsCount: codeSnippets.length
      }
    };

  } catch (error) {
    console.error('Error loading resources data:', error);
    
    return {
      categories: [],
      resources: [],
      featuredResources: [],
      codeSnippets: [],
      codeSnippetsByLanguage: {},
      filters: {
        category: 'all',
        search: '',
        pricing: 'all'
      },
      stats: {
        totalResources: 0,
        totalCategories: 0,
        featuredCount: 0,
        codeSnippetsCount: 0
      },
      error: 'Failed to load resources data'
    };
  }
}
import { parsePresentation } from './presentation-parser';

// Presentation markdown content - loaded from public folder
let cachedPresentation: ReturnType<typeof parsePresentation> | null = null;

/**
 * Loads and parses presentation data
 */
export async function loadPresentationData() {
  if (cachedPresentation) {
    return cachedPresentation;
  }
  
  try {
    // Try to load from public folder first
    const response = await fetch('/Phase-1-Presentation.md');
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const markdown = await response.text();
    cachedPresentation = parsePresentation(markdown);
    return cachedPresentation;
  } catch (error) {
    console.error('Failed to load presentation:', error);
    // Fallback: return empty presentation
    return {
      metadata: {
        title: 'Презентация',
        version: '1.0',
        date: '',
        phase: '',
      },
      slides: [],
    };
  }
}

/**
 * Parsed presentation data (synchronous version - requires pre-loading)
 */
export const presentationData = {
  metadata: {
    title: 'Презентация',
    version: '1.0',
    date: '',
    phase: '',
  },
  slides: [],
};


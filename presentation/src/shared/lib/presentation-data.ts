import { parsePresentation } from './presentation-parser';

// Presentation markdown content - loaded from public folder
let cachedPresentation: ReturnType<typeof parsePresentation> | null = null;

/**
 * Loads and parses presentation data
 */
export async function loadPresentationData() {
  // In development, always reload to see latest changes
  const isDevelopment = import.meta.env.DEV;
  if (cachedPresentation && !isDevelopment) {
    return cachedPresentation;
  }

  try {
    // Try to load from public folder first
    // Add cache busting in development
    // Use import.meta.env.BASE_URL to support GitHub Pages base path
    const baseUrl = import.meta.env.BASE_URL;
    const cacheBuster = isDevelopment ? `?t=${Date.now()}` : '';
    const response = await fetch(
      `${baseUrl}Phase-1-Presentation.md${cacheBuster}`
    );
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

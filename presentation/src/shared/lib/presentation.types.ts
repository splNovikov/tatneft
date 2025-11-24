/**
 * Slide content types
 */
export interface SlideContent {
  type: 'text' | 'code' | 'table' | 'list' | 'diagram' | 'heading';
  content: string;
  language?: string; // For code blocks
  metadata?: Record<string, unknown>;
}

/**
 * Slide data structure
 */
export interface Slide {
  id: number;
  title: string;
  content: SlideContent[];
  rawMarkdown: string;
}

/**
 * Presentation metadata
 */
export interface PresentationMetadata {
  title: string;
  version: string;
  date: string;
  phase: string;
}

/**
 * Complete presentation data
 */
export interface Presentation {
  metadata: PresentationMetadata;
  slides: Slide[];
}


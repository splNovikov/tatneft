import type { Presentation, Slide, SlideContent, PresentationMetadata } from './presentation.types';

/**
 * Parses markdown content into presentation structure
 */
export function parsePresentation(markdown: string): Presentation {
  const lines = markdown.split('\n');
  
  // Extract metadata from the beginning
  const metadata = extractMetadata(lines);
  
  // Split into slides (separated by ---)
  const slideSections = splitIntoSlides(lines);
  
  // Parse each slide
  const slides = slideSections.map((section, index) => parseSlide(section, index + 1));
  
  return {
    metadata,
    slides,
  };
}

/**
 * Extracts metadata from the first few lines
 */
function extractMetadata(lines: string[]): PresentationMetadata {
  const metadata: Partial<PresentationMetadata> = {
    title: '',
    version: '',
    date: '',
    phase: '',
  };
  
  let i = 0;
  while (i < lines.length && i < 10) {
    const line = lines[i].trim();
    
    if (line.startsWith('# ')) {
      metadata.title = line.replace(/^#+\s*/, '');
    } else {
      // Try to match version, date, phase on separate lines
      const versionMatch = line.match(/\*\*Версия:\*\*\s*(.+)/);
      const dateMatch = line.match(/\*\*Дата:\*\*\s*(.+)/);
      const phaseMatch = line.match(/\*\*Этап\s*\d+:\s*(.+)/);
      
      if (versionMatch) metadata.version = versionMatch[1].trim();
      if (dateMatch) metadata.date = dateMatch[1].trim();
      if (phaseMatch) metadata.phase = phaseMatch[1].trim();
    }
    
    if (line === '---') break;
    i++;
  }
  
  return {
    title: metadata.title || 'Презентация',
    version: metadata.version || '1.0',
    date: metadata.date || '',
    phase: metadata.phase || '',
  };
}

/**
 * Splits markdown into slide sections
 */
function splitIntoSlides(lines: string[]): string[][] {
  const slides: string[][] = [];
  let currentSlide: string[] = [];
  let inSlide = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip metadata section (before first ---)
    if (!inSlide && line.trim() === '---') {
      inSlide = true;
      continue;
    }
    
    if (!inSlide) continue;
    
    // New slide starts with ## Слайд
    if (line.match(/^##\s+Слайд\s+\d+:/)) {
      if (currentSlide.length > 0) {
        slides.push(currentSlide);
      }
      currentSlide = [line];
    } else if (line.trim() === '---' && currentSlide.length > 0) {
      // End of slide
      slides.push(currentSlide);
      currentSlide = [];
    } else if (currentSlide.length > 0 || line.trim()) {
      currentSlide.push(line);
    }
  }
  
  // Add last slide
  if (currentSlide.length > 0) {
    slides.push(currentSlide);
  }
  
  return slides;
}

/**
 * Parses a single slide section
 */
function parseSlide(section: string[], slideNumber: number): Slide {
  const content: SlideContent[] = [];
  let currentCodeBlock: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  let currentTable: string[] = [];
  let inTable = false;
  let currentList: string[] = [];
  let inList = false;
  
  let title = `Слайд ${slideNumber}`;
  
  for (let i = 0; i < section.length; i++) {
    const line = section[i];
    const trimmed = line.trim();
    
    // Extract title from first ## heading
    if (i === 0 && trimmed.startsWith('## ')) {
      title = trimmed.replace(/^##+\s*/, '').trim();
      continue;
    }
    
    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const code = currentCodeBlock.join('\n');
        // Check if it's a PlantUML diagram
        const isPlantUML = codeLanguage.toLowerCase() === 'plantuml' || 
                          code.includes('@startuml') || 
                          code.includes('@enduml');
        
        if (isPlantUML) {
          // Check if it's a reference to a .puml file
          // Format: ```plantuml
          // @plantuml:path/to/file.puml
          // ```
          const refMatch = code.match(/^@plantuml:(.+)$/m);
          if (refMatch) {
            content.push({
              type: 'diagram-ref',
              content: code,
              diagramPath: refMatch[1].trim(),
            });
          } else {
            // Inline PlantUML code
            content.push({
              type: 'diagram',
              content: code,
            });
          }
        } else {
          content.push({
            type: 'code',
            content: code,
            language: codeLanguage || undefined,
          });
        }
        currentCodeBlock = [];
        inCodeBlock = false;
        codeLanguage = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        codeLanguage = trimmed.replace(/```/, '').trim();
      }
      continue;
    }
    
    if (inCodeBlock) {
      currentCodeBlock.push(line);
      continue;
    }
    
    // Tables
    if (trimmed.includes('|') && trimmed.split('|').length > 2) {
      if (!inTable) {
        inTable = true;
        currentTable = [];
      }
      currentTable.push(line);
      continue;
    } else if (inTable) {
      // End of table
      content.push({
        type: 'table',
        content: currentTable.join('\n'),
      });
      currentTable = [];
      inTable = false;
    }
    
    // Lists
    if (trimmed.match(/^[-*]\s/) || trimmed.match(/^\d+\.\s/)) {
      if (!inList) {
        inList = true;
        currentList = [];
      }
      currentList.push(trimmed);
      continue;
    } else if (inList && trimmed === '') {
      // End of list
      content.push({
        type: 'list',
        content: currentList.join('\n'),
      });
      currentList = [];
      inList = false;
    } else if (inList) {
      // Continue list item (multiline)
      if (currentList.length > 0) {
        currentList[currentList.length - 1] += ' ' + trimmed;
      }
      continue;
    }
    
    // Headings
    // Handle ## headings (level 2) that are not the slide title
    if (trimmed.startsWith('## ') && i > 0) {
      content.push({
        type: 'heading',
        content: trimmed.replace(/^##+\s*/, '').trim(),
      });
      continue;
    }
    
    // Handle ### headings (level 3)
    if (trimmed.startsWith('### ')) {
      content.push({
        type: 'heading',
        content: trimmed.replace(/^###+\s*/, ''),
      });
      continue;
    }
    
    // Regular text
    if (trimmed && !trimmed.startsWith('#')) {
      // Check if it's a diagram (plantuml)
      if (trimmed.includes('plantuml') || trimmed.includes('@startuml')) {
        // Collect diagram block
        let diagramLines: string[] = [];
        let j = i;
        while (j < section.length) {
          diagramLines.push(section[j]);
          if (section[j].includes('@enduml')) {
            break;
          }
          j++;
        }
        content.push({
          type: 'diagram',
          content: diagramLines.join('\n'),
        });
        i = j;
        continue;
      }
      
      content.push({
        type: 'text',
        content: trimmed,
      });
    }
  }
  
  // Close any open blocks
  if (inCodeBlock && currentCodeBlock.length > 0) {
    content.push({
      type: 'code',
      content: currentCodeBlock.join('\n'),
      language: codeLanguage || undefined,
    });
  }
  
  if (inTable && currentTable.length > 0) {
    content.push({
      type: 'table',
      content: currentTable.join('\n'),
    });
  }
  
  if (inList && currentList.length > 0) {
    content.push({
      type: 'list',
      content: currentList.join('\n'),
    });
  }
  
  return {
    id: slideNumber,
    title,
    content,
    rawMarkdown: section.join('\n'),
  };
}


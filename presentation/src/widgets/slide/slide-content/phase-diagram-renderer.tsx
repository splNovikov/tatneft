import { Typography } from 'antd';
import styles from './phase-diagram-renderer.module.css';

const { Title, Text } = Typography;

interface PhaseDiagramRendererProps {
  content: string;
}

interface Phase {
  title: string;
  items: string[];
}

/**
 * Parses phase diagram from ASCII art format
 */
function parsePhaseDiagram(content: string): Phase[] {
  const phases: Phase[] = [];
  const lines = content.split('\n');
  
  let currentPhase: Phase | null = null;
  let inBox = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and arrows
    if (!trimmed || trimmed === '↓' || trimmed.match(/^─+$/)) {
      continue;
    }
    
    // Start of a box
    if (trimmed.includes('┌──') || (trimmed.startsWith('│') && !trimmed.includes('ФАЗА'))) {
      inBox = true;
    }
    
    // Extract phase title (ФАЗА 1: ... or ФАЗА 2: ...)
    const phaseMatch = trimmed.match(/ФАЗА\s*(\d+):\s*(.+)/);
    if (phaseMatch) {
      // If we already have a phase, save it
      if (currentPhase) {
        phases.push(currentPhase);
      }
      currentPhase = {
        title: phaseMatch[2].trim(),
        items: [],
      };
      inBox = true;
      continue;
    }
    
    // Extract list items (• ...) - can be inside or outside box
    if (currentPhase && trimmed.includes('•')) {
      const itemMatch = trimmed.match(/[•*]\s*(.+)/);
      if (itemMatch) {
        const itemText = itemMatch[1].trim();
        // Clean up box characters
        const cleanItem = itemText.replace(/^│\s*/, '').replace(/\s*│$/, '').trim();
        if (cleanItem) {
          currentPhase.items.push(cleanItem);
        }
      }
      continue;
    }
    
    // End of box
    if (trimmed.includes('└──')) {
      if (currentPhase && currentPhase.items.length > 0) {
        phases.push(currentPhase);
        currentPhase = null;
      }
      inBox = false;
    }
  }
  
  // Add last phase if exists
  if (currentPhase) {
    phases.push(currentPhase);
  }
  
  return phases;
}

/**
 * Renders phase diagram as modern cards
 */
export function PhaseDiagramRenderer({ content }: PhaseDiagramRendererProps) {
  const phases = parsePhaseDiagram(content);
  
  if (phases.length === 0) {
    // Fallback to regular code block
    return (
      <pre className={styles.codeBlock}>
        <code>{content}</code>
      </pre>
    );
  }
  
  return (
    <div className={styles.phaseDiagramContainer}>
      {phases.map((phase, index) => (
        <div key={index}>
          <div className={styles.phaseCard}>
            <Title level={4} className={styles.phaseTitle}>
              ФАЗА {index + 1}: {phase.title}
            </Title>
            <ul className={styles.phaseItems}>
              {phase.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Text>{item}</Text>
                </li>
              ))}
            </ul>
          </div>
          {index < phases.length - 1 && (
            <div className={styles.phaseArrow}>↓</div>
          )}
        </div>
      ))}
    </div>
  );
}


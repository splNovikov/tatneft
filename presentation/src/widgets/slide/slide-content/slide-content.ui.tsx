import { Typography } from 'antd';
import type { SlideContent } from '~shared/lib/presentation.types';
import {
  renderMarkdownText,
  parseMarkdownTable,
  parseMarkdownList,
} from './slide-content.lib';
import { PlantUMLRenderer } from './plantuml-renderer';
import { PhaseDiagramRenderer } from './phase-diagram-renderer';
import styles from './slide-content.module.css';

const { Title, Paragraph } = Typography;

interface SlideContentProps {
  content: SlideContent;
}

/**
 * Renders a single slide content element
 */
export function SlideContentRenderer({ content }: SlideContentProps) {
  switch (content.type) {
    case 'heading':
      return (
        <Title level={3} className={styles.heading}>
          {renderMarkdownText(content.content)}
        </Title>
      );

    case 'code': {
      // Check if it's a phase diagram (contains phases with boxes)
      const isPhaseDiagram =
        content.content.includes('ФАЗА') &&
        (content.content.includes('┌──') || content.content.includes('─'));

      if (isPhaseDiagram) {
        return <PhaseDiagramRenderer content={content.content} />;
      }

      return (
        <pre className={styles.codeBlock}>
          <code
            className={content.language ? `language-${content.language}` : ''}
          >
            {content.content}
          </code>
        </pre>
      );
    }

    case 'table':
      return (
        <div className={styles.tableWrapper}>
          {parseMarkdownTable(content.content)}
        </div>
      );

    case 'list':
      return (
        <div className={styles.listWrapper}>
          {parseMarkdownList(content.content)}
        </div>
      );

    case 'diagram-ref':
      // Load PlantUML from external .puml file
      return <PlantUMLRenderer plantumlPath={content.diagramPath || ''} />;

    case 'diagram':
      // Check if it's PlantUML code
      const isPlantUML =
        content.content.includes('@startuml') ||
        content.content.includes('@enduml') ||
        content.content.trim().toLowerCase().includes('plantuml');

      if (isPlantUML) {
        return <PlantUMLRenderer plantumlCode={content.content} />;
      }

      // Fallback for other diagram types
      return (
        <div className={styles.diagramWrapper}>
          <pre className={styles.diagram}>
            <code>{content.content}</code>
          </pre>
        </div>
      );

    case 'text':
    default:
      return (
        <Paragraph className={styles.text}>
          {renderMarkdownText(content.content)}
        </Paragraph>
      );
  }
}

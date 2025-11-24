import { Typography } from 'antd';
import type { SlideContent } from '~shared/lib/presentation.types';
import { renderMarkdownText, parseMarkdownTable, parseMarkdownList } from './slide-content.lib';
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

    case 'code':
      return (
        <pre className={styles.codeBlock}>
          <code className={content.language ? `language-${content.language}` : ''}>
            {content.content}
          </code>
        </pre>
      );

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

    case 'diagram':
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


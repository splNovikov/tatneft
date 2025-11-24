import type { ReactNode } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

/**
 * Renders markdown text with basic formatting
 */
export function renderMarkdownText(text: string): ReactNode {
  // Simple markdown parsing for bold and italic
  const parts: ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;

  // Match **bold** and *italic*
  const boldRegex = /\*\*(.+?)\*\*/g;
  const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;

  // Process bold first
  let match: RegExpExecArray | null;
  const boldMatches: Array<{ start: number; end: number; text: string }> = [];

  while ((match = boldRegex.exec(text)) !== null) {
    boldMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
    });
  }

  // Process italic (avoiding conflicts with bold)
  const italicMatches: Array<{ start: number; end: number; text: string }> = [];
  match = null;
  while ((match = italicRegex.exec(text)) !== null) {
    // Check if this italic is inside a bold match
    const isInsideBold = boldMatches.some(
      bm => match!.index >= bm.start && match!.index < bm.end
    );
    if (!isInsideBold) {
      italicMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
      });
    }
  }

  // Combine and sort all matches
  const allMatches = [
    ...boldMatches.map(m => ({ ...m, type: 'bold' as const })),
    ...italicMatches.map(m => ({ ...m, type: 'italic' as const })),
  ].sort((a, b) => a.start - b.start);

  // Build parts
  for (const match of allMatches) {
    // Add text before match
    if (match.start > currentIndex) {
      const beforeText = text.substring(currentIndex, match.start);
      if (beforeText) {
        parts.push(beforeText);
      }
    }

    // Add formatted text
    if (match.type === 'bold') {
      parts.push(<strong key={key++}>{match.text}</strong>);
    } else {
      parts.push(<em key={key++}>{match.text}</em>);
    }

    currentIndex = match.end;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText) {
      parts.push(remainingText);
    }
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

/**
 * Parses markdown table and renders as Ant Design Table
 */
export function parseMarkdownTable(markdown: string): ReactNode {
  const lines = markdown.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return <pre>{markdown}</pre>;
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map(h => h.trim())
    .filter(h => h && !h.match(/^[-:]+$/));

  // Skip separator line
  const dataLines = lines.slice(2);

  // Parse data
  const dataSource = dataLines.map((line, index) => {
    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter(c => c);
    
    const record: Record<string, string> = { key: String(index) };
    headers.forEach((header, i) => {
      record[header] = cells[i] || '';
    });
    return record;
  });

  const columns: ColumnsType<Record<string, string>> = headers.map(header => ({
    title: renderMarkdownText(header),
    dataIndex: header,
    key: header,
    render: (text: string) => renderMarkdownText(text),
  }));

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      bordered
    />
  );
}

/**
 * Parses markdown list and renders as HTML list
 */
export function parseMarkdownList(markdown: string): ReactNode {
  const lines = markdown.split('\n').filter(line => line.trim());
  const items: ReactNode[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Unordered list
    if (trimmed.match(/^[-*]\s/)) {
      const text = trimmed.replace(/^[-*]\s+/, '');
      items.push(
        <li key={items.length}>
          {renderMarkdownText(text)}
        </li>
      );
    }
    // Ordered list
    else if (trimmed.match(/^\d+\.\s/)) {
      const text = trimmed.replace(/^\d+\.\s+/, '');
      items.push(
        <li key={items.length}>
          {renderMarkdownText(text)}
        </li>
      );
    }
  }

  // Check if it's an ordered list (starts with number)
  const isOrdered = lines.some(line => line.trim().match(/^\d+\.\s/));

  if (isOrdered) {
    return <ol className="markdown-list">{items}</ol>;
  }
  return <ul className="markdown-list">{items}</ul>;
}


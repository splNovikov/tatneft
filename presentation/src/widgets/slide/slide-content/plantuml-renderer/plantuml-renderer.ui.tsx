import { useState, useEffect } from 'react';
import { Spin, Alert } from 'antd';
import styles from './plantuml-renderer.module.css';

interface PlantUMLRendererProps {
  plantumlCode?: string;
  plantumlPath?: string;
}

/**
 * Renders PlantUML diagram as an image
 */
export function PlantUMLRenderer({ plantumlCode, plantumlPath }: PlantUMLRendererProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDiagram() {
      try {
        setLoading(true);
        setError(null);

        let code: string;

        // Load from file if path is provided
        if (plantumlPath) {
          try {
            // Use import.meta.env.BASE_URL to support GitHub Pages base path
            const baseUrl = import.meta.env.BASE_URL;
            const response = await fetch(`${baseUrl}diagrams/${plantumlPath}`);
            if (!response.ok) {
              throw new Error(`Failed to load PlantUML file: ${response.statusText}`);
            }
            code = await response.text();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load PlantUML file');
            setLoading(false);
            return;
          }
        } else if (plantumlCode) {
          // Extract PlantUML code (remove markdown code block markers if present)
          code = plantumlCode.trim();
          
          // Remove ```plantuml and ``` markers
          code = code.replace(/^```plantuml\s*/i, '');
          code = code.replace(/^```\s*/, '');
          code = code.replace(/\s*```$/g, '');
        } else {
          setError('No PlantUML code or path provided');
          setLoading(false);
          return;
        }

        // Use kroki.io - alternative PlantUML service with CORS support
        // This service accepts POST requests and supports CORS, avoiding encoding issues
        try {
          const krokiUrl = 'https://kroki.io/plantuml/svg';
          const response = await fetch(krokiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
            },
            body: code,
          });

          if (response.ok) {
            const svgText = await response.text();
            // Check if it's actually SVG (not an error)
            if (svgText.trim().startsWith('<svg') || svgText.trim().startsWith('<?xml')) {
              const blob = new Blob([svgText], { type: 'image/svg+xml' });
              const blobUrl = URL.createObjectURL(blob);
              setImageUrl(blobUrl);
              setLoading(false);
              return;
            }
          }
          
          // If SVG failed, try PNG
          const pngResponse = await fetch('https://kroki.io/plantuml/png', {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
            },
            body: code,
          });

          if (pngResponse.ok) {
            const blob = await pngResponse.blob();
            if (blob.type.startsWith('image/')) {
              const blobUrl = URL.createObjectURL(blob);
              setImageUrl(blobUrl);
              setLoading(false);
              return;
            }
          }
          
          throw new Error('Kroki.io returned invalid response');
        } catch (krokiError) {
          console.warn('Kroki.io failed:', krokiError);
          setError('Failed to render PlantUML diagram. The diagram service may be unavailable.');
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render PlantUML diagram');
        setLoading(false);
      }
    }

    loadDiagram();
  }, [plantumlCode, plantumlPath]);

  if (loading) {
    return (
      <div className={styles.container}>
        <Spin>
          <div style={{ padding: '50px' }}>Загрузка диаграммы...</div>
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Alert
          message="Ошибка загрузки диаграммы"
          description={error}
          type="error"
          showIcon
        />
        <details className={styles.fallback}>
          <summary>Показать исходный код</summary>
          <pre className={styles.code}>
            <code>{plantumlCode || `File: ${plantumlPath}`}</code>
          </pre>
        </details>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className={styles.container}>
      <img
        src={imageUrl}
        alt="PlantUML Diagram"
        className={styles.diagram}
        loading="lazy"
      />
    </div>
  );
}


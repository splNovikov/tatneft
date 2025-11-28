import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorHandler, { logError } from '~shared/ui/error-handler';
import Spinner from '~shared/ui/spinner';
import { PresentationContainer } from '~features/presentation';
import { loadPresentationData } from '~shared/lib/presentation-data';
import type { Presentation } from '~shared/lib/presentation.types';
import styles from './presentation-page.module.css';

/**
 * Presentation page component
 */
export default function PresentationPage() {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPresentation() {
      try {
        setLoading(true);
        const data = await loadPresentationData();
        setPresentation(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load presentation'
        );
        console.error('Error loading presentation:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPresentation();
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner tip="Загрузка презентации..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Ошибка загрузки презентации</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className={styles.error}>
        <h2>Презентация не найдена</h2>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorHandler} onError={logError}>
      <PresentationContainer presentation={presentation} />
    </ErrorBoundary>
  );
}

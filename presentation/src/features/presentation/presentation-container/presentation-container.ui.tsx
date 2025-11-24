import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorHandler, { logError } from '~shared/ui/error-handler';
import Spinner from '~shared/ui/spinner';
import { Slide } from '~widgets/slide';
import { PresentationNavigation, usePresentationNavigation } from '../presentation-navigation';
import type { Presentation } from '~shared/lib/presentation.types';
import styles from './presentation-container.module.css';

interface PresentationContainerProps {
  presentation: Presentation;
}

/**
 * Main presentation container with navigation
 */
export function PresentationContainer({ presentation }: PresentationContainerProps) {
  const navigation = usePresentationNavigation({
    totalSlides: presentation.slides.length,
    initialSlide: 1,
  });

  const currentSlideData = presentation.slides[navigation.currentSlide - 1];

  if (!currentSlideData) {
    return (
      <div className={styles.error}>
        <h2>Слайд не найден</h2>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorHandler} onError={logError}>
      <div className={styles.container}>
        <div className={styles.slideWrapper}>
          <Suspense fallback={<Spinner tip="Загрузка слайда..." />}>
            <Slide slide={currentSlideData} />
          </Suspense>
        </div>
        
        <PresentationNavigation navigation={navigation} totalSlides={presentation.slides.length} />
      </div>
    </ErrorBoundary>
  );
}


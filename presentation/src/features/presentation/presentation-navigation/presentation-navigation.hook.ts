import { useEffect, useState } from 'react';

interface UsePresentationNavigationProps {
  totalSlides: number;
  initialSlide?: number;
}

/**
 * Hook for managing presentation navigation
 */
export function usePresentationNavigation({
  totalSlides,
  initialSlide = 1,
}: UsePresentationNavigationProps) {
  const [currentSlide, setCurrentSlide] = useState(initialSlide);

  const goToSlide = (slideNumber: number) => {
    if (slideNumber >= 1 && slideNumber <= totalSlides) {
      setCurrentSlide(slideNumber);
    }
  };

  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const previousSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const goToFirst = () => setCurrentSlide(1);
  const goToLast = () => setCurrentSlide(totalSlides);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ': // Spacebar
          event.preventDefault();
          if (currentSlide < totalSlides) {
            setCurrentSlide(prev => prev + 1);
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          if (currentSlide > 1) {
            setCurrentSlide(prev => prev - 1);
          }
          break;
        case 'Home':
          event.preventDefault();
          setCurrentSlide(1);
          break;
        case 'End':
          event.preventDefault();
          setCurrentSlide(totalSlides);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlide, totalSlides]);

  return {
    currentSlide,
    goToSlide,
    nextSlide,
    previousSlide,
    goToFirst,
    goToLast,
    canGoNext: currentSlide < totalSlides,
    canGoPrevious: currentSlide > 1,
  };
}


export interface UsePresentationNavigationReturn {
  currentSlide: number;
  goToSlide: (slideNumber: number) => void;
  nextSlide: () => void;
  previousSlide: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

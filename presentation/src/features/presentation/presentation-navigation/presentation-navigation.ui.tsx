import { Button, Progress } from 'antd';
import { LeftOutlined, RightOutlined, HomeOutlined, ToTopOutlined } from '@ant-design/icons';
import type { UsePresentationNavigationReturn } from './presentation-navigation.types';
import styles from './presentation-navigation.module.css';

interface PresentationNavigationProps {
  navigation: UsePresentationNavigationReturn;
  totalSlides: number;
}

/**
 * Presentation navigation controls
 */
export function PresentationNavigation({
  navigation,
  totalSlides,
}: PresentationNavigationProps) {
  const progress = (navigation.currentSlide / totalSlides) * 100;

  return (
    <div className={styles.navigation}>
      <div className={styles.controls}>
        <Button
          icon={<HomeOutlined />}
          onClick={navigation.goToFirst}
          disabled={!navigation.canGoPrevious}
          size="large"
        >
          Начало
        </Button>
        
        <Button
          icon={<LeftOutlined />}
          onClick={navigation.previousSlide}
          disabled={!navigation.canGoPrevious}
          size="large"
        >
          Назад
        </Button>
        
        <div className={styles.slideCounter}>
          {navigation.currentSlide} / {totalSlides}
        </div>
        
        <Button
          icon={<RightOutlined />}
          onClick={navigation.nextSlide}
          disabled={!navigation.canGoNext}
          size="large"
        >
          Вперед
        </Button>
        
        <Button
          icon={<ToTopOutlined />}
          onClick={navigation.goToLast}
          disabled={!navigation.canGoNext}
          size="large"
        >
          Конец
        </Button>
      </div>
      
      <Progress
        percent={progress}
        showInfo={false}
        strokeColor="#020a1c"
        className={styles.progress}
      />
      
      <div className={styles.hint}>
        Используйте стрелки ← → или пробел для навигации
      </div>
    </div>
  );
}


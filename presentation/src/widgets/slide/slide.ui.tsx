import { Typography } from 'antd';
import type { Slide } from '~shared/lib/presentation.types';
import { SlideContentRenderer } from './slide-content';
import styles from './slide.module.css';

const { Title, Text } = Typography;

interface SlideProps {
  slide: Slide;
}

/**
 * Renders a single presentation slide
 */
export function Slide({ slide }: SlideProps) {
  const isTitleSlide = slide.id === 1;

  if (isTitleSlide) {
    return (
      <div className={styles.titleSlide}>
        <div className={styles.titleSlideContent}>
          <Title level={1} className={styles.titleSlideMainTitle}>
            {slide.title}
          </Title>
          {slide.content.length > 0 && (
            <div className={styles.titleSlideSubtitle}>
              {slide.content.map((content, index) => (
                <SlideContentRenderer key={index} content={content} />
              ))}
            </div>
          )}
          <div className={styles.titleSlideCustomer}>
            <Text className={styles.customerName}>СП «Татнефть-Добыча»</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.slide}>
      <div className={styles.slideHeader}>
        <Title level={2} className={styles.slideTitle}>
          {slide.title}
        </Title>
      </div>
      
      <div className={styles.slideContent}>
        {slide.content.map((content, index) => (
          <SlideContentRenderer key={index} content={content} />
        ))}
      </div>
    </div>
  );
}


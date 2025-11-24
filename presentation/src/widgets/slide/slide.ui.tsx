import { Typography } from 'antd';
import type { Slide } from '~shared/lib/presentation.types';
import { SlideContentRenderer } from './slide-content';
import styles from './slide.module.css';

const { Title } = Typography;

interface SlideProps {
  slide: Slide;
}

/**
 * Renders a single presentation slide
 */
export function Slide({ slide }: SlideProps) {
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


import type { ReactElement } from 'react';
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

  // Check if slide title is "Цель проекта" and wrap first text elements
  const isGoalSlide = slide.title.toLowerCase().includes('цель проекта');

  const renderContent = () => {
    if (!isGoalSlide) {
      // Not a goal slide, render normally
      return slide.content.map((content, index) => (
        <SlideContentRenderer key={index} content={content} />
      ));
    }

    // For goal slide, wrap first text elements in container
    const elements: ReactElement[] = [];
    let i = 0;
    let textWrapped = false;

    while (i < slide.content.length) {
      // Wrap first consecutive text elements in goal container
      if (!textWrapped && slide.content[i].type === 'text') {
        const textElements: ReactElement[] = [];
        while (i < slide.content.length && slide.content[i].type === 'text') {
          textElements.push(
            <SlideContentRenderer key={i} content={slide.content[i]} />
          );
          i++;
        }

        if (textElements.length > 0) {
          elements.push(
            <div key="goal-text" className={styles.goalContainer}>
              {textElements}
            </div>
          );
          textWrapped = true;
        }
      } else {
        elements.push(
          <SlideContentRenderer key={i} content={slide.content[i]} />
        );
        i++;
      }
    }

    return elements;
  };

  return (
    <div className={styles.slide}>
      <div className={styles.slideHeader}>
        <Title level={2} className={styles.slideTitle}>
          {slide.title}
        </Title>
      </div>

      <div className={styles.slideContent}>{renderContent()}</div>
    </div>
  );
}

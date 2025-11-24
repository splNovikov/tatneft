import { useState, useEffect } from 'react';
import styles from './company-logo.module.css';

/**
 * Company logo component
 */
export function CompanyLogo() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
    // Use import.meta.env.BASE_URL to support GitHub Pages base path
    const baseUrl = import.meta.env.BASE_URL;
    img.src = `${baseUrl}logo-proxima.png`;
  }, []);

  return (
    <div className={styles.logoContainer}>
      {imageLoaded && !imageError ? (
        <img 
          src="/logo-proxima.png" 
          alt="ПРОКСИМА" 
          className={styles.logo}
        />
      ) : (
        <div className={styles.logoText}>ПРОКСИМА</div>
      )}
    </div>
  );
}


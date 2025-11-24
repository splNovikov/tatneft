import { Spin } from 'antd';
import styles from './spinner.module.css';

interface SpinnerProps {
  tip?: string;
  children?: React.ReactNode;
}
export default function Spinner({ tip, children }: SpinnerProps) {
  return (
    <div className={styles.spinner}>
      <Spin tip={tip} spinning>
        {children || <div className={styles.spinnerContentPlaceholder} />}
      </Spin>
    </div>
  );
}

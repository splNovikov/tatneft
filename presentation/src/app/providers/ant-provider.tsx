import type { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import { appTheme } from './theme.config';

interface AntProviderProps {
  children: ReactNode;
}

export function AntProvider({ children }: AntProviderProps) {
  return (
    <ConfigProvider theme={appTheme} locale={enUS}>
      {children}
    </ConfigProvider>
  );
}

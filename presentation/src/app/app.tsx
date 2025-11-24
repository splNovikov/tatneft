import { ErrorBoundary } from 'react-error-boundary';
import ErrorHandler, { logError } from '~shared/ui/error-handler';
import { AntProvider } from './providers/ant-provider';
import { BrowserRouter } from './routes/browser-router';
import '~shared/styles/global.css';

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorHandler} onError={logError}>
      <AntProvider>
        <BrowserRouter />
      </AntProvider>
    </ErrorBoundary>
  );
}

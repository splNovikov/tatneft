import { Result, Button, Alert, Typography } from 'antd';
import { Navigate } from 'react-router-dom';
import { pathKeys } from '~shared/router';
import { hasResponseStatus } from './error-handler.lib';
import { type ErrorHandlerProps } from './error-handler.type';

const { Paragraph } = Typography;

export default function ErrorHandler(props: ErrorHandlerProps) {
  const { error, resetErrorBoundary } = props;

  if (hasResponseStatus(error) && error.response?.status === 404) {
    return <Navigate to={pathKeys.page404} replace />;
  }

  return (
    <Result
      icon={false}
      status="error"
      title="Something went wrong"
      subTitle={error.message}
      extra={[
        <Button type="primary" key="retry" onClick={resetErrorBoundary}>
          Try again
        </Button>,
      ]}
    >
      {import.meta.env.DEV && error.stack && (
        <Alert
          message="Error Details"
          description={<Paragraph code>{error.stack}</Paragraph>}
          type="error"
          showIcon
        />
      )}
    </Result>
  );
}

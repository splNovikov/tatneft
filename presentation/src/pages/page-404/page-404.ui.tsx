import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { pathKeys } from '~shared/router';

export default function Page404() {
  const navigate = useNavigate();

  const handleGoToPresentation = () => {
    navigate(pathKeys.presentation);
  };

  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, we couldn't find the page you're looking for."
      extra={
        <Button type="primary" onClick={handleGoToPresentation}>
          Go to Presentation
        </Button>
      }
    />
  );
}

import {
  RouterProvider,
  createBrowserRouter,
  redirect,
  useRouteError,
} from 'react-router-dom';
import { pathKeys } from '~shared/router';
import Spinner from '~shared/ui/spinner';
import { createRoutesFromManifest } from './routes.factory';
import { routesManifest } from './routes.manifest';

export function BrowserRouter() {
  return <RouterProvider router={browserRouter} />;
}

const browserRouter = createBrowserRouter([
  {
    errorElement: <BubbleError />,
    HydrateFallback: () => <Spinner tip="Thinking..." />,
    children: [
      ...createRoutesFromManifest(routesManifest),
      {
        path: '*',
        loader: async () => redirect(pathKeys.page404),
      },
    ],
  },
]);

// https://github.com/remix-run/react-router/discussions/10166
function BubbleError(): null {
  const error = useRouteError();

  if (error) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(
        typeof error === 'string' ? error : JSON.stringify(error)
      );
    }
  }
  return null;
}

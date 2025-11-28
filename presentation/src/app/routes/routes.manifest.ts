import type { LazyRouteFunction, RouteObject } from 'react-router-dom';
import { pathKeys } from '~shared/router';

/**
 * Route manifest entry defining how to lazy load a route
 * This is pure data - NO imports of actual route files
 */
export interface RouteManifestEntry {
  path: string;
  loader: () => Promise<LazyRouteFunction<RouteObject> | RouteObject>;
  children?: RouteManifestEntry[];
}

/**
 * Central route manifest - defines all application routes
 * Each route uses dynamic import() to ensure zero upfront bundle cost
 * Add new routes here to automatically include them in the router
 */
export const routesManifest: RouteManifestEntry[] = [
  {
    path: pathKeys.presentation,
    loader: () =>
      import('~pages/presentation/presentation-page.route').then(
        m => m.presentationPageRoute
      ),
  },
  {
    path: pathKeys.root,
    loader: () =>
      import('~pages/presentation/presentation-page.route').then(
        m => m.presentationPageRoute
      ),
  },
  {
    path: pathKeys.page404,
    loader: () =>
      import('~pages/page-404/page-404.route').then(m => m.page404Route),
  },
];

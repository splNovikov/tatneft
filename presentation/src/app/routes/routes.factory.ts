import type { RouteObject } from 'react-router-dom';
import type { RouteManifestEntry } from './routes.manifest';

/**
 * Transforms a route manifest entry into a React Router RouteObject
 * Handles nested children recursively
 *
 * @param entry - Route manifest entry with lazy loader
 * @returns React Router compatible route object
 */
function createRouteFromManifest(entry: RouteManifestEntry): RouteObject {
  const route: RouteObject = {
    path: entry.path,
    lazy: async () => {
      const loadedRoute = await entry.loader();

      // Handle both lazy function format and direct RouteObject format
      if ('lazy' in loadedRoute && typeof loadedRoute.lazy === 'function') {
        return loadedRoute.lazy();
      }

      // Extract only the properties allowed in lazy routes
      const { Component, ErrorBoundary, loader, action, shouldRevalidate } =
        loadedRoute as RouteObject;

      return {
        ...(Component && { Component }),
        ...(ErrorBoundary && { ErrorBoundary }),
        ...(loader && { loader }),
        ...(action && { action }),
        ...(shouldRevalidate && { shouldRevalidate }),
      };
    },
  };

  // Recursively process children
  if (entry.children && entry.children.length > 0) {
    route.children = entry.children.map(child =>
      createRouteFromManifest(child)
    );
  }

  return route;
}

/**
 * Converts an array of manifest entries into React Router route configuration
 * This function enables dynamic route registration without importing route files upfront
 *
 * @param manifest - Array of route manifest entries
 * @returns Array of React Router compatible route objects
 *
 * @example
 * const routes = createRoutesFromManifest(routesManifest);
 * const router = createBrowserRouter([
 *   { children: routes }
 * ]);
 */
export function createRoutesFromManifest(
  manifest: RouteManifestEntry[]
): RouteObject[] {
  return manifest.map(entry => createRouteFromManifest(entry));
}

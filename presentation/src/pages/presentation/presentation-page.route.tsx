import { type RouteObject } from 'react-router-dom';
import { pathKeys } from '~shared/router';

export const presentationPageRoute: RouteObject = {
  path: pathKeys.presentation,
  lazy: async () => {
    const Component = await import('./presentation-page.ui').then(module => module.default);
    return { Component };
  },
};


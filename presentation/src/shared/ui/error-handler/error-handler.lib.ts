import type { ErrorWithResponse } from './error-handler.type';

export function hasResponseStatus(error: Error): error is ErrorWithResponse {
  return 'response' in error && typeof error.response === 'object';
}

export function logError(
  error: Error,
  info: { componentStack?: string | null }
) {
  if (import.meta.env.DEV) {
    console.log('Caught error:', error);
    console.log('Error details:', info);
  } else {
    // Log error to an external service in production
  }
}

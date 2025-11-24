export type ErrorHandlerProps = {
  error: Error;
  resetErrorBoundary?: (...args: unknown[]) => void;
};

export type ErrorWithResponse = Error & {
  response?: {
    status?: number;
  };
};

import { memo, ReactNode } from "react";
import { ErrorBoundary as ErrorBoundaryFromLib, FallbackProps } from 'react-error-boundary';

interface ErrorBoundaryProps {
  children: ReactNode,
}

export const ErrorBoundary = memo(({children}: ErrorBoundaryProps) => {
  return <ErrorBoundaryFromLib
    FallbackComponent={FallbackComponent}
    resetKeys={[children]}
  >
    {children}
  </ErrorBoundaryFromLib>
});

const FallbackComponent = memo(({error}: FallbackProps) => {
  return <div role="alert">
    <div style={{fontStyle: 'italic'}}>🚨 React error:</div>
    <div style={{fontFamily: 'monospace'}}>{error.message}</div>
  </div>
});
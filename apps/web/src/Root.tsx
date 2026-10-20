import { StrictMode, type ReactNode } from "react";
import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";

/** The website's React tree, shared by the browser entry and the build-time prerenderer. */
export function Root(): ReactNode {
  return (
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ClerkProvider } from "@clerk/clerk-react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";

import ErrorBoundary from "./components/ErrorBoundary";

const clerkPubKey = "pk_test_bWlnaHR5LWRvZS0zNy5jbGVyay5hY2NvdW50cy5kZXYk";
// const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = ReactDOM.createRoot(document.getElementById("root"));

if (!clerkPubKey) {
  root.render(
    <div style={{ padding: 20, color: 'red', fontFamily: 'sans-serif' }}>
      <h1>Configuration Error</h1>
      <p>Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code> in .env file.</p>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={clerkPubKey}>
          <HelmetProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </HelmetProvider>
        </ClerkProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

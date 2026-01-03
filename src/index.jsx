import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ClerkProvider } from "@clerk/clerk-react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";

import ErrorBoundary from "./components/ErrorBoundary";
import { ProfileProvider } from "./context/ProfileContext";
import { SpeedInsights } from "@vercel/speed-insights/react";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Publishable Key. Check VITE_CLERK_PUBLISHABLE_KEY in .env");
}
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
      <SpeedInsights />
      <ErrorBoundary>
        <ClerkProvider publishableKey={clerkPubKey}>
          <HelmetProvider>
            <BrowserRouter>
              <ProfileProvider>
                <App />
              </ProfileProvider>
            </BrowserRouter>
          </HelmetProvider>
        </ClerkProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

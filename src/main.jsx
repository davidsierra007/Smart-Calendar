import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react'
import Landing from './Landing.jsx'

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.error("Missing Publishable Key: Add VITE_CLERK_PUBLISHABLE_KEY to your .env file.")
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY || "missing_key"} afterSignOutUrl="/">
      <SignedIn>
        <App />
      </SignedIn>
      <SignedOut>
        <Landing />
      </SignedOut>
    </ClerkProvider>
  </React.StrictMode>
)
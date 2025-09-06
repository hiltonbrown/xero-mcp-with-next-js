// Main page demonstrating the Xero MCP integration

'use client';

import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';

export default function HomePage() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
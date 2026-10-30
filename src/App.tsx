import React from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { WorkspaceProvider } from './context/WorkspaceContext.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <AppLayout />
      </WorkspaceProvider>
    </AuthProvider>
  );
}

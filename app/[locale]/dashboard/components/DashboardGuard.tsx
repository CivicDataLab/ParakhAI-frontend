'use client';

import { SessionGuard } from '@/components/SessionGuard';
import React from 'react';

interface DashboardGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side wrapper for dashboard pages that enforces session validation.
 * This component wraps the dashboard content with SessionGuard to ensure
 * only authenticated users with valid Keycloak sessions can access dashboard pages.
 */
export function DashboardGuard({ children }: DashboardGuardProps) {
  return (
    <SessionGuard
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600 text-sm">Verifying your session...</p>
          </div>
        </div>
      }
    >
      {children}
    </SessionGuard>
  );
}

export default DashboardGuard;

'use client';

import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import { DollarSign } from 'lucide-react';

export default function FinancePage() {
  return (
    <PermissionGate
      permission="finance.read"
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage financial data and reports</p>
        </div>

        <div className="bg-secondary border border-border rounded-xl py-16 px-6 flex flex-col items-center justify-center">
          <DollarSign className="w-12 h-12 text-muted mb-4" />
          <p className="text-muted-foreground">No data yet</p>
        </div>
      </div>
    </PermissionGate>
  );
}

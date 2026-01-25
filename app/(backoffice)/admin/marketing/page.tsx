'use client';

import Link from 'next/link';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import { Megaphone, FileText } from 'lucide-react';

export default function MarketingPage() {
  return (
    <PermissionGate
      permission="marketing.read"
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Marketing</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage marketing campaigns and content</p>
          </div>
          <Link
            href="/admin/docs"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg text-white text-sm font-medium no-underline"
          >
            <FileText className="w-4 h-4" />
            View Docs
          </Link>
        </div>

        <div className="bg-secondary border border-border rounded-xl py-16 px-6 flex flex-col items-center justify-center">
          <Megaphone className="w-12 h-12 text-muted mb-4" />
          <p className="text-muted-foreground">No data yet</p>
        </div>
      </div>
    </PermissionGate>
  );
}

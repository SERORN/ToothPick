import { Suspense } from 'react';
import OrganizationsList from '@/components/organization/OrganizationsList';

export default function OrganizationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <OrganizationsList />
      </Suspense>
    </div>
  );
}

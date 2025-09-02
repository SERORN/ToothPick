import { NextRequest, NextResponse } from 'next/server';
import DentistStorePreview from '@/components/dentist/DentistStorePreview';

interface Props {
  params: {
    dentistId: string;
  };
}

export default function DentistStorePage({ params }: Props) {
  const { dentistId } = params;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DentistStorePreview 
          dentistId={dentistId} 
          isPublic={true}
          onProductSelect={(product) => {
            // Aquí se manejaría la navegación al checkout o booking
            console.log('Product selected:', product);
          }}
        />
      </div>
    </div>
  );
}

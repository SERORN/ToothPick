import InvoiceManager from '@/components/InvoiceManager';

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Facturas CFDI
            </h1>
            <p className="mt-2 text-gray-600">
              Administra todas las facturas electrónicas emitidas por ToothPick
            </p>
          </div>
          
          <InvoiceManager 
            allowCancel={true}
            allowResend={true}
            showCreateButton={true}
          />
        </div>
      </div>
    </div>
  );
}

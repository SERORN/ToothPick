import { NextResponse } from 'next/server';
import ExportService from '@/lib/services/ExportService';

export async function POST(req: Request) {
  const body = await req.json();
  const { type, collections, filters, requestedBy } = body;

  try {
    if (type === 'csv') {
      const [collection] = collections;
      const result = await ExportService.exportCollectionToCSV(collection, filters || {}, requestedBy);
      return NextResponse.json(result);
    }

    if (type === 'json-zip') {
      const result = await ExportService.exportMultipleToJSONZip(collections, requestedBy);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Tipo no soportado' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const history = await ExportService.getExportHistory();
    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

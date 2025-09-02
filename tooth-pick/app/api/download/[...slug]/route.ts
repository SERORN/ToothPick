import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const filePath = path.join(process.cwd(), 'backups', ...params.slug);

  try {
    const file = await fs.readFile(filePath);
    const fileName = params.slug[params.slug.length - 1];
    const fileExt = path.extname(fileName);
    const contentType = fileExt === '.zip' ? 'application/zip' : fileExt === '.csv' ? 'text/csv' : 'application/octet-stream';

    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return new Response('File not found', { status: 404 });
  }
}

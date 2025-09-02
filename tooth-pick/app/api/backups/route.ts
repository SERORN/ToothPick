import { NextResponse } from 'next/server';
import BackupService from '@/lib/services/BackupService';

export async function POST(req: Request) {
  const body = await req.json();
  const { collections, requestedBy } = body;
  try {
    const backup = await BackupService.createBackup(collections, requestedBy);
    return NextResponse.json(backup);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const recent = await BackupService.getRecentBackups();
    return NextResponse.json(recent);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

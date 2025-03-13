import { NextResponse } from 'next/server';
import { saveToDatabase } from '@/lib/db';
import type { LiftStatusResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const statuses = await request.json() as LiftStatusResponse[];
    await saveToDatabase(statuses);
    return NextResponse.json({ message: 'Successfully saved to database' });
  } catch (error) {
    console.error('Error saving to database:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save to database' },
      { status: 500 }
    );
  }
} 
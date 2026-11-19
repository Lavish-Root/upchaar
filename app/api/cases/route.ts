import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { cases } from '@/src/db/schema';

// GET: Fetch all cases
export async function GET() {
  const allCases = await db.select().from(cases);
  return NextResponse.json(allCases);
}

// POST: Create new case
export async function POST(req: Request) {
  const data = await req.json();
  const newCase = await db.insert(cases).values(data).returning();
  return NextResponse.json(newCase[0]);
}

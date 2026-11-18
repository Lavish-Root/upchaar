import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { users } from '@/src/db/schema';
import { eq, or } from 'drizzle-orm';

export async function POST(req: Request) {
  const { id, password, role } = await req.json();

  if (role === 'DOCTOR') {
    const user = await db.select().from(users).where(eq(users.doctorId, id)).limit(1);
    if (user.length === 0 || user[0].password !== password) {
      return NextResponse.json({ error: 'Invalid Doctor ID or Password' }, { status: 401 });
    }
    return NextResponse.json(user[0]);
  } else {
    // Patient logic remains mostly same (auto-register/login)
    const user = await db.select().from(users).where(eq(users.name, id)).limit(1);
    if (user.length > 0) return NextResponse.json(user[0]);
    
    // Create new patient
    const newUser = await db.insert(users).values({ name: id, role: 'PATIENT' }).returning();
    return NextResponse.json(newUser[0]);
  }
}

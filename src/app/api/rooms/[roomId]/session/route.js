import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET(request, { params }) {
  const { roomId } = await params;
  const cookieStore = await cookies();
  
  // Check for existing session cookie
  const sessionCookie = cookieStore.get(`room-ticket-${roomId}`);
  
  if (!sessionCookie?.value) {
    return NextResponse.json({ hasSession: false }, { status:200 });
  }
  
  try {
    const { payload } = await jwtVerify(sessionCookie.value, SECRET);
    
    if (payload.roomId === roomId && payload.type === "room-session") {
      return NextResponse.json({ 
        hasSession: true, 
        candidateName: payload.candidateName,
        roomTicket: sessionCookie.value
      }, { status: 200 });
    }
  } catch {
    // Invalid session, clear cookie
    const response = NextResponse.json({ hasSession: false }, { status: 200 });
    response.cookies.delete(`room-ticket-${roomId}`);
    return response;
  }
  
  return NextResponse.json({ hasSession: false }, { status: 200 });
}
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Broadcast functions using global variables set by custom server
export function broadcastAppointmentUpdate(doctorId: string, data: any) {
  if (globalThis.broadcastAppointmentUpdate) {
    globalThis.broadcastAppointmentUpdate(doctorId, data);
  }
}

export function broadcastQueueUpdate(doctorId: string, data: any) {
  if (globalThis.broadcastQueueUpdate) {
    globalThis.broadcastQueueUpdate(doctorId, data);
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'WebSocket server is running via custom server',
    path: '/api/socket'
  });
}
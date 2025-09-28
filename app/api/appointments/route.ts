import { getDatabase } from "@/lib/mongodb";
import { performanceLogger } from "@/lib/performance";
import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";

// TypeScript interfaces
interface AppointmentDocument {
  _id: ObjectId;
  appointmentKey: string;
  doctorId: ObjectId;
  doctorName: string;
  patientId: ObjectId;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  address?: string;
  date: string;
  time: string;
  sessionStartTime?: string;
  status: string;
  reason?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Import WebSocket broadcast functions
let broadcastAppointmentUpdate: ((doctorId: string, data: any) => void) | null = null;

// Dynamically import WebSocket functions to avoid module issues
async function getBroadcastFunction() {
  if (!broadcastAppointmentUpdate) {
    try {
      const socketModule = await import("../socket/route");
      broadcastAppointmentUpdate = socketModule.broadcastAppointmentUpdate;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log("WebSocket not available, continuing without real-time updates");
      }
    }
  }
  return broadcastAppointmentUpdate;
}

// ---------------------- GET Appointments ----------------------
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const doctorIdParam = searchParams.get("doctorId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    if (!doctorIdParam) {
      performanceLogger.logApiCall('/api/appointments', startTime, false);
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    // Validate ObjectId format early
    if (!ObjectId.isValid(doctorIdParam)) {
      performanceLogger.logApiCall('/api/appointments', startTime, false);
      return NextResponse.json({ error: "Invalid Doctor ID format" }, { status: 400 });
    }

    const dbStartTime = Date.now();
    const db = await getDatabase();
    const appointmentsCollection = db.collection("appointments");

    // Build query filter
    const filter: Record<string, any> = {
      doctorId: new ObjectId(doctorIdParam)
    };
    
    if (status && typeof status === 'string') filter.status = status;
    if (date && typeof date === 'string') filter.date = date;

    const appointments = await appointmentsCollection
      .find(filter)
      .sort({ date: 1, time: 1 })
      .toArray();

    performanceLogger.logDbQuery('appointments', 'find', dbStartTime, appointments.length);

    // Convert ObjectIds to strings with proper typing
    const normalizedAppointments = appointments.map((appointment: any): AppointmentDocument => ({
      _id: appointment._id.toString(),
      appointmentKey: appointment.appointmentKey,
      doctorId: appointment.doctorId.toString(),
      doctorName: appointment.doctorName,
      patientId: appointment.patientId.toString(),
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail || null,
      patientPhone: appointment.patientPhone || null,
      address: appointment.address || "",
      date: appointment.date,
      time: appointment.time,
      sessionStartTime: appointment.sessionStartTime,
      status: appointment.status,
      reason: appointment.reason || null,
      rejectionReason: appointment.rejectionReason || null,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    }));

    performanceLogger.logApiCall('/api/appointments', startTime, true);
    return NextResponse.json({ 
      success: true,
      count: normalizedAppointments.length,
      appointments: normalizedAppointments 
    });

  } catch (error) {
    performanceLogger.logApiCall('/api/appointments', startTime, false);
    
    if (process.env.NODE_ENV === 'development') {
      console.error("Fetch appointments error:", error);
    }
    
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch appointments",
      code: 'API_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ---------------------- PUT Appointment ----------------------
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { appointmentId, status, rejectionReason } = body;

    // Input validation
    if (!appointmentId || !status) {
      performanceLogger.logApiCall('/api/appointments', startTime, false);
      return NextResponse.json({ error: "Appointment ID and status are required" }, { status: 400 });
    }

    // Validate appointmentId format
    if (!ObjectId.isValid(appointmentId)) {
      performanceLogger.logApiCall('/api/appointments', startTime, false);
      return NextResponse.json({ error: "Invalid Appointment ID format" }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      performanceLogger.logApiCall('/api/appointments', startTime, false);
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const dbStartTime = Date.now();
    const db = await getDatabase();
    const appointmentsCollection = db.collection("appointments");

    const updateData: Record<string, any> = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (status === "rejected" && rejectionReason && typeof rejectionReason === 'string') {
      updateData.rejectionReason = rejectionReason;
    }

    // Convert the string appointmentId to ObjectId for the query
    const objectId = new ObjectId(appointmentId);

    const result = await appointmentsCollection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: "after" }
    );

    performanceLogger.logDbQuery('appointments', 'findOneAndUpdate', dbStartTime);

    if (!result) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // If appointment is confirmed, add patient to the queue
    if (status === "confirmed") {
      try {
        const patientQueueCollection = db.collection("PatientQueue");
        
        // Check if patient is already in queue for this appointment
        const existingQueueEntry = await patientQueueCollection.findOne({
          appointmentKey: result.appointmentKey
        });
        
        if (!existingQueueEntry) {
          const queueEntry = {
            appointmentKey: result.appointmentKey,
            doctorId: result.doctorId,
            doctorName: result.doctorName,
            patientId: result.patientId,
            patientName: result.patientName,
            patientEmail: result.patientEmail || null,
            patientPhone: result.patientPhone || null,
            address: result.address || "",
            appointmentDate: result.date,
            appointmentTime: result.time,
            status: "waiting", // Default queue status
            queueStatus: "waiting",
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await patientQueueCollection.insertOne(queueEntry);
          console.log("Patient added to queue successfully!");
          
          // Broadcast queue update via WebSocket
          try {
            const broadcast = await getBroadcastFunction();
            const { broadcastQueueUpdate } = await import("../socket/route");
            if (broadcastQueueUpdate) {
              broadcastQueueUpdate(result.doctorId.toString(), {
                type: 'queue_updated',
                patient: {
                  patientName: result.patientName,
                  doctorName: result.doctorName,
                  appointmentKey: result.appointmentKey
                }
              });
            }
          } catch (error) {
            console.log("WebSocket queue broadcast failed:", error);
          }
        } else {
          console.log("Patient already in queue for this appointment");
        }
      } catch (queueError) {
        console.error("Error adding patient to queue:", queueError);
        // Don't fail the appointment confirmation if queue insertion fails
      }
    }

    // Save notification to Notification collection
    try {
      const notificationCollection = db.collection("Notification");
      
      let notificationMessage = "";
      let notificationType = "";
      
      if (status === "confirmed") {
        notificationMessage = `Patient ${result.patientName} has been successfully confirmed for appointment on ${result.date} at ${result.time}`;
        notificationType = "appointment_confirmed";
      } else if (status === "rejected") {
        const reason = rejectionReason ? ` with reason: ${rejectionReason}` : "";
        notificationMessage = `Appointment request for ${result.patientName} on ${result.date} at ${result.time} has been rejected${reason}`;
        notificationType = "appointment_rejected";
      }
      
      if (notificationMessage) {
        const notification = {
          doctorId: result.doctorId,
          doctorName: result.doctorName,
          patientId: result.patientId,
          patientName: result.patientName,
          appointmentDate: result.date,
          appointmentTime: result.time,
          appointmentKey: result.appointmentKey,
          message: notificationMessage,
          status: "unread",
          type: notificationType,
          rejectionReason: status === "rejected" ? rejectionReason : null,
          createdAt: new Date()
        };
        
        await notificationCollection.insertOne(notification);
        console.log(`✅ Notification saved: ${notificationType} for ${result.patientName}`);
      }
    } catch (notificationError) {
      console.error("Error saving notification:", notificationError);
      // Don't fail the appointment update if notification save fails
    }

    console.log("Update successful!");

    // Broadcast appointment update via WebSocket
    try {
      const broadcast = await getBroadcastFunction();
      if (broadcast) {
        broadcast(result.doctorId.toString(), {
          type: 'appointment_updated',
          appointment: {
            _id: result._id.toString(),
            status: result.status,
            patientName: result.patientName,
            doctorName: result.doctorName,
            date: result.date,
            time: result.time,
            updatedAt: result.updatedAt,
          }
        });
      }
    } catch (error) {
      console.log("WebSocket broadcast failed:", error);
    }

    // Convert ObjectIds back to strings for the response
    const updatedAppointment = {
      _id: result._id.toString(),
      appointmentKey: result.appointmentKey,
      doctorId: result.doctorId.toString(),
      doctorName: result.doctorName,
      patientId: result.patientId.toString(),
      patientName: result.patientName,
      patientEmail: result.patientEmail || null,
      patientPhone: result.patientPhone || null,
      address: result.address || "",
      date: result.date,
      time: result.time,
      sessionStartTime: result.sessionStartTime,
      status: result.status,
      reason: result.reason || null,
      rejectionReason: result.rejectionReason || null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    return NextResponse.json({ 
      success: true, 
      message: `Appointment ${status} successfully`, 
      appointment: updatedAppointment 
    });

  } catch (error) {
    performanceLogger.logApiCall('/api/appointments', startTime, false);
    console.error("Update appointment error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Failed to update appointment",
      code: 'API_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
import { getDatabase } from "@/lib/mongodb";
import { performanceLogger } from "@/lib/performance";
import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";

// TypeScript interfaces
interface NotificationDocument {
  _id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentKey: string;
  message: string;
  status: string;
  type: string;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

// ---------------------- GET Notifications ----------------------
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const status = searchParams.get("status"); // "read", "unread", or "all"
    const limitParam = searchParams.get("limit");
    
    // Input validation
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50; // Max 100 results
    if (isNaN(limit) || limit < 1) {
      performanceLogger.logApiCall('/api/notifications', startTime, false);
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }

    if (doctorId && !ObjectId.isValid(doctorId)) {
      performanceLogger.logApiCall('/api/notifications', startTime, false);
      return NextResponse.json({ error: "Invalid Doctor ID format" }, { status: 400 });
    }

    const dbStartTime = Date.now();
    const db = await getDatabase();
    const notificationCollection = db.collection("Notification");

    // Build query filter
    const filter: Record<string, any> = {};
    
    if (doctorId && ObjectId.isValid(doctorId)) {
      filter.doctorId = new ObjectId(doctorId);
    }
    
    if (status && status !== "all" && ['read', 'unread'].includes(status)) {
      filter.status = status;
    }

    const notifications = await notificationCollection
      .find(filter)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(limit)
      .toArray();

    performanceLogger.logDbQuery('notifications', 'find', dbStartTime, notifications.length);

    // Convert ObjectIds to strings with proper typing
    const normalizedNotifications: NotificationDocument[] = notifications.map((notification: any) => ({
      _id: notification._id.toString(),
      doctorId: notification.doctorId.toString(),
      doctorName: notification.doctorName,
      patientId: notification.patientId.toString(),
      patientName: notification.patientName,
      appointmentDate: notification.appointmentDate,
      appointmentTime: notification.appointmentTime,
      appointmentKey: notification.appointmentKey,
      message: notification.message,
      status: notification.status,
      type: notification.type,
      rejectionReason: notification.rejectionReason || null,
      createdAt: notification.createdAt,
    }));

    performanceLogger.logApiCall('/api/notifications', startTime, true);
    return NextResponse.json({ 
      success: true,
      count: normalizedNotifications.length,
      notifications: normalizedNotifications 
    });

  } catch (error) {
    performanceLogger.logApiCall('/api/notifications', startTime, false);
    
    if (process.env.NODE_ENV === 'development') {
      console.error("Fetch notifications error:", error);
    }
    
    return NextResponse.json({ 
      error: "Failed to fetch notifications",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}

// ---------------------- PUT Notification (Mark as read/unread) ----------------------
export async function PUT(request: NextRequest) {
  try {
    const { notificationId, status } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    if (!status || !["read", "unread"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'read' or 'unread'" }, { status: 400 });
    }

    // Validate that notificationId can be converted to ObjectId
    if (!ObjectId.isValid(notificationId)) {
      return NextResponse.json({ error: "Invalid Notification ID format" }, { status: 400 });
    }

    const db = await getDatabase();
    const notificationCollection = db.collection("Notification");

    const updateData = { 
      status, 
      updatedAt: new Date() 
    };

    // Convert the string notificationId to ObjectId for the query
    const objectId = new ObjectId(notificationId);

    const result = await notificationCollection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ 
        error: "Notification not found"
      }, { status: 404 });
    }

    // Convert ObjectIds back to strings for the response
    const updatedNotification = {
      _id: result._id.toString(),
      doctorId: result.doctorId.toString(),
      doctorName: result.doctorName,
      patientId: result.patientId.toString(),
      patientName: result.patientName,
      appointmentDate: result.appointmentDate,
      appointmentTime: result.appointmentTime,
      appointmentKey: result.appointmentKey,
      message: result.message,
      status: result.status,
      type: result.type,
      rejectionReason: result.rejectionReason || null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    return NextResponse.json({ 
      success: true, 
      message: `Notification marked as ${status}`, 
      notification: updatedNotification 
    });

  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// ---------------------- DELETE Notification ----------------------
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("notificationId");

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(notificationId)) {
      return NextResponse.json({ error: "Invalid Notification ID format" }, { status: 400 });
    }

    const db = await getDatabase();
    const notificationCollection = db.collection("Notification");

    const objectId = new ObjectId(notificationId);
    const result = await notificationCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        error: "Notification not found"
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Notification deleted successfully" 
    });

  } catch (error) {
    console.error("Delete notification error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
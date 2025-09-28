import { getDatabase } from "@/lib/mongodb";
import { performanceLogger } from "@/lib/performance";
import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";

// TypeScript interfaces
interface QueueEntry {
  _id: string;
  patientName: string;
  doctorName: string;
  appointmentKey: string;
  createdAt: Date;
  status: string;
  queueStatus: string;
  doctorId: string;
  patientId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  address?: string;
  patientEmail?: string;
  patientPhone?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url)
    let doctorIds = searchParams.getAll("doctorId")

    // Handle single doctorId parameter
    if (!doctorIds || doctorIds.length === 0) {
      const singleId = searchParams.get("doctorId")
      if (singleId) doctorIds = [singleId]
    }

    // Validate ObjectIds
    const validDoctorIds = doctorIds.filter(id => id && ObjectId.isValid(id))
    if (validDoctorIds.length === 0) {
      performanceLogger.logApiCall('/api/patient-queue', startTime, false);
      return NextResponse.json({ error: "Valid Doctor ID(s) required" }, { status: 400 })
    }

    const dbStartTime = Date.now();
    const db = await getDatabase()
    
    // Use consistent collection name
    const patientQueueCollection = db.collection("PatientQueue")
    
    const doctorObjectIds = validDoctorIds.map(id => new ObjectId(id))
    
    if (process.env.NODE_ENV === 'development') {
      console.log("Patient Queue API - Doctor IDs:", validDoctorIds)
      console.log("Patient Queue API - Doctor ObjectIds:", doctorObjectIds)
    }

    // Query with optimized projection
    const queueEntries = await patientQueueCollection
      .find({ doctorId: { $in: doctorObjectIds } })
      .project({
        _id: 1,
        patientName: 1,
        doctorName: 1,
        appointmentKey: 1,
        createdAt: 1,
        status: 1,
        queueStatus: 1,
        doctorId: 1,
        patientId: 1,
        appointmentDate: 1,
        appointmentTime: 1,
        address: 1,
        patientEmail: 1,
        patientPhone: 1
      })
      .sort({ createdAt: 1 })
      .toArray()

    performanceLogger.logDbQuery('PatientQueue', 'find', dbStartTime, queueEntries.length);
    
    if (process.env.NODE_ENV === 'development') {
      console.log("Patient Queue API - Found entries:", queueEntries.length)
      
      // Debug sample entries (limit to avoid performance issues)
      if (queueEntries.length === 0) {
        const sampleEntries = await patientQueueCollection.find({}).limit(3).toArray()
        console.log("Patient Queue API - Sample entries in DB:", sampleEntries.map((e: any) => ({
          id: e._id,
          doctorId: e.doctorId,
          doctorIdType: typeof e.doctorId,
          patientName: e.patientName
        })))
      }
    }

    // Normalize queue entries with proper typing
    const normalizedEntries: QueueEntry[] = queueEntries.map((entry: any) => ({
      _id: entry._id.toString(),
      patientName: entry.patientName,
      doctorName: entry.doctorName,
      appointmentKey: entry.appointmentKey,
      createdAt: entry.createdAt,
      status: entry.status,
      queueStatus: entry.queueStatus,
      doctorId: entry.doctorId.toString(),
      patientId: entry.patientId?.toString(),
      appointmentDate: entry.appointmentDate,
      appointmentTime: entry.appointmentTime,
      address: entry.address,
      patientEmail: entry.patientEmail,
      patientPhone: entry.patientPhone
    }));

    performanceLogger.logApiCall('/api/patient-queue', startTime, true);

    const response = {
      success: true,
      count: normalizedEntries.length,
      patientQueue: normalizedEntries
    };

    // Add debug info only in development
    if (process.env.NODE_ENV === 'development') {
      const debugInfo = {
        doctorIds: validDoctorIds,
        doctorObjectIds: doctorObjectIds.map(id => id.toString()),
        totalInDatabase: await patientQueueCollection.countDocuments(),
        matched: normalizedEntries.length,
        searchedBy: "ObjectId",
        collectionName: patientQueueCollection.collectionName
      };
      (response as any).debugInfo = debugInfo;
    }

    return NextResponse.json(response);

  } catch (error) {
    performanceLogger.logApiCall('/api/patient-queue', startTime, false);
    
    if (process.env.NODE_ENV === 'development') {
      console.error("Fetch patient queue error:", error);
    }
    
    return NextResponse.json({ 
      success: false,
      error: "Failed to fetch patient queue",
      code: 'API_ERROR',
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { appointmentKey, queueStatus, status } = body;
    
    if (!appointmentKey) {
      return NextResponse.json({ error: "Appointment key is required" }, { status: 400 });
    }

    const db = await getDatabase()
    const patientQueueCollection = db.collection("PatientQueue")

    const updateData: any = { updatedAt: new Date() }
    if (queueStatus) updateData.queueStatus = queueStatus
    if (status) updateData.status = status

    const result = await patientQueueCollection.updateOne(
      { appointmentKey },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Queue entry not found" }, { status: 404 });
    }

    const queueEntry = await patientQueueCollection.findOne({ appointmentKey })

    return NextResponse.json({
      success: true,
      queueEntry,
      message: `Queue status updated successfully`,
    })
  } catch (error) {
    console.error("Update patient queue error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

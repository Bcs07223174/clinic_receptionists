import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

// Cache for frequently accessed data (optional, for high-traffic scenarios)
const appointmentCache = new Map()
const CACHE_TTL = 30000 // 30 seconds cache

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cacheKey = request.url // Use URL as cache key
    
    // Check cache first (optional optimization)
    const cached = appointmentCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    let doctorIds = searchParams.getAll("doctorId")
    const singleId = searchParams.get("doctorId")
    
    // Efficient ID processing
    if (singleId && !doctorIds.includes(singleId)) {
      doctorIds.push(singleId)
    }
    
    // Fast validation and filtering
    const validDoctorIds = doctorIds.filter(id => 
      id && id !== 'undefined' && id !== 'null' && /^[0-9a-fA-F]{24}$/.test(id)
    )

    if (validDoctorIds.length === 0) {
      return NextResponse.json({ error: "Valid Doctor ID(s) required" }, { status: 400 })
    }

    const db = await getDatabase()
    const appointmentsCollection = db.collection("appointments")

    // Prepare both ObjectId and string queries for maximum compatibility
    const objectIdQuery = { doctorId: { $in: validDoctorIds.map(id => new ObjectId(id)) } }
    const stringIdQuery = { doctorId: { $in: validDoctorIds } }

    // Single optimized query using $or for both formats
    const appointments = await appointmentsCollection
      .find({
        $or: [objectIdQuery, stringIdQuery]
      })
      .sort({ appointmentDate: 1, timeSlot: 1 }) // Added secondary sort for consistency
      .project({ 
        // Only include necessary fields for better performance
        patientName: 1,
        patientEmail: 1,
        patientPhone: 1,
        appointmentDate: 1,
        timeSlot: 1,
        status: 1,
        reason: 1,
        rejectionReason: 1,
        createdAt: 1,
        doctorId: 1
      })
      .toArray()

    // Cache the result
    appointmentCache.set(cacheKey, {
      data: { appointments },
      timestamp: Date.now()
    })

    return NextResponse.json({ appointments })

  } catch (error) {
    console.error("Fetch appointments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await mongoose.startSession() // If using mongoose transactions
  session.startTransaction()
  
  try {
    const { appointmentId, status, rejectionReason, doctorId } = await request.json()

    if (!appointmentId || !status) {
      await session.abortTransaction()
      return NextResponse.json({ error: "Appointment ID and status are required" }, { status: 400 })
    }

    // Validate ObjectId format early
    if (!ObjectId.isValid(appointmentId)) {
      await session.abortTransaction()
      return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 })
    }

    const db = await getDatabase()
    const appointmentsCollection = db.collection("appointments")

    const updateData = {
      status,
      updatedAt: new Date(),
      ...(status === "rejected" && rejectionReason && { rejectionReason })
    }

    // Single atomic operation with better error handling
    const result = await appointmentsCollection.findOneAndUpdate(
      { _id: new ObjectId(appointmentId) },
      { $set: updateData },
      { 
        returnDocument: 'after',
        session // Include session if using transactions
      }
    )

    if (!result.value) {
      await session.abortTransaction()
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    const appointment = result.value

    // Handle schedule updates only if doctorId is provided and valid
    if (doctorId && ObjectId.isValid(doctorId)) {
      await handleScheduleUpdates(db, appointment, status, doctorId, rejectionReason)
    }

    await session.commitTransaction()
    
    return NextResponse.json({ 
      success: true, 
      appointment: {
        // Return only necessary fields
        _id: appointment._id,
        status: appointment.status,
        updatedAt: appointment.updatedAt,
        ...(appointment.rejectionReason && { rejectionReason: appointment.rejectionReason })
      }
    })

  } catch (error) {
    await session.abortTransaction()
    console.error("Update appointment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    await session.endSession()
  }
}

// Helper function for schedule management
async function handleScheduleUpdates(db, appointment, status, doctorId, rejectionReason) {
  const doctorSchedulesCollection = db.collection("doctor_schedules")
  const scheduleDate = new Date(appointment.appointmentDate).toISOString().split("T")[0]
  const timeSlot = appointment.timeSlot

  if (status === "rejected") {
    // Add slot back to available slots
    await doctorSchedulesCollection.updateOne(
      {
        doctorId: new ObjectId(doctorId),
        date: scheduleDate,
      },
      {
        $addToSet: { availableSlots: timeSlot },
        $setOnInsert: { 
          createdAt: new Date(),
          // Add other default fields if needed
        }
      },
      { upsert: true }
    )

    // Archive cancelled appointment
    const cancelledAppointmentsCollection = db.collection("cancelled_appointments")
    await cancelledAppointmentsCollection.insertOne({
      originalAppointmentId: appointment._id,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      rejectionReason,
      rejectedAt: new Date(),
      rejectedBy: "receptionist"
    })

  } else if (status === "confirmed") {
    // Remove slot from available slots
    await doctorSchedulesCollection.updateOne(
      {
        doctorId: new ObjectId(doctorId),
        date: scheduleDate,
      },
      {
        $pull: { availableSlots: timeSlot }
      }
    )
  }
}

// Optional: Background cleanup for cache
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of appointmentCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      appointmentCache.delete(key)
    }
  }
}, 60000) // Cleanup every minute
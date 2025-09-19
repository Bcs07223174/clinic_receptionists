import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let doctorIds = searchParams.getAll("doctorId")
    if (!doctorIds || doctorIds.length === 0) {
      const singleId = searchParams.get("doctorId")
      if (singleId) doctorIds = [singleId]
    }
    
    // Filter out undefined, null, or invalid IDs
    doctorIds = doctorIds.filter(id => id && id !== 'undefined' && id !== 'null' && id.length === 24)
    
    if (!doctorIds || doctorIds.length === 0) {
      return NextResponse.json({ error: "Valid Doctor ID(s) required" }, { status: 400 })
    }

    const db = await getDatabase()
    const patientQueueCollection = db.collection("PaitentQueue")

    console.log("=== PATIENT QUEUE FETCH DEBUG ===")
    console.log("Doctor IDs received:", doctorIds)

    try {
      const doctorObjectIds = doctorIds.map(id => new ObjectId(id))

      // Find patient queue entries by ObjectId
      let queueEntries = await patientQueueCollection
        .find({ doctorId: { $in: doctorObjectIds } })
        .toArray()

      console.log("Queue entries found by ObjectId:", queueEntries.length)

      // If no entries found, try searching by string ID
      if (queueEntries.length === 0) {
        console.log("No queue entries found by ObjectId, trying string search...")
        queueEntries = await patientQueueCollection
          .find({ doctorId: { $in: doctorIds } })
          .toArray()

        console.log("Queue entries found by string ID:", queueEntries.length)
      }

      // Sort by sessionStartTime with proper AM/PM handling
      queueEntries.sort((a, b) => {
        const timeA = convertTo24Hour(a.sessionStartTime || "00:00")
        const timeB = convertTo24Hour(b.sessionStartTime || "00:00")
        return timeA.localeCompare(timeB)
      })

      // If still no entries, let's check what's actually in the database
      if (queueEntries.length === 0) {
        console.log("No queue entries found, checking database structure...")
        const sampleEntries = await patientQueueCollection.find({}).limit(5).toArray()
        console.log("Sample queue entries in database:")
        sampleEntries.forEach(entry => {
          console.log(`- ID: ${entry._id}, doctorId: ${entry.doctorId} (type: ${typeof entry.doctorId}), patient: ${entry.patientName}`)
        })
      }

      return NextResponse.json({ 
        patientQueue: queueEntries, 
        debugInfo: { 
          doctorIds, 
          totalInDatabase: await patientQueueCollection.countDocuments(),
          searchedByObjectId: true,
          searchedByString: queueEntries.length === 0 
        }
      })
    } catch (objectIdError) {
      console.error("ObjectId conversion error:", objectIdError)
      return NextResponse.json({ error: "Invalid doctor ID format" }, { status: 400 })
    }
  } catch (error) {
    console.error("Fetch patient queue error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { appointmentKey, queueStatus, status } = await request.json()

    console.log("=== PATIENT QUEUE UPDATE ===")
    console.log("Appointment Key:", appointmentKey)
    console.log("New Queue Status:", queueStatus)
    console.log("New Status:", status)

    if (!appointmentKey) {
      return NextResponse.json({ error: "Appointment key is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const patientQueueCollection = db.collection("PaitentQueue")

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (queueStatus) updateData.queueStatus = queueStatus
    if (status) updateData.status = status

    // Update queue entry
    const result = await patientQueueCollection.updateOne(
      { appointmentKey: appointmentKey },
      { $set: updateData }
    )

    console.log("Update result:", result)

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Queue entry not found" }, { status: 404 })
    }

    // Get the updated queue entry
    const queueEntry = await patientQueueCollection.findOne({
      appointmentKey: appointmentKey,
    })

    console.log("Updated queue entry:", queueEntry)

    return NextResponse.json({ 
      success: true, 
      queueEntry,
      message: `Queue status updated successfully` 
    })
  } catch (error) {
    console.error("Update patient queue error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to convert time to 24-hour format for proper sorting
function convertTo24Hour(timeStr: string): string {
  if (!timeStr) return "00:00"
  
  // If already in 24-hour format (HH:MM), return as is
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return timeStr.padStart(5, '0')
  }
  
  // Handle 12-hour format (HH:MM AM/PM)
  const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i
  const match = timeStr.match(timeRegex)
  
  if (!match) return timeStr
  
  let hours = parseInt(match[1])
  const minutes = match[2]
  const period = match[3]?.toUpperCase()
  
  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`
}
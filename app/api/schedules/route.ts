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
    if (!doctorIds || doctorIds.length === 0) {
      return NextResponse.json({ error: "Doctor ID(s) required" }, { status: 400 })
    }

    const db = await getDatabase()
    const schedulesCollection = db.collection("doctor_schedules")

    // Convert to ObjectId
    const doctorObjectIds = doctorIds.map(id => new ObjectId(id))

    // Fetch schedules for all doctors
    const schedules = await schedulesCollection
      .find({ doctorId: { $in: doctorObjectIds } })
      .sort({ date: 1 })
      .toArray()

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error("Fetch schedules error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { doctorId, date, timeSlot } = await request.json()

    if (!doctorId || !date || !timeSlot) {
      return NextResponse.json({ error: "Doctor ID, date, and time slot are required" }, { status: 400 })
    }

    const db = await getDatabase()
    const schedulesCollection = db.collection("doctor_schedules")

    // Add time slot to existing schedule or create new one
    const result = await schedulesCollection.updateOne(
      {
        doctorId: new ObjectId(doctorId),
        date: date,
      },
      {
        $addToSet: {
          availableSlots: timeSlot,
        },
      },
      { upsert: true },
    )

    return NextResponse.json({
      success: true,
      scheduleId: result.upsertedId?.toString(),
    })
  } catch (error) {
    console.error("Add time slot error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { doctorId, date, timeSlot } = await request.json()

    if (!doctorId || !date || !timeSlot) {
      return NextResponse.json({ error: "Doctor ID, date, and time slot are required" }, { status: 400 })
    }

    const db = await getDatabase()
    const schedulesCollection = db.collection("doctor_schedules")

    // Remove time slot from schedule
    await schedulesCollection.updateOne(
      {
        doctorId: new ObjectId(doctorId),
        date: date,
      },
      {
        $pull: {
          availableSlots: timeSlot,
        },
      },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove time slot error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

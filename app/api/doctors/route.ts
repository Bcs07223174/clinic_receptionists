import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

// ---------------------- POST (seed doctors) ----------------------
export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase()
    const doctorsCollection = db.collection("doctors")

    const sampleDoctors = [
      {
        _id: new ObjectId("68c15cac7a7bea4f6c332685"),
        name: "Dr. Ahmed Khan",
        specialization: "Cardiology",
        email: "ahmed.khan@clinic.com",
        phone: "+92300123456",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId("68c195256b30441fa3cab701"),
        name: "Dr. Sarah Ali",
        specialization: "Pediatrics",
        email: "sarah.ali@clinic.com",
        phone: "+92301234567",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const operations = sampleDoctors.map((doctor) => ({
      replaceOne: {
        filter: { _id: doctor._id },
        replacement: doctor,
        upsert: true,
      },
    }))

    const result = await doctorsCollection.bulkWrite(operations)

    return NextResponse.json({
      success: true,
      message: "Sample doctors created/updated",
      result: {
        insertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
      },
    })
  } catch (error) {
    console.error("Create doctors error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------------------- GET (fetch doctors) ----------------------
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const doctorsCollection = db.collection("doctors")

    const doctors = await doctorsCollection.find({}).toArray()

    return NextResponse.json({
      doctors: doctors.map((doc) => ({
        _id: doc._id.toString(), // 🔹 convert ObjectId to string
        name: doc.name,
        specialization: doc.specialization,
      })),
    })
  } catch (error) {
    console.error("Fetch doctors error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

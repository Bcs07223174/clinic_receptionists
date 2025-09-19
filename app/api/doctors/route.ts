import { getDatabase } from "@/lib/mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const doctorsCollection = db.collection("doctors")

    // Fetch all doctors
    const doctors = await doctorsCollection.find({}).toArray()

    return NextResponse.json({ 
      doctors: doctors.map(doc => ({
        id: doc._id,
        name: doc.name,
        specialization: doc.specialization,
      }))
    })
  } catch (error) {
    console.error("Fetch doctors error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
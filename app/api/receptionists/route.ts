import { getDatabase } from "@/lib/mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()
    const receptionistsCollection = db.collection("receptionists")

    // Fetch all receptionists (for debugging)
    const receptionists = await receptionistsCollection.find({}).toArray()

    return NextResponse.json({ 
      receptionists: receptionists.map(rec => ({
        email: rec.email,
        name: rec.name,
        linkedDoctorIds: rec.linked_doctor_ids,
        hasPasswordHash: !!rec.passwordHash,
        hasPassword: !!rec.password,
      }))
    })
  } catch (error) {
    console.error("Fetch receptionists error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log("Login attempt with email:", email)
    console.log("Login attempt with password:", password)

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const db = await getDatabase()
    const receptionistsCollection = db.collection("receptionists")

    // First, let's see all receptionists for debugging
    const allReceptionists = await receptionistsCollection.find({}).toArray()
    console.log("All receptionists in database:", allReceptionists.map(r => ({
      email: r.email, 
      hasPasswordHash: !!r.passwordHash,
      hasPassword: !!r.password,
      linkedDoctorIds: r.linked_doctor_ids
    })))

    // Find receptionist by email and passwordHash
    const receptionist = await receptionistsCollection.findOne({
      email: email,
      passwordHash: password, // In production, use hashed passwords
    })

    console.log("Receptionist found with exact match:", !!receptionist)

    if (!receptionist) {
      // Try to find by email only to see if user exists
      const receptionistByEmail = await receptionistsCollection.findOne({ email: email })
      console.log("Receptionist exists with this email:", !!receptionistByEmail)
      if (receptionistByEmail) {
        console.log("But password doesn't match. Expected:", receptionistByEmail.passwordHash, "Got:", password)
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Get all linked doctors information
    const doctorsCollection = db.collection("doctors")
    let linkedDoctorIds = receptionist.linked_doctor_ids || [];
    
    console.log("Receptionist found:", receptionist.email)
    console.log("Linked doctor IDs:", linkedDoctorIds)

    if (linkedDoctorIds.length === 0) {
      return NextResponse.json({ error: "No doctors linked to this receptionist" }, { status: 404 })
    }

    // Convert string ids to ObjectId if needed
    const doctorObjectIds = linkedDoctorIds.map((id: any) => {
      try {
        return typeof id === 'string' ? new ObjectId(id) : id;
      } catch (error) {
        console.log("Failed to convert ID to ObjectId:", id, error)
        return null;
      }
    }).filter((id: any) => id !== null);

    console.log("Converted ObjectIds:", doctorObjectIds)

    if (doctorObjectIds.length === 0) {
      return NextResponse.json({ error: "Invalid doctor IDs format" }, { status: 400 })
    }

    const doctors = await doctorsCollection.find({
      _id: { $in: doctorObjectIds },
    }).toArray();

    console.log("Found doctors:", doctors.length)

    // Return success even if no doctors found, with empty array
    return NextResponse.json({
      success: true,
      receptionist: {
        id: receptionist._id,
        name: receptionist.name,
        email: receptionist.email,
        linkedDoctorIds: receptionist.linked_doctor_ids,
      },
      doctors: doctors.map((doc: any) => ({
        id: doc._id,
        name: doc.name,
        specialization: doc.specialization,
      })),
      message: doctors.length === 0 ? "No doctors found for linked IDs" : undefined
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

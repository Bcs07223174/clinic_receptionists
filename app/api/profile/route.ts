import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    
    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 })
    }

    console.log("Fetching profile for email:", email)

    const db = await getDatabase()
    
    // Get receptionist data
    const receptionistsCollection = db.collection("receptionists")
    const receptionist = await receptionistsCollection.findOne({ email })
    
    if (!receptionist) {
      return NextResponse.json({ error: "Receptionist not found" }, { status: 404 })
    }

    console.log("Found receptionist:", receptionist.email)
    console.log("Linked doctor IDs:", receptionist.linked_doctor_ids)

    // Get linked doctors
    const doctorsCollection = db.collection("doctors")
    let linkedDoctors: any[] = []
    
    if (receptionist.linked_doctor_ids && receptionist.linked_doctor_ids.length > 0) {
      const doctorObjectIds = receptionist.linked_doctor_ids.map((id: string) => new ObjectId(id))
      linkedDoctors = await doctorsCollection
        .find({ _id: { $in: doctorObjectIds } })
        .toArray()
      
      console.log(`Found ${linkedDoctors.length} linked doctors`)
    }

    // Format response
    const response = {
      receptionist: {
        _id: receptionist._id,
        email: receptionist.email,
        name: receptionist.name || null,
        phone: receptionist.phone || null,
        joined_date: receptionist.joined_date || receptionist.createdAt || null,
        linked_doctor_ids: receptionist.linked_doctor_ids || []
      },
      linkedDoctors: linkedDoctors.map(doctor => ({
        _id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization || null,
        email: doctor.email || null,
        phone: doctor.phone || null,
        experience: doctor.experience || null,
        qualification: doctor.qualification || null,
        department: doctor.department || null
      }))
    }

    console.log("Returning profile data:", response)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
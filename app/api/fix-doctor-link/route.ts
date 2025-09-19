import { getDatabase } from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const db = await getDatabase()
    
    console.log("=== FIXING DOCTOR LINKAGE ===")
    
    // Get the receptionist
    const receptionist = await db.collection("receptionists").findOne({
      email: "adminareceptionist@medicare.com"
    })
    
    if (!receptionist) {
      return NextResponse.json({ error: "Receptionist not found" }, { status: 404 })
    }
    
    // Get all available doctors
    const doctors = await db.collection("doctors").find({}).toArray()
    
    if (doctors.length === 0) {
      return NextResponse.json({ error: "No doctors found in database" }, { status: 404 })
    }
    
    // Use the first available doctor
    const firstDoctor = doctors[0]
    const newDoctorId = firstDoctor._id.toString()
    
    console.log("Current linked doctor IDs:", receptionist.linked_doctor_ids)
    console.log("Updating to use doctor:", firstDoctor.name, "ID:", newDoctorId)
    
    // Update the receptionist with the new doctor ID
    const updateResult = await db.collection("receptionists").updateOne(
      { email: "adminareceptionist@medicare.com" },
      { $set: { linked_doctor_ids: [newDoctorId] } }
    )
    
    console.log("Update result:", updateResult)
    
    if (updateResult.modifiedCount > 0) {
      // Verify the update
      const updatedReceptionist = await db.collection("receptionists").findOne({
        email: "adminareceptionist@medicare.com"
      })
      
      return NextResponse.json({
        success: true,
        message: "Doctor linkage fixed successfully",
        oldDoctorIds: receptionist.linked_doctor_ids,
        newDoctorId: newDoctorId,
        linkedDoctor: {
          id: firstDoctor._id.toString(),
          name: firstDoctor.name,
          email: firstDoctor.email,
          specialization: firstDoctor.specialization
        },
        updatedReceptionist: {
          email: updatedReceptionist?.email,
          linked_doctor_ids: updatedReceptionist?.linked_doctor_ids
        }
      })
    } else {
      return NextResponse.json({ error: "Failed to update doctor linkage" }, { status: 500 })
    }
    
  } catch (error) {
    console.error("Fix doctor linkage error:", error)
    return NextResponse.json({ error: "Fix failed", details: error.message }, { status: 500 })
  }
}
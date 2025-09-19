import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = await getDatabase()
    const appointmentsCollection = db.collection("appointments")
    const doctorsCollection = db.collection("doctors")
    const receptionistsCollection = db.collection("receptionists")

    console.log("=== COMPREHENSIVE APPOINTMENTS DATA CHECK ===")

    // 1. Check total appointments count
    const totalAppointments = await appointmentsCollection.countDocuments()
    console.log("Total appointments in database:", totalAppointments)

    // 2. Get sample appointments to see structure
    const sampleAppointments = await appointmentsCollection.find({}).limit(10).toArray()
    console.log("Sample appointments:")
    sampleAppointments.forEach((apt, index) => {
      console.log(`${index + 1}. ID: ${apt._id}`)
      console.log(`   Doctor ID: ${apt.doctorId} (type: ${typeof apt.doctorId})`)
      console.log(`   Patient: ${apt.patientName}`)
      console.log(`   Date: ${apt.appointmentDate}`)
      console.log(`   Status: ${apt.status}`)
      console.log("---")
    })

    // 3. Check unique doctor IDs in appointments
    const uniqueDoctorIds = await appointmentsCollection.distinct("doctorId")
    console.log("Unique doctor IDs in appointments:", uniqueDoctorIds)

    // 4. Check current receptionist data
    const receptionist = await receptionistsCollection.findOne({ 
      email: "adminareceptionist@medicare.com" 
    })
    console.log("Current receptionist:", {
      email: receptionist?.email,
      linkedDoctorIds: receptionist?.linked_doctor_ids
    })

    // 5. Check if linked doctor exists
    if (receptionist?.linked_doctor_ids?.length > 0) {
      const linkedDoctorId = receptionist.linked_doctor_ids[0]
      console.log("Checking linked doctor:", linkedDoctorId)
      
      const doctor = await doctorsCollection.findOne({ 
        _id: new ObjectId(linkedDoctorId) 
      })
      console.log("Linked doctor exists:", !!doctor)
      if (doctor) {
        console.log("Doctor name:", doctor.name)
      }

      // 6. Check appointments for this specific doctor
      const appointmentsByObjectId = await appointmentsCollection
        .find({ doctorId: new ObjectId(linkedDoctorId) })
        .toArray()
      console.log(`Appointments for doctor (ObjectId): ${appointmentsByObjectId.length}`)

      const appointmentsByString = await appointmentsCollection
        .find({ doctorId: linkedDoctorId })
        .toArray()
      console.log(`Appointments for doctor (String): ${appointmentsByString.length}`)
    }

    // 7. Group appointments by doctor ID
    const appointmentsByDoctor = await appointmentsCollection.aggregate([
      {
        $group: {
          _id: "$doctorId",
          count: { $sum: 1 },
          appointments: { $push: { 
            id: "$_id", 
            patient: "$patientName", 
            date: "$appointmentDate",
            status: "$status"
          }}
        }
      }
    ]).toArray()

    console.log("Appointments grouped by doctor:")
    appointmentsByDoctor.forEach(group => {
      console.log(`Doctor ID: ${group._id} (${group.count} appointments)`)
      group.appointments.forEach((apt: any) => {
        console.log(`  - ${apt.patient} on ${apt.date} (${apt.status})`)
      })
    })

    // Return comprehensive data
    return NextResponse.json({
      totalAppointments,
      sampleAppointments: sampleAppointments.slice(0, 5), // Limit for response size
      uniqueDoctorIds,
      appointmentsByDoctor,
      receptionist: {
        email: receptionist?.email,
        linkedDoctorIds: receptionist?.linked_doctor_ids
      },
      linkedDoctorCheck: receptionist?.linked_doctor_ids?.length > 0 ? {
        doctorId: receptionist.linked_doctor_ids[0],
        appointmentsByObjectId: (await appointmentsCollection
          .find({ doctorId: new ObjectId(receptionist.linked_doctor_ids[0]) })
          .toArray()).length,
        appointmentsByString: (await appointmentsCollection
          .find({ doctorId: receptionist.linked_doctor_ids[0] })
          .toArray()).length
      } : null
    })

  } catch (error) {
    console.error("Test appointments data error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
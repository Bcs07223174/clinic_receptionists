import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = await getDatabase()
    
    console.log("=== COMPREHENSIVE APPOINTMENT DEBUG ===")
    
    // 1. Check receptionist data
    const receptionist = await db.collection("receptionists").findOne({
      email: "adminareceptionist@medicare.com"
    })
    console.log("1. Receptionist found:", !!receptionist)
    console.log("   Linked doctor IDs:", receptionist?.linked_doctor_ids)
    
    // 2. Check all doctors
    const allDoctors = await db.collection("doctors").find({}).toArray()
    console.log("2. Total doctors in database:", allDoctors.length)
    allDoctors.forEach((doc, i) => {
      console.log(`   Doctor ${i+1}: ${doc._id} - ${doc.name} (${doc.email})`)
    })
    
    // 3. Check all appointments
    const allAppointments = await db.collection("appointments").find({}).toArray()
    console.log("3. Total appointments in database:", allAppointments.length)
    allAppointments.forEach((apt, i) => {
      console.log(`   Appointment ${i+1}: doctorId=${apt.doctorId} (type: ${typeof apt.doctorId}) - Patient: ${apt.patientName}`)
    })
    
    // 4. If receptionist has linked doctors, check if they exist
    let linkedDoctorExists = false
    let linkedDoctor = null
    let appointmentsForLinkedDoctor = []
    
    if (receptionist?.linked_doctor_ids?.length > 0) {
      const linkedDoctorId = receptionist.linked_doctor_ids[0]
      console.log("4. Checking linked doctor ID:", linkedDoctorId)
      
      // Try to find doctor by ObjectId
      try {
        linkedDoctor = await db.collection("doctors").findOne({
          _id: new ObjectId(linkedDoctorId)
        })
        linkedDoctorExists = !!linkedDoctor
        console.log("   Found by ObjectId:", !!linkedDoctor)
      } catch (error) {
        console.log("   ObjectId conversion failed:", error.message)
      }
      
      // If not found, try by string
      if (!linkedDoctor) {
        linkedDoctor = await db.collection("doctors").findOne({
          _id: linkedDoctorId
        })
        console.log("   Found by string:", !!linkedDoctor)
      }
      
      // 5. Check appointments for this doctor
      if (linkedDoctor) {
        console.log("5. Checking appointments for linked doctor...")
        
        // Search by ObjectId
        appointmentsForLinkedDoctor = await db.collection("appointments").find({
          doctorId: new ObjectId(linkedDoctorId)
        }).toArray()
        console.log("   Appointments by ObjectId:", appointmentsForLinkedDoctor.length)
        
        // If none found, search by string
        if (appointmentsForLinkedDoctor.length === 0) {
          appointmentsForLinkedDoctor = await db.collection("appointments").find({
            doctorId: linkedDoctorId
          }).toArray()
          console.log("   Appointments by string:", appointmentsForLinkedDoctor.length)
        }
      }
    }
    
    // 6. Test what the actual API call would return
    let apiTestResult = null
    if (receptionist?.linked_doctor_ids?.length > 0) {
      const testDoctorId = receptionist.linked_doctor_ids[0]
      console.log("6. Testing API call with doctor ID:", testDoctorId)
      
      try {
        // Simulate the API call logic
        const doctorObjectIds = [new ObjectId(testDoctorId)]
        let testAppointments = await db.collection("appointments")
          .find({ doctorId: { $in: doctorObjectIds } })
          .toArray()
          
        if (testAppointments.length === 0) {
          testAppointments = await db.collection("appointments")
            .find({ doctorId: { $in: [testDoctorId] } })
            .toArray()
        }
        
        apiTestResult = {
          success: true,
          appointmentCount: testAppointments.length,
          appointments: testAppointments
        }
        console.log("   API test result:", testAppointments.length, "appointments")
      } catch (error) {
        apiTestResult = {
          success: false,
          error: error.message
        }
        console.log("   API test failed:", error.message)
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      receptionist: {
        found: !!receptionist,
        email: receptionist?.email,
        linked_doctor_ids: receptionist?.linked_doctor_ids,
        hasLinkedDoctors: !!(receptionist?.linked_doctor_ids?.length)
      },
      doctors: {
        total: allDoctors.length,
        list: allDoctors.map(doc => ({
          id: doc._id.toString(),
          name: doc.name,
          email: doc.email,
          specialization: doc.specialization
        }))
      },
      appointments: {
        total: allAppointments.length,
        list: allAppointments.map(apt => ({
          id: apt._id.toString(),
          patientName: apt.patientName,
          doctorId: apt.doctorId,
          doctorIdType: typeof apt.doctorId,
          appointmentDate: apt.appointmentDate,
          status: apt.status
        }))
      },
      linkedDoctor: linkedDoctor ? {
        id: linkedDoctor._id.toString(),
        name: linkedDoctor.name,
        email: linkedDoctor.email,
        exists: linkedDoctorExists
      } : null,
      appointmentsForLinkedDoctor: appointmentsForLinkedDoctor.map(apt => ({
        id: apt._id.toString(),
        patientName: apt.patientName,
        appointmentDate: apt.appointmentDate,
        status: apt.status
      })),
      apiTestResult
    })
    
  } catch (error) {
    console.error("Comprehensive debug error:", error)
    return NextResponse.json({ 
      error: "Debug failed", 
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
import { ObjectId } from "mongodb";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { sessionToken } = await request.json();

    // Validate session token presence
    if (!sessionToken || !sessionToken.startsWith("session_")) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    // Extract receptionist ID from token
    // Format: session_{receptionistId}_{timestamp}_{random}
    const tokenParts = sessionToken.split("_");
    if (tokenParts.length < 4 || tokenParts[0] !== "session") {
      return NextResponse.json({ error: "Invalid session token format" }, { status: 401 });
    }

    let receptionistId = tokenParts[1];

    // Validate ObjectId format
    if (!ObjectId.isValid(receptionistId)) {
      return NextResponse.json({ error: "Invalid receptionist ID in session token" }, { status: 401 });
    }

    const db = await getDatabase();
    const receptionistsCollection = db.collection("receptionists");

    // Find receptionist by _id
    const receptionist = await receptionistsCollection.findOne({
      _id: new ObjectId(receptionistId),
    });

    if (!receptionist) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    // Get linked doctors
    const doctorsCollection = db.collection("doctors");
    const linkedDoctorIds: string[] = receptionist.linked_doctor_ids || [];

    const doctorObjectIds = linkedDoctorIds
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((id) => id !== null);

    const doctors = await doctorsCollection.find({ _id: { $in: doctorObjectIds } }).toArray();

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
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json({ error: "Session validation failed" }, { status: 500 });
  }
}

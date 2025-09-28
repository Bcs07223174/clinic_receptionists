import { NextRequest, NextResponse } from "next/server";

// Declare require for TypeScript
declare const require: any;

// Type definitions to avoid TypeScript errors
interface ReceptionistDocument {
  _id: any;
  name: string;
  email: string;
  passwordHash: string;
  linked_doctor_ids: string[];
}

interface DoctorDocument {
  _id: any;
  name: string;
  specialization: string;
}

export async function POST(request: NextRequest) {
  try {
    // Import modules using require to avoid module resolution issues
    const { ObjectId } = require("mongodb");
    const { getDatabase } = require("../../../../lib/mongodb.js");

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const receptionistsCollection = db.collection("receptionists");

    // ✅ Find receptionist with passwordHash field
    const receptionist: ReceptionistDocument = await receptionistsCollection.findOne({
      email: email,
      passwordHash: password,
    });

    if (!receptionist) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // --- Fetch linked doctors ---
    const doctorsCollection = db.collection("doctors");
    const linkedDoctorIds = receptionist.linked_doctor_ids || [];

    if (linkedDoctorIds.length === 0) {
      return NextResponse.json(
        { error: "No doctors linked to this receptionist" },
        { status: 404 }
      );
    }

    // Convert IDs to ObjectId safely
    const doctorObjectIds = linkedDoctorIds
      .map((id: any) => {
        try {
          return typeof id === "string" ? new ObjectId(id) : id;
        } catch {
          return null;
        }
      })
      .filter((id: any) => id !== null);

    if (doctorObjectIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid doctor IDs format" },
        { status: 400 }
      );
    }

    const doctors: DoctorDocument[] = await doctorsCollection
      .find({ _id: { $in: doctorObjectIds } })
      .toArray();

    // Generate session token
    const sessionToken = `session_${receptionist._id}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // ✅ Success
    return NextResponse.json({
      success: true,
      sessionToken,
      receptionist: {
        id: receptionist._id,
        name: receptionist.name,
        email: receptionist.email,
        linkedDoctorIds: receptionist.linked_doctor_ids,
      },
      doctors: doctors.map((doc) => ({
        id: doc._id,
        name: doc.name,
        specialization: doc.specialization,
      })),
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://hissaalkatheeb:Hissa123@cluster0.1qhyp.mongodb.net/clin?retryWrites=true&w=majority&appName=Cluster0";

async function verifyDoctorLink() {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        
        const db = client.db("clin");
        
        // Check current receptionist data
        console.log("\n=== CHECKING RECEPTIONIST ===");
        const receptionist = await db.collection("receptionists").findOne({
            email: "adminareceptionist@medicare.com"
        });
        console.log("Receptionist data:", JSON.stringify(receptionist, null, 2));
        
        // Check what doctors exist
        console.log("\n=== CHECKING AVAILABLE DOCTORS ===");
        const doctors = await db.collection("doctors").find({}).toArray();
        console.log("Available doctors:");
        doctors.forEach(doc => {
            console.log(`- ID: ${doc._id}, Name: ${doc.name}, Email: ${doc.email}`);
        });
        
        // Check if the linked doctor ID exists
        if (receptionist && receptionist.linked_doctor_ids && receptionist.linked_doctor_ids.length > 0) {
            console.log("\n=== CHECKING DOCTOR LINKAGE ===");
            const linkedDoctorId = receptionist.linked_doctor_ids[0];
            console.log("Linked doctor ID:", linkedDoctorId);
            
            const linkedDoctor = await db.collection("doctors").findOne({
                _id: new ObjectId(linkedDoctorId)
            });
            
            if (linkedDoctor) {
                console.log("✅ Linked doctor found:", linkedDoctor.name, linkedDoctor.email);
            } else {
                console.log("❌ Linked doctor NOT found in database");
                
                // Get the first available doctor to fix the link
                if (doctors.length > 0) {
                    const firstDoctor = doctors[0];
                    console.log(`\n=== FIXING DOCTOR LINKAGE ===`);
                    console.log(`Will link to first available doctor: ${firstDoctor.name} (${firstDoctor._id})`);
                    
                    const updateResult = await db.collection("receptionists").updateOne(
                        { email: "adminareceptionist@medicare.com" },
                        { $set: { linked_doctor_ids: [firstDoctor._id.toString()] } }
                    );
                    
                    console.log("Update result:", updateResult);
                    
                    if (updateResult.modifiedCount > 0) {
                        console.log("✅ Doctor linkage fixed successfully!");
                        
                        // Verify the fix
                        const updatedReceptionist = await db.collection("receptionists").findOne({
                            email: "adminareceptionist@medicare.com"
                        });
                        console.log("Updated receptionist data:", JSON.stringify(updatedReceptionist, null, 2));
                    }
                }
            }
        }
        
        // Check appointments for the doctor
        if (receptionist && receptionist.linked_doctor_ids && receptionist.linked_doctor_ids.length > 0) {
            console.log("\n=== CHECKING APPOINTMENTS ===");
            const doctorId = receptionist.linked_doctor_ids[0];
            console.log("Looking for appointments with doctorId:", doctorId);
            
            const appointments = await db.collection("appointments").find({
                doctorId: doctorId
            }).toArray();
            
            console.log(`Found ${appointments.length} appointments for this doctor`);
            appointments.forEach(apt => {
                console.log(`- Patient: ${apt.patientName}, Date: ${apt.appointmentDate}, Status: ${apt.status}`);
            });
        }
        
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
    }
}

verifyDoctorLink();
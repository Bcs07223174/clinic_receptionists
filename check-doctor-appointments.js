const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://usman:d8GIZCXJOrwrNjUG@cluster0.1ibxrfz.mongodb.net/clin?retryWrites=true&w=majority&appName=Cluster0';

async function checkDoctorAppointments() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('clin');
    
    console.log('=== CURRENT RECEPTIONIST DATA ===');
    const receptionist = await db.collection('receptionists').findOne({ email: 'adminareceptionist@medicare.com' });
    console.log('Receptionist:', JSON.stringify(receptionist, null, 2));
    
    console.log('\n=== AVAILABLE DOCTORS ===');
    const doctors = await db.collection('doctors').find({}).toArray();
    doctors.forEach(doc => {
      console.log(`Doctor ID: ${doc._id}, Name: ${doc.name}, Email: ${doc.email}`);
    });
    
    console.log('\n=== APPOINTMENTS FOR THIS DOCTOR ===');
    if (receptionist && receptionist.linked_doctor_ids && receptionist.linked_doctor_ids.length > 0) {
      const doctorId = receptionist.linked_doctor_ids[0];
      console.log('Looking for appointments with doctorId:', doctorId);
      
      try {
        const appointments = await db.collection('appointments').find({ doctorId: new ObjectId(doctorId) }).toArray();
        console.log('Found appointments:', appointments.length);
        appointments.forEach(apt => {
          console.log(`- Patient: ${apt.patientName}, Date: ${apt.appointmentDate}, Status: ${apt.status}`);
        });
        
        if (appointments.length === 0) {
          console.log('\n=== CHECKING ALL APPOINTMENTS ===');
          const allAppointments = await db.collection('appointments').find({}).toArray();
          console.log('Total appointments in database:', allAppointments.length);
          allAppointments.forEach(apt => {
            console.log(`- Doctor ID: ${apt.doctorId}, Patient: ${apt.patientName}, Date: ${apt.appointmentDate}`);
          });
        }
      } catch (err) {
        console.error('Error finding appointments:', err);
      }
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await client.close();
  }
}

checkDoctorAppointments();
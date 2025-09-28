// Check receptionist structure
const { getDatabase } = require('./lib/mongodb.ts');

async function checkReceptionistStructure() {
  console.log('🔍 Checking receptionist structure...');
  
  try {
    const db = await getDatabase();
    
    // Get all receptionists to see their structure
    console.log('⏳ Fetching all receptionists...');
    const receptionists = await db.collection('receptionists').find({}).toArray();
    
    console.log(`📊 Found ${receptionists.length} receptionists:`);
    
    receptionists.forEach((receptionist, index) => {
      console.log(`\n👤 Receptionist ${index + 1}:`);
      console.log('  ID:', receptionist._id);
      console.log('  Name:', receptionist.name);
      console.log('  Email:', receptionist.email);
      console.log('  Password field:', receptionist.password || receptionist.passwordHash || 'NOT FOUND');
      console.log('  Linked doctors:', receptionist.linked_doctor_ids || 'NOT FOUND');
      console.log('  All fields:', Object.keys(receptionist));
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkReceptionistStructure();

checkReceptionistStructure();
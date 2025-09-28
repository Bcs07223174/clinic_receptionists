// Test MongoDB connection directly
import { getDatabase } from './lib/mongodb.ts';

async function testMongoDB() {
  console.log('🔍 Testing MongoDB connection...');
  
  try {
    const db = await getDatabase();
    console.log('✅ Database connected successfully');
    
    // Test basic operations
    const receptionists = await db.collection('receptionists').findOne({});
    console.log('📄 Sample receptionist:', receptionists ? 'Found' : 'Not found');
    
    const doctors = await db.collection('doctors').findOne({});
    console.log('👨‍⚕️ Sample doctor:', doctors ? 'Found' : 'Not found');
    
    console.log('🎉 MongoDB test completed successfully');
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error);
  }
}

testMongoDB();
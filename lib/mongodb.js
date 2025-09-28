const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || "mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/";
const dbName = process.env.MONGODB_DB || "clin";

let client;
let clientPromise;

// Performance-optimized MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  maxConnecting: 5,
  retryWrites: true,
  retryReads: true,
  compressors: ['snappy', 'zlib'],
  readPreference: 'secondaryPreferred',
};

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, mongoOptions);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, mongoOptions);
  clientPromise = client.connect();
}

// Database connection with connection pooling
let cachedDb = null;
let connectionPromise = null;

async function getDatabase() {
  try {
    // Return cached connection if available and still connected
    if (cachedDb) {
      try {
        await cachedDb.admin().ping();
        return cachedDb;
      } catch (pingError) {
        console.log('Cached connection lost, reconnecting...');
        cachedDb = null;
      }
    }
    
    // If there's already a connection attempt in progress, wait for it
    if (connectionPromise) {
      return await connectionPromise;
    }
    
    // Create new connection promise
    connectionPromise = (async () => {
      const client = await clientPromise;
      const db = client.db(dbName);
      
      // Test the connection
      await db.admin().ping();
      console.log('✅ MongoDB connected successfully');
      
      // Cache the database connection
      cachedDb = db;
      connectionPromise = null;
      return db;
    })();
    
    return await connectionPromise;
    
  } catch (error) {
    connectionPromise = null;
    cachedDb = null;
    
    console.error('❌ MongoDB connection error:', error);
    
    if (error.message.includes('authentication failed')) {
      throw new Error('Database authentication failed - check credentials');
    } else if (error.message.includes('timeout')) {
      throw new Error('Database connection timeout - check network');
    } else if (error.message.includes('ENOTFOUND')) {
      throw new Error('Database host not found - check connection string');
    }
    
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
}

module.exports = { 
  default: clientPromise, 
  getDatabase,
  clientPromise 
};
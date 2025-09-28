import { Db, MongoClient } from "mongodb";

// TypeScript interfaces for database documents
export interface ReceptionistDocument {
  _id?: any;
  name: string;
  email: string;
  phone?: string;
  role: string;
  linked_doctor_ids: string[];
  photoUrl?: string;
  passwordHash: string;
  status: string;
  isAvailable: boolean;
  department?: string;
  shift?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastLogin?: Date | null;
}

export interface DoctorDocument {
  _id?: any;
  name: string;
  email?: string;
  specialization: string;
  phone?: string;
  department?: string;
  isAvailable?: boolean;
  schedule?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppointmentDocument {
  _id?: any;
  appointmentKey: string;
  doctorId: any;
  doctorName: string;
  patientId: any;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  address?: string;
  date: string;
  time: string;
  sessionStartTime?: string;
  status: string;
  reason?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const uri = process.env.MONGODB_URI || "mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/"
const dbName = process.env.MONGODB_DB || "clin"

let client: MongoClient
let clientPromise: Promise<MongoClient>

// Performance-optimized MongoDB connection options
const mongoOptions = {
  serverSelectionTimeoutMS: 8000, // Reduced from 10s to 8s
  connectTimeoutMS: 8000,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 5,  // Maintain a minimum of 5 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  maxConnecting: 5, // Maximum number of connections being established
  retryWrites: true, // Enable retryable writes
  retryReads: true,  // Enable retryable reads
  compressors: ['snappy' as const, 'zlib' as const], // Enable compression
  readPreference: 'secondaryPreferred' as const, // Prefer secondary for reads to reduce load
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, mongoOptions)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, mongoOptions)
  clientPromise = client.connect()
}

// Database connection with connection pooling
let cachedDb: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

export async function getDatabase(): Promise<Db> {
  try {
    // Return cached connection if available and still connected
    if (cachedDb) {
      // Test if connection is still alive
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
      connectionPromise = null; // Clear the promise after successful connection
      return db;
    })();
    
    return await connectionPromise;
    
  } catch (error) {
    connectionPromise = null; // Clear failed promise
    cachedDb = null; // Reset cache on error
    
    console.error('❌ MongoDB connection error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('authentication failed')) {
        throw new Error('Database authentication failed - check credentials');
      } else if (error.message.includes('timeout')) {
        throw new Error('Database connection timeout - check network');
      } else if (error.message.includes('ENOTFOUND')) {
        throw new Error('Database host not found - check connection string');
      }
    }
    
    throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default clientPromise

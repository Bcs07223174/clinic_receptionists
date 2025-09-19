import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/"
const dbName = process.env.MONGODB_DB || "clin"

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
      connectTimeoutMS: 10000,
    })
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
  clientPromise = client.connect()
}

export async function getDatabase() {
  try {
    const client = await clientPromise
    return client.db(dbName)
  } catch (error) {
    console.error("MongoDB connection error:", error)
    throw new Error("Failed to connect to database")
  }
}

export default clientPromise

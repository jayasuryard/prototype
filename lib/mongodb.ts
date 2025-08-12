import { MongoClient, type Db } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb+srv://jayasuryard:LaSO24NVgXK0yPMz@cluster0.udisp08.mongodb.net/"

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    const client = await clientPromise
    const db = client.db("healthcare_ai")
    await db.admin().ping()
    console.log("MongoDB connection successful")
    return { client, db }
  } catch (error) {
    console.error("MongoDB connection error:", error)
    throw error
  }
}

export async function getDatabase(): Promise<Db> {
  try {
    console.log("Attempting to connect to MongoDB...")
    const client = await clientPromise
    const db = client.db("healthcare_ai")

    await db.admin().ping()
    console.log("✅ MongoDB connection successful - database: healthcare_ai")

    const userCount = await db.collection("users").countDocuments()
    console.log(`📊 Users collection has ${userCount} documents`)

    return db
  } catch (error) {
    console.error("❌ MongoDB database access error:", error)
    throw new Error(`Database connection failed: ${error}`)
  }
}

export default clientPromise

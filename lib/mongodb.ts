import { MongoClient, type Db } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb+srv://jayasuryard:LaSO24NVgXK0yPMz@cluster0.udisp08.mongodb.net/"

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function initializeDatabase(): Promise<Db> {
  try {
    console.log("🔄 Initializing MongoDB connection and collections...")
    const client = await clientPromise
    const db = client.db("healthcare_ai")

    // Test connection
    await db.admin().ping()
    console.log("✅ MongoDB connection successful - database: healthcare_ai")

    // Create collections if they don't exist and set up indexes
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    // Users collection
    if (!collectionNames.includes("users")) {
      await db.createCollection("users")
      console.log("📁 Created 'users' collection")
    }

    // Create indexes for users collection
    await db.collection("users").createIndex({ googleId: 1 }, { unique: true })
    await db.collection("users").createIndex({ email: 1 })
    console.log("🔍 Created indexes for users collection")

    // Chat messages collection
    if (!collectionNames.includes("chat_messages")) {
      await db.createCollection("chat_messages")
      console.log("📁 Created 'chat_messages' collection")
    }

    // Create indexes for chat messages
    await db.collection("chat_messages").createIndex({ userId: 1 })
    await db.collection("chat_messages").createIndex({ timestamp: -1 })
    console.log("🔍 Created indexes for chat_messages collection")

    const userCount = await db.collection("users").countDocuments()
    const chatCount = await db.collection("chat_messages").countDocuments()
    console.log(`📊 Database initialized - Users: ${userCount}, Chat messages: ${chatCount}`)

    return db
  } catch (error) {
    console.error("❌ MongoDB initialization error:", error)
    throw error
  }
}

export async function getDatabase(): Promise<Db> {
  try {
    const db = await initializeDatabase()
    return db
  } catch (error) {
    console.error("❌ MongoDB database access error:", error)
    throw new Error(`Database connection failed: ${error}`)
  }
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    const client = await clientPromise
    const db = await initializeDatabase()
    return { client, db }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    throw error
  }
}

export default clientPromise

// This script sets up JSON schema validation for the 'users' collection in your MongoDB database.
// Run this script once using: `node scripts/setupUserCollectionValidation.js`

// Standalone script to set up JSON schema validation for the 'users' collection in MongoDB
// Usage: node scripts/setupUserCollectionValidation.js

const { MongoClient } = require('mongodb')

const uri = process.env.MONGODB_URI || "mongodb+srv://jayasuryard:LaSO24NVgXK0yPMz@cluster0.udisp08.mongodb.net/"
const dbName = "healthcare_ai"

async function main() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)
    await db.command({
      collMod: "users",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["googleId", "email", "name", "onboardingCompleted", "createdAt", "updatedAt"],
          properties: {
            googleId: { bsonType: "string" },
            email: { bsonType: "string" },
            name: { bsonType: "string" },
            picture: { bsonType: "string" },
            onboardingData: {
              bsonType: "object",
              required: ["dateOfBirth", "age", "profession"],
              properties: {
                dateOfBirth: { bsonType: "string" },
                age: { bsonType: "int" },
                profession: { enum: ["medico", "non-medico"] },
                usage: { enum: ["practice", "personal"] },
                specialty: { bsonType: "string" },
                experienceYears: { bsonType: "int" },
                gender: { bsonType: "string" },
                height: { bsonType: "int" },
                weight: { bsonType: "int" },
                habits: { bsonType: "string" },
                mealsPerDay: { bsonType: "int" },
                waterIntake: { bsonType: "int" },
                exerciseRoutine: { bsonType: "string" },
              },
            },
            personalizedPrompt: { bsonType: "string" },
            onboardingCompleted: { bsonType: "bool" },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" },
          },
        },
      },
      validationLevel: "moderate",
    })
    console.log("'users' collection schema validation set up successfully.")
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') {
      // Collection does not exist yet, create with validation
      const db = client.db(dbName)
      await db.createCollection("users", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["googleId", "email", "name", "onboardingCompleted", "createdAt", "updatedAt"],
            properties: {
              googleId: { bsonType: "string" },
              email: { bsonType: "string" },
              name: { bsonType: "string" },
              picture: { bsonType: "string" },
              onboardingData: {
                bsonType: "object",
                required: ["dateOfBirth", "age", "profession"],
                properties: {
                  dateOfBirth: { bsonType: "string" },
                  age: { bsonType: "int" },
                  profession: { enum: ["medico", "non-medico"] },
                  usage: { enum: ["practice", "personal"] },
                  specialty: { bsonType: "string" },
                  experienceYears: { bsonType: "int" },
                  gender: { bsonType: "string" },
                  height: { bsonType: "int" },
                  weight: { bsonType: "int" },
                  habits: { bsonType: "string" },
                  mealsPerDay: { bsonType: "int" },
                  waterIntake: { bsonType: "int" },
                  exerciseRoutine: { bsonType: "string" },
                },
              },
              personalizedPrompt: { bsonType: "string" },
              onboardingCompleted: { bsonType: "bool" },
              createdAt: { bsonType: "date" },
              updatedAt: { bsonType: "date" },
            },
          },
        },
        validationLevel: "moderate",
      })
      console.log("'users' collection created with schema validation.")
    } else {
      console.error(err)
    }
  } finally {
    await client.close()
  }
}

main()

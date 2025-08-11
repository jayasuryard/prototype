"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"

interface OnboardingData {
  dateOfBirth: string
  age: number
  profession: "medico" | "non-medico" | ""
  // Medico specific
  usage?: "practice" | "personal"
  specialty?: string
  experienceYears?: number
  // Personal/Non-medico specific
  gender?: string
  heightFeet?: number
  heightInches?: number
  weight?: number
  habits?: string[]
  mealsPerDay?: number
  waterIntake?: number
  exerciseRoutine?: string[]
  dietType?: string
  sleepHours?: number
  stressLevel?: string
  medicalConditions?: string[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    dateOfBirth: "",
    age: 0,
    profession: "",
    habits: [],
    exerciseRoutine: [],
    medicalConditions: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalSteps = data.profession === "medico" ? (data.usage === "practice" ? 4 : 5) : 5

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push("/chat")
      } else {
        throw new Error("Failed to save onboarding data")
      }
    } catch (error) {
      console.error("Onboarding submission error:", error)
      alert("Failed to save your information. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHabitsChange = (habit: string, checked: boolean) => {
    const currentHabits = data.habits || []
    if (checked) {
      setData({ ...data, habits: [...currentHabits, habit] })
    } else {
      setData({ ...data, habits: currentHabits.filter((h) => h !== habit) })
    }
  }

  const handleExerciseChange = (exercise: string, checked: boolean) => {
    const currentExercise = data.exerciseRoutine || []
    if (checked) {
      setData({ ...data, exerciseRoutine: [...currentExercise, exercise] })
    } else {
      setData({ ...data, exerciseRoutine: currentExercise.filter((e) => e !== exercise) })
    }
  }

  const handleMedicalConditionsChange = (condition: string, checked: boolean) => {
    const currentConditions = data.medicalConditions || []
    if (checked) {
      setData({ ...data, medicalConditions: [...currentConditions, condition] })
    } else {
      setData({ ...data, medicalConditions: currentConditions.filter((c) => c !== condition) })
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={data.dateOfBirth}
                onChange={(e) => {
                  const age = calculateAge(e.target.value)
                  setData({ ...data, dateOfBirth: e.target.value, age })
                }}
                required
              />
              {data.age > 0 && <p className="text-sm text-gray-600 mt-1">Age: {data.age} years</p>}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <Label>What is your profession?</Label>
            <RadioGroup
              value={data.profession}
              onValueChange={(value: "medico" | "non-medico") => setData({ ...data, profession: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medico" id="medico" />
                <Label htmlFor="medico">Medical Professional</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non-medico" id="non-medico" />
                <Label htmlFor="non-medico">Non-Medical Professional</Label>
              </div>
            </RadioGroup>
          </div>
        )

      case 3:
        if (data.profession === "medico") {
          return (
            <div className="space-y-4">
              <Label>How will you use this platform?</Label>
              <RadioGroup
                value={data.usage}
                onValueChange={(value: "practice" | "personal") => setData({ ...data, usage: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="practice" id="practice" />
                  <Label htmlFor="practice">For my medical practice</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal">For personal use</Label>
                </div>
              </RadioGroup>
            </div>
          )
        } else {
          return (
            <div className="space-y-6">
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={(value) => setData({ ...data, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Height</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Select onValueChange={(value) => setData({ ...data, heightFeet: Number(value) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Feet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 ft</SelectItem>
                        <SelectItem value="5">5 ft</SelectItem>
                        <SelectItem value="6">6 ft</SelectItem>
                        <SelectItem value="7">7 ft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select onValueChange={(value) => setData({ ...data, heightInches: Number(value) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Inches" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i} in
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Select onValueChange={(value) => setData({ ...data, weight: Number(value) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select weight range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">90-110 lbs</SelectItem>
                    <SelectItem value="120">110-130 lbs</SelectItem>
                    <SelectItem value="140">130-150 lbs</SelectItem>
                    <SelectItem value="160">150-170 lbs</SelectItem>
                    <SelectItem value="180">170-190 lbs</SelectItem>
                    <SelectItem value="200">190-210 lbs</SelectItem>
                    <SelectItem value="220">210-230 lbs</SelectItem>
                    <SelectItem value="240">230+ lbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        }

      case 4:
        if (data.profession === "medico" && data.usage === "practice") {
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="specialty">Medical Specialty</Label>
                <Select onValueChange={(value) => setData({ ...data, specialty: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general-medicine">General Medicine</SelectItem>
                    <SelectItem value="cardiology">Cardiology</SelectItem>
                    <SelectItem value="dermatology">Dermatology</SelectItem>
                    <SelectItem value="endocrinology">Endocrinology</SelectItem>
                    <SelectItem value="gastroenterology">Gastroenterology</SelectItem>
                    <SelectItem value="neurology">Neurology</SelectItem>
                    <SelectItem value="orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="psychiatry">Psychiatry</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Select onValueChange={(value) => setData({ ...data, experienceYears: Number(value) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">0-2 years</SelectItem>
                    <SelectItem value="4">3-5 years</SelectItem>
                    <SelectItem value="8">6-10 years</SelectItem>
                    <SelectItem value="15">11-20 years</SelectItem>
                    <SelectItem value="25">20+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        } else {
          return (
            <div className="space-y-6">
              <div>
                <Label>Lifestyle Habits (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["Smoking", "Drinking", "Vegetarian", "Vegan", "Regular Exercise", "Meditation", "Yoga", "None"].map(
                    (habit) => (
                      <div key={habit} className="flex items-center space-x-2">
                        <Checkbox
                          id={habit}
                          checked={data.habits?.includes(habit) || false}
                          onCheckedChange={(checked) => handleHabitsChange(habit, checked as boolean)}
                        />
                        <Label htmlFor={habit} className="text-sm">
                          {habit}
                        </Label>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meals">Meals per day</Label>
                  <Select onValueChange={(value) => setData({ ...data, mealsPerDay: Number(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 meal</SelectItem>
                      <SelectItem value="2">2 meals</SelectItem>
                      <SelectItem value="3">3 meals</SelectItem>
                      <SelectItem value="4">4 meals</SelectItem>
                      <SelectItem value="5">5+ meals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="water">Water intake (glasses/day)</Label>
                  <Select onValueChange={(value) => setData({ ...data, waterIntake: Number(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">1-3 glasses</SelectItem>
                      <SelectItem value="5">4-6 glasses</SelectItem>
                      <SelectItem value="8">7-9 glasses</SelectItem>
                      <SelectItem value="12">10+ glasses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Diet Type</Label>
                <Select onValueChange={(value) => setData({ ...data, dietType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select diet type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="omnivore">Omnivore</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="keto">Keto</SelectItem>
                    <SelectItem value="paleo">Paleo</SelectItem>
                    <SelectItem value="mediterranean">Mediterranean</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        }

      case 5:
        if (data.profession === "medico" && data.usage === "personal") {
          return (
            <div className="space-y-6">
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={(value) => setData({ ...data, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Height</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Select onValueChange={(value) => setData({ ...data, heightFeet: Number(value) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Feet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 ft</SelectItem>
                        <SelectItem value="5">5 ft</SelectItem>
                        <SelectItem value="6">6 ft</SelectItem>
                        <SelectItem value="7">7 ft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select onValueChange={(value) => setData({ ...data, heightInches: Number(value) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Inches" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i} in
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Select onValueChange={(value) => setData({ ...data, weight: Number(value) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select weight range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">90-110 lbs</SelectItem>
                    <SelectItem value="120">110-130 lbs</SelectItem>
                    <SelectItem value="140">130-150 lbs</SelectItem>
                    <SelectItem value="160">150-170 lbs</SelectItem>
                    <SelectItem value="180">170-190 lbs</SelectItem>
                    <SelectItem value="200">190-210 lbs</SelectItem>
                    <SelectItem value="220">210-230 lbs</SelectItem>
                    <SelectItem value="240">230+ lbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Lifestyle Habits (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["Smoking", "Drinking", "Vegetarian", "Vegan", "Regular Exercise", "Meditation", "Yoga", "None"].map(
                    (habit) => (
                      <div key={habit} className="flex items-center space-x-2">
                        <Checkbox
                          id={habit}
                          checked={data.habits?.includes(habit) || false}
                          onCheckedChange={(checked) => handleHabitsChange(habit, checked as boolean)}
                        />
                        <Label htmlFor={habit} className="text-sm">
                          {habit}
                        </Label>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meals">Meals per day</Label>
                  <Select onValueChange={(value) => setData({ ...data, mealsPerDay: Number(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 meal</SelectItem>
                      <SelectItem value="2">2 meals</SelectItem>
                      <SelectItem value="3">3 meals</SelectItem>
                      <SelectItem value="4">4 meals</SelectItem>
                      <SelectItem value="5">5+ meals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="water">Water intake (glasses/day)</Label>
                  <Select onValueChange={(value) => setData({ ...data, waterIntake: Number(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">1-3 glasses</SelectItem>
                      <SelectItem value="5">4-6 glasses</SelectItem>
                      <SelectItem value="8">7-9 glasses</SelectItem>
                      <SelectItem value="12">10+ glasses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Exercise Routine (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["Walking", "Running", "Gym", "Swimming", "Cycling", "Yoga", "Sports", "None"].map((exercise) => (
                    <div key={exercise} className="flex items-center space-x-2">
                      <Checkbox
                        id={exercise}
                        checked={data.exerciseRoutine?.includes(exercise) || false}
                        onCheckedChange={(checked) => handleExerciseChange(exercise, checked as boolean)}
                      />
                      <Label htmlFor={exercise} className="text-sm">
                        {exercise}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Sleep Hours per Night</Label>
                <Select onValueChange={(value) => setData({ ...data, sleepHours: Number(value) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sleep hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">Less than 5 hours</SelectItem>
                    <SelectItem value="6">5-6 hours</SelectItem>
                    <SelectItem value="7">7-8 hours</SelectItem>
                    <SelectItem value="9">8-9 hours</SelectItem>
                    <SelectItem value="10">More than 9 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Stress Level</Label>
                <Select onValueChange={(value) => setData({ ...data, stressLevel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stress level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="very-high">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Medical Conditions (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    "Diabetes",
                    "Hypertension",
                    "Heart Disease",
                    "Asthma",
                    "Arthritis",
                    "Allergies",
                    "Thyroid",
                    "None",
                  ].map((condition) => (
                    <div key={condition} className="flex items-center space-x-2">
                      <Checkbox
                        id={condition}
                        checked={data.medicalConditions?.includes(condition) || false}
                        onCheckedChange={(checked) => handleMedicalConditionsChange(condition, checked as boolean)}
                      />
                      <Label htmlFor={condition} className="text-sm">
                        {condition}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        } else {
          return (
            <div className="space-y-6">
              <div>
                <Label>Exercise Routine (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["Walking", "Running", "Gym", "Swimming", "Cycling", "Yoga", "Sports", "None"].map((exercise) => (
                    <div key={exercise} className="flex items-center space-x-2">
                      <Checkbox
                        id={exercise}
                        checked={data.exerciseRoutine?.includes(exercise) || false}
                        onCheckedChange={(checked) => handleExerciseChange(exercise, checked as boolean)}
                      />
                      <Label htmlFor={exercise} className="text-sm">
                        {exercise}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Sleep Hours per Night</Label>
                <Select onValueChange={(value) => setData({ ...data, sleepHours: Number(value) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sleep hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">Less than 5 hours</SelectItem>
                    <SelectItem value="6">5-6 hours</SelectItem>
                    <SelectItem value="7">7-8 hours</SelectItem>
                    <SelectItem value="9">8-9 hours</SelectItem>
                    <SelectItem value="10">More than 9 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Stress Level</Label>
                <Select onValueChange={(value) => setData({ ...data, stressLevel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stress level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="very-high">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Medical Conditions (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    "Diabetes",
                    "Hypertension",
                    "Heart Disease",
                    "Asthma",
                    "Arthritis",
                    "Allergies",
                    "Thyroid",
                    "None",
                  ].map((condition) => (
                    <div key={condition} className="flex items-center space-x-2">
                      <Checkbox
                        id={condition}
                        checked={data.medicalConditions?.includes(condition) || false}
                        onCheckedChange={(checked) => handleMedicalConditionsChange(condition, checked as boolean)}
                      />
                      <Label htmlFor={condition} className="text-sm">
                        {condition}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Personal Information"
      case 2:
        return "Professional Background"
      case 3:
        return data.profession === "medico" ? "Usage Type" : "Physical Information"
      case 4:
        return data.profession === "medico" && data.usage === "practice"
          ? "Professional Details"
          : "Lifestyle Information"
      case 5:
        return data.profession === "medico" && data.usage === "personal"
          ? "Personal Health Information"
          : "Health & Wellness"
      default:
        return ""
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.dateOfBirth && data.age > 0
      case 2:
        return data.profession
      case 3:
        if (data.profession === "medico") return data.usage
        return data.gender && data.heightFeet && data.heightInches !== undefined && data.weight
      case 4:
        if (data.profession === "medico" && data.usage === "practice") {
          return data.specialty && data.experienceYears
        }
        return data.mealsPerDay && data.waterIntake && data.dietType
      case 5:
        return true
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Welcome to Healthcare AI</h1>
          <p className="text-center text-gray-600 mb-4 sm:mb-6 px-4">Let's personalize your healthcare experience</p>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>
                Step {currentStep} of {totalSteps}
              </span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">{getStepTitle()}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}

            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="order-2 sm:order-1 bg-transparent"
              >
                Back
              </Button>

              {currentStep === totalSteps ? (
                <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting} className="order-1 sm:order-2">
                  {isSubmitting ? "Saving..." : "Complete Setup"}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()} className="order-1 sm:order-2">
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

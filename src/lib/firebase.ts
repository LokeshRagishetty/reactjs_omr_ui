import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { get, set } from 'idb-keyval'
import { SettingsData, TestData } from '../types'

// Use placeholder or environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSy_YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456'
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Setup settings schema methods (IndexedDB)
export async function getSettings(userId: string): Promise<SettingsData | null> {
  const data = await get(`settings_${userId}`)
  return data || null
}

export async function saveSettings(userId: string, data: SettingsData): Promise<void> {
  const current = await getSettings(userId) || {}
  await set(`settings_${userId}`, {
    ...current,
    ...data,
    updatedAt: new Date().toISOString()
  })
}

// Setup Tests schema methods (IndexedDB)
export async function createTest(
  userId: string,
  data: Omit<TestData, 'userId' | 'status' | 'pdfPages' | 'csvData'>
): Promise<string> {
  const tests: TestData[] = (await get(`tests_${userId}`)) || []
  const newTest: TestData = {
    ...data,
    id: Date.now().toString(), // Generate a simple ID
    userId,
    status: 'draft',
    pdfPages: 0,
    csvData: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  tests.push(newTest)
  await set(`tests_${userId}`, tests)
  return newTest.id!
}

export async function getTests(userId: string): Promise<TestData[]> {
  const tests: TestData[] = (await get(`tests_${userId}`)) || []
  // Sort descending by createdAt
  return tests.sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  })
}

export async function getTest(userId: string, id: string): Promise<TestData | null> {
  const tests: TestData[] = (await get(`tests_${userId}`)) || []
  return tests.find(t => t.id === id) || null
}

export async function updateTest(userId: string, id: string, data: Partial<TestData>): Promise<void> {
  const tests: TestData[] = (await get(`tests_${userId}`)) || []
  const index = tests.findIndex(t => t.id === id)
  if (index !== -1) {
    tests[index] = { ...tests[index], ...data, updatedAt: new Date().toISOString() }
    await set(`tests_${userId}`, tests)
  }
}

export async function deleteTest(userId: string, id: string): Promise<void> {
  const tests: TestData[] = (await get(`tests_${userId}`)) || []
  const filtered = tests.filter(t => t.id !== id)
  await set(`tests_${userId}`, filtered)
}

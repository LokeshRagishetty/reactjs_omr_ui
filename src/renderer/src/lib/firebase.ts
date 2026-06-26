import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, addDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore'

// Use placeholder or environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Setup settings schema methods
const SETTINGS_COLLECTION = 'settings'

export async function getSettings(userId: string) {
  const snap = await getDoc(doc(db, SETTINGS_COLLECTION, userId))
  if (snap.exists()) return snap.data()
  return null
}

export async function saveSettings(userId: string, data: any) {
  await setDoc(doc(db, SETTINGS_COLLECTION, userId), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

// Setup Tests schema methods
const TESTS_COLLECTION = 'tests'

export async function createTest(userId: string, data: any) {
  const ref = await addDoc(collection(db, TESTS_COLLECTION), {
    ...data,
    userId,
    status: 'draft',
    pdfPages: 0,
    csvData: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return ref.id
}

export async function getTests(userId: string) {
  const q = query(collection(db, TESTS_COLLECTION), where('userId', '==', userId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getTest(id: string) {
  const snap = await getDoc(doc(db, TESTS_COLLECTION, id))
  if (snap.exists()) return { id: snap.id, ...snap.data() }
  return null
}

export async function updateTest(id: string, data: any) {
  await updateDoc(doc(db, TESTS_COLLECTION, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteTest(id: string) {
  await deleteDoc(doc(db, TESTS_COLLECTION, id))
}

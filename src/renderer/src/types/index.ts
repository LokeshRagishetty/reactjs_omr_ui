import { FieldValue } from 'firebase/firestore'

export interface SettingsData {
  inputDir: string
  outputDir: string
  templatesDir: string
  pythonCommand: string
  updatedAt?: FieldValue | string | Date
}

export interface TestData {
  id?: string
  userId: string
  name: string
  date: string
  templateFolder: string
  inputDir: string
  outputDir: string
  templatePath: string
  status: 'draft' | 'completed'
  pdfPages: number
  csvData: Record<string, string | number>[] | null
  createdAt?: FieldValue | string | Date
  updatedAt?: FieldValue | string | Date
}

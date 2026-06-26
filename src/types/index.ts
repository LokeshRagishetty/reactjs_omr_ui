export interface SettingsData {
  inputDir: string
  outputDir: string
  templatesDir: string
  pythonCommand: string
  templateNames?: string[]
  updatedAt?: string | Date
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
  createdAt?: string | Date
  updatedAt?: string | Date
}

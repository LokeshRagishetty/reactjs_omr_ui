import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openDirectory: () => Promise<string | null>
      processAndConvert: (args: {
        pdfPath: string
        inputDir: string
        outputDir: string
        templatePath: string
      }) => Promise<{ success: boolean; error?: string }>
      getSubFolders: (dirPath: string) => Promise<string[]>
      getPageCount: (filePath: string) => Promise<number>
      saveImages: (args: {
        inputDir: string
        outputDir: string
        templatePath: string
        images: string[]
      }) => Promise<{ success: boolean; error?: string }>
      runCommand: (args: {
        command: string
        inputDir: string
        outputDir: string
      }) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>
      readOutput: (
        outputDir: string
      ) => Promise<{ success: boolean; data?: Record<string, string | number>[]; error?: string }>
    }
  }
}

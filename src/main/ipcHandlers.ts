import { ipcMain, dialog } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import { exec } from 'child_process'
import { promisify } from 'util'
import { parse } from 'csv-parse/sync'

const execPromise = promisify(exec)

export function registerIpcHandlers() {
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled) return null
    return filePaths[0]
  })

  ipcMain.handle('fs:getSubFolders', async (_, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      return entries.filter(e => e.isDirectory()).map(e => e.name)
    } catch (e) {
      console.error(e)
      return []
    }
  })

  ipcMain.handle('pdf:getPageCount', async (_, filePath: string) => {
    try {
      const pdfBytes = await fs.readFile(filePath)
      const pdfDoc = await PDFDocument.load(pdfBytes)
      return pdfDoc.getPageCount()
    } catch (e) {
      console.error(e)
      return 0
    }
  })

  ipcMain.handle('pdf:saveImages', async (_, { inputDir, outputDir, templatePath, images }) => {
    try {
      // 1. Clean input & output dirs
      await cleanDirectory(inputDir)
      await cleanDirectory(outputDir)

      // 2. Save base64 images to inputDir
      for (let i = 0; i < images.length; i++) {
        const imagePath = path.join(inputDir, `page_${i + 1}.png`)
        // remove base64 header
        const base64Data = images[i].replace(/^data:image\/png;base64,/, "")
        await fs.writeFile(imagePath, base64Data, 'base64')
      }

      // 3. Copy template contents to inputDir
      await copyDir(templatePath, inputDir)

      return { success: true }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('python:runCommand', async (_, { command, inputDir, outputDir }) => {
    try {
      // Replace placeholders if any, or just pass the command if the user already wrote the flags
      // e.g. python3 main.py --inputDir dir1 --outputDir dir2
      const finalCommand = command
        .replace('[--inputDir]', `"${inputDir}"`)
        .replace('[--outputDir]', `"${outputDir}"`)

      const { stdout, stderr } = await execPromise(finalCommand)
      return { success: true, stdout, stderr }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('csv:readOutput', async (_, outputDir: string) => {
    try {
      const files = await fs.readdir(outputDir)
      const csvFile = files.find(f => f.endsWith('.csv'))
      if (!csvFile) throw new Error('No CSV file found in output directory')

      const csvContent = await fs.readFile(path.join(outputDir, csvFile), 'utf-8')
      const records = parse(csvContent, { columns: true, skip_empty_lines: true })
      return { success: true, data: records }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  })
}

// Helpers
async function cleanDirectory(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir, { recursive: true })
  } catch (e) {
    // maybe dir didn't exist
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
  }
}

async function copyDir(src: string, dest: string) {
  try {
    const entries = await fs.readdir(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true })
        await copyDir(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    }
  } catch (e) {
    console.error('Error copying template', e)
  }
}

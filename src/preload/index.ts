import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import { ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  getSubFolders: (dirPath: string) => ipcRenderer.invoke('fs:getSubFolders', dirPath),
  getPageCount: (filePath: string) => ipcRenderer.invoke('pdf:getPageCount', filePath),
  saveImages: (args: {
    inputDir: string
    outputDir: string
    templatePath: string
    images: string[]
  }) => ipcRenderer.invoke('pdf:saveImages', args),
  runCommand: (args: { command: string; inputDir: string; outputDir: string }) =>
    ipcRenderer.invoke('python:runCommand', args),
  readOutput: (outputDir: string) => ipcRenderer.invoke('csv:readOutput', outputDir)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

import { useState, useEffect, useRef, JSX, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getTest, updateTest, getSettings } from '../lib/firebase'
import { getDirectoryHandle, verifyPermission, clearDirectory, copyDirectoryContents, saveBase64ToImage, readFirstCsvFile } from '../lib/fs'
import { TestData, SettingsData } from '../types'
import * as pdfjsLib from 'pdfjs-dist'
import Papa from 'papaparse'

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export function TestDetail(): JSX.Element {
  const { id } = useParams()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [test, setTest] = useState<TestData | null>(null)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [step, setStep] = useState<string>('upload') // upload | converting | ready | running | complete
  const [pagesCount, setPagesCount] = useState<number>(0)
  const [csvData, setCsvData] = useState<Record<string, string | number>[]>([])
  const [pythonCmd, setPythonCmd] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async (): Promise<void> => {
    if (!user || !id) return
    try {
      const testData = await getTest(user.uid, id)
      const settingsData = await getSettings(user.uid)
      setTest(testData)
      setSettings(settingsData)
      if (testData?.status === 'completed' && testData.csvData) {
        setCsvData(testData.csvData)
        setStep('complete')
      }
    } catch (err) {
      console.error(err)
      addToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, id, addToast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user && id) loadData()
  }, [user, id, loadData])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    if (!test || !settings) return
    const file = e.target.files?.[0]
    if (!file) return

    setStep('converting')
    try {
      const inputHandle = await getDirectoryHandle('dir_handle_inputDir')
      const outputHandle = await getDirectoryHandle('dir_handle_outputDir')
      const templatesHandle = await getDirectoryHandle('dir_handle_templatesDir')

      if (!inputHandle || !outputHandle || !templatesHandle) {
        throw new Error('Please select all directories in Settings first.')
      }

      if (!(await verifyPermission(inputHandle)) || !(await verifyPermission(outputHandle)) || !(await verifyPermission(templatesHandle, false))) {
        throw new Error('Please grant folder permissions in the browser prompt.')
      }

      // Clear directories
      await clearDirectory(inputHandle)
      await clearDirectory(outputHandle)

      // Copy template files to input dir
      if (test.templateFolder) {
        try {
          const specificTemplateHandle = await templatesHandle.getDirectoryHandle(test.templateFolder)
          await copyDirectoryContents(specificTemplateHandle, inputHandle)
        } catch (err) {
          console.warn("Template folder not found or could not copy:", err)
        }
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const numPages = pdf.numPages
      setPagesCount(numPages)

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Could not get 2d context')
        canvas.height = viewport.height
        canvas.width = viewport.width

        // @ts-expect-error pdfjs-dist types mismatch with canvasContext
        await page.render({ canvasContext: context, viewport }).promise
        const base64Data = canvas.toDataURL('image/png')
        await saveBase64ToImage(inputHandle, `page_${i}.png`, base64Data)
      }

      await updateTest(user.uid, id!, { pdfPages: numPages })

      // Build the python command for display
      const cmd = settings.pythonCommand
        .replace('[--inputDir]', `"${test.inputDir}"`)
        .replace('[--outputDir]', `"${test.outputDir}"`)
      setPythonCmd(cmd)

      addToast(`PDF converted & files saved: ${numPages} pages`, 'success')
      setStep('running')
    } catch (err: unknown) {
      console.error(err)
      addToast(
        'Error processing PDF: ' + (err instanceof Error ? err.message : String(err)),
        'error'
      )
      setStep('upload')
    }
  }

  function handleCopyCommand(): void {
    navigator.clipboard.writeText(pythonCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleReadCsv(): Promise<void> {
    try {
      const outputHandle = await getDirectoryHandle('dir_handle_outputDir')
      if (!outputHandle) throw new Error('No output folder selected in Settings.')
      if (!(await verifyPermission(outputHandle, false))) throw new Error('Permission denied to read output folder.')
      
      const file = await readFirstCsvFile(outputHandle)
      if (!file) throw new Error('No CSV file found in output directory.')
      
      Papa.parse<Record<string, string | number>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data
          setCsvData(rows)
          await updateTest(user.uid, id!, { csvData: rows, status: 'completed' })
          setStep('complete')
          addToast(`CSV loaded automatically: ${rows.length} rows`, 'success')
        },
        error: (err: Error) => {
          addToast('Error parsing CSV: ' + err.message, 'error')
        }
      })
    } catch (err: unknown) {
      console.error(err)
      addToast('Error reading CSV: ' + (err instanceof Error ? err.message : String(err)), 'error')
    }
  }

  if (loading || !test)
    return <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{test.name}</h1>
          <p className="text-sm text-gray-500">
            Date: {test.date} • Template: {test.templateFolder}
          </p>
        </div>
        <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        {/* Step 1: Upload PDF */}
        {step === 'upload' && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Upload PDF to begin</h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Select PDF File
            </button>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Step 2: Converting */}
        {step === 'converting' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-800">Converting PDF...</h3>
            <p className="text-sm text-gray-500">
              Reading {pagesCount > 0 ? pagesCount : '...'} pages
            </p>
          </div>
        )}

        {/* Removed redundant step 'ready' as automation replaces ZIP download */}

        {/* Step 3 (was 4): Running — show command + read CSV */}
        {step === 'running' && (
          <div className="space-y-6">
            <div className="flex justify-center items-center gap-4 text-green-600 font-medium">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Ready! Template files copied & {pagesCount} pages saved to Input folder.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Run this command in your terminal:
              </label>
              <div className="flex gap-2">
                <code className="flex-1 bg-gray-900 text-green-400 px-4 py-3 rounded-lg text-sm font-mono break-all">
                  {pythonCmd}
                </code>
                <button
                  onClick={handleCopyCommand}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 whitespace-nowrap"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-3">
                After running the command, click below to read the generated CSV automatically:
              </p>
              <button
                onClick={handleReadCsv}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                Read Results from Output Folder
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete — show CSV table */}
        {step === 'complete' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Results ({csvData.length} rows)</h3>
              <div className="bg-green-50 px-3 py-1 rounded-full text-green-700 text-sm font-medium">
                Saved to Local Storage
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-96">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {csvData.length > 0 &&
                      Object.keys(csvData[0]).map((k) => (
                        <th key={k} className="px-4 py-2 font-medium text-gray-600">
                          {k}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {csvData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-4 py-2">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

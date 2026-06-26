import { useState, useEffect, useRef, JSX, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getTest, updateTest, getSettings } from '../lib/firebase'
import { TestData, SettingsData } from '../types'
import * as pdfjsLib from 'pdfjs-dist'

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
  const [step, setStep] = useState<string>('upload') // upload | converting | running | complete
  const [pagesCount, setPagesCount] = useState<number>(0)
  const [csvData, setCsvData] = useState<Record<string, string | number>[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async (): Promise<void> => {
    if (!user || !id) return
    try {
      const testData = await getTest(id)
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
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const numPages = pdf.numPages
      setPagesCount(numPages)

      const images: string[] = []
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Could not get 2d context')
        canvas.height = viewport.height
        canvas.width = viewport.width

        // @ts-expect-error pdfjs-dist types mismatch
        await page.render({
          canvasContext: context,
          viewport
        }).promise
        images.push(canvas.toDataURL('image/png'))
      }

      // Send to main process
      const res = await window.api.saveImages({
        inputDir: test.inputDir,
        outputDir: test.outputDir,
        templatePath: test.templatePath,
        images
      })

      if (!res.success) throw new Error(res.error)

      await updateTest(id!, { pdfPages: numPages })
      addToast('PDF converted to images', 'success')
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

  async function handleRunPython(): Promise<void> {
    if (!test || !settings) return
    try {
      const res = await window.api.runCommand({
        command: settings.pythonCommand,
        inputDir: test.inputDir,
        outputDir: test.outputDir
      })

      if (!res.success) throw new Error(res.error)

      // Now read CSV
      const csvRes = await window.api.readOutput(test.outputDir)
      if (!csvRes.success) throw new Error(csvRes.error)

      setCsvData(csvRes.data || [])
      await updateTest(id!, { csvData: csvRes.data, status: 'completed' })
      setStep('complete')
      addToast('Python execution completed', 'success')
    } catch (e: unknown) {
      console.error(e)
      addToast('Error running Python: ' + (e instanceof Error ? e.message : String(e)), 'error')
    }
  }

  if (loading || !test) return <div>Loading...</div>

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

        {step === 'converting' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-800">Converting PDF...</h3>
            <p className="text-sm text-gray-500">
              Reading {pagesCount > 0 ? pagesCount : '...'} pages
            </p>
          </div>
        )}

        {step === 'running' && (
          <div className="text-center py-12">
            <div className="mb-6 flex justify-center items-center gap-4 text-green-600 font-medium">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              PDF Converted ({pagesCount} pages)
            </div>
            <button
              onClick={handleRunPython}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Run Python Script
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Results ({csvData.length} rows)</h3>
              <div className="flex gap-2 text-sm text-gray-500 bg-green-50 px-3 py-1 rounded-full text-green-700 font-medium">
                Saved to Firestore
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

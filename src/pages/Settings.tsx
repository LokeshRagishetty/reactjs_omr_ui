import { useState, useEffect, JSX, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getSettings, saveSettings } from '../lib/firebase'
import { saveDirectoryHandle, getSubDirectories } from '../lib/fs'
import { SettingsData } from '../types'

export function Settings(): JSX.Element {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsData>({
    inputDir: '',
    outputDir: '',
    templatesDir: '',
    pythonCommand: 'python3 main.py',
    templateNames: []
  })
  const [templateInput, setTemplateInput] = useState('')

  const loadSettings = useCallback(async (): Promise<void> => {
    if (!user) return
    try {
      const data = await getSettings(user.uid)
      if (data) {
        setSettings({
          inputDir: data.inputDir || '',
          outputDir: data.outputDir || '',
          templatesDir: data.templatesDir || '',
          pythonCommand: data.pythonCommand || 'python3 main.py',
          templateNames: data.templateNames || []
        })
        setTemplateInput((data.templateNames || []).join(', '))
      }
    } catch (err) {
      console.error(err)
      addToast('Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, addToast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) loadSettings()
  }, [user, loadSettings])

  async function handleSelectFolder(key: 'inputDir' | 'outputDir' | 'templatesDir'): Promise<void> {
    try {
      // @ts-expect-error File System Access API
      const handle = await window.showDirectoryPicker()
      if (!handle) return
      
      const dirName = handle.name
      await saveDirectoryHandle(`dir_handle_${key}`, handle)
      
      setSettings(prev => ({ ...prev, [key]: dirName }))
      addToast(`Selected ${dirName}`, 'success')

      if (key === 'templatesDir') {
        const subDirs = await getSubDirectories(handle)
        setSettings(prev => ({ ...prev, templateNames: subDirs }))
        setTemplateInput(subDirs.join(', '))
        addToast(`Found ${subDirs.length} templates`, 'success')
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err)
        addToast('Error selecting folder', 'error')
      }
    }
  }

  function handleTemplateInputChange(value: string): void {
    setTemplateInput(value)
    const names = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setSettings((prev) => ({ ...prev, templateNames: names }))
  }

  async function handleSave(): Promise<void> {
    if (!settings.inputDir || !settings.outputDir || !settings.templatesDir) {
      addToast('Please fill in all required directories', 'warning')
      return
    }
    setSaving(true)
    try {
      await saveSettings(user!.uid, settings)
      addToast('Settings saved successfully', 'success')
    } catch (err: unknown) {
      console.error(err)
      addToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Settings</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Input Directory</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 focus:outline-none"
              value={settings.inputDir}
              readOnly
              placeholder="Select folder..."
            />
            <button
              onClick={() => handleSelectFolder('inputDir')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Browse
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Local path where images will be placed before running the Python script
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Output Directory</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 focus:outline-none"
              value={settings.outputDir}
              readOnly
              placeholder="Select folder..."
            />
            <button
              onClick={() => handleSelectFolder('outputDir')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Browse
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Local path where the Python script will write CSV output
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Templates Directory</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 focus:outline-none"
              value={settings.templatesDir}
              readOnly
              placeholder="Select folder..."
            />
            <button
              onClick={() => handleSelectFolder('templatesDir')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Browse
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Folder containing sub‑folders (each is a template)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Names</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={templateInput}
            onChange={(e) => handleTemplateInputChange(e.target.value)}
            placeholder="template1, template2, template3"
          />
          <p className="text-xs text-gray-400 mt-1">
            Comma‑separated names of template sub‑folders
          </p>
          {settings.templateNames && settings.templateNames.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs text-gray-500">Templates:</span>
              {settings.templateNames.map((t) => (
                <span key={t} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Python Command</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={settings.pythonCommand}
            onChange={(e) => setSettings((p) => ({ ...p, pythonCommand: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">
            Command to run. Use [--inputDir] and [--outputDir] as placeholders.
          </p>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getSettings, saveSettings } from '../lib/firebase'

export function Settings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    inputDir: '',
    outputDir: '',
    templatesDir: '',
    pythonCommand: 'python3 main.py'
  })
  const [templates, setTemplates] = useState<string[]>([])

  useEffect(() => {
    if (user) loadSettings()
  }, [user])

  async function loadSettings() {
    try {
      const data = await getSettings(user!.uid)
      if (data) {
        setSettings({
          inputDir: data.inputDir || '',
          outputDir: data.outputDir || '',
          templatesDir: data.templatesDir || '',
          pythonCommand: data.pythonCommand || 'python3 main.py'
        })
        if (data.templatesDir) {
          const folders = await window.api.getSubFolders(data.templatesDir)
          setTemplates(folders)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectDir(key: keyof typeof settings) {
    const dir = await window.api.openDirectory()
    if (dir) {
      setSettings(prev => ({ ...prev, [key]: dir }))
      if (key === 'templatesDir') {
        const folders = await window.api.getSubFolders(dir)
        setTemplates(folders)
      }
    }
  }

  async function handleSave() {
    if (!settings.inputDir || !settings.outputDir || !settings.templatesDir) {
      addToast('Please select all required folders', 'warning')
      return
    }
    setSaving(true)
    try {
      await saveSettings(user!.uid, settings)
      addToast('Settings saved successfully', 'success')
    } catch (e) {
      addToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Settings</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Input Directory</label>
          <div className="flex gap-2">
            <input className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50" value={settings.inputDir} readOnly />
            <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition" onClick={() => handleSelectDir('inputDir')}>Browse</button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Folder where images will be placed before running the Python script</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Output Directory</label>
          <div className="flex gap-2">
            <input className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50" value={settings.outputDir} readOnly />
            <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition" onClick={() => handleSelectDir('outputDir')}>Browse</button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Folder where the Python script will write CSV output</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Templates Directory</label>
          <div className="flex gap-2">
            <input className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50" value={settings.templatesDir} readOnly />
            <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition" onClick={() => handleSelectDir('templatesDir')}>Browse</button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Folder containing sub‑folders (each is a template)</p>
          {templates.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs text-gray-500">Templates found:</span>
              {templates.map(t => <span key={t} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{t}</span>)}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Python Command</label>
          <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={settings.pythonCommand} onChange={e => setSettings(p => ({...p, pythonCommand: e.target.value}))} />
          <p className="text-xs text-gray-400 mt-1">Command to run your Python script. Use [--inputDir] and [--outputDir] as placeholders.</p>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

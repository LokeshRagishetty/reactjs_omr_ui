import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getTests, createTest, deleteTest, getSettings } from '../lib/firebase'

export function Dashboard() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [templates, setTemplates] = useState<string[]>([])
  const [settings, setSettings] = useState<any>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTemplate, setFormTemplate] = useState('')

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    try {
      const [testsData, settingsData] = await Promise.all([
        getTests(user!.uid),
        getSettings(user!.uid)
      ])
      setTests(testsData)
      setSettings(settingsData)

      if (settingsData?.templatesDir) {
        const dirs = await window.api.getSubFolders(settingsData.templatesDir)
        setTemplates(dirs)
      }
    } catch (e) {
      addToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!formName || !formDate || !formTemplate) {
      addToast('Please fill in all fields', 'warning')
      return
    }
    try {
      const id = await createTest(user!.uid, {
        name: formName,
        date: formDate,
        templateFolder: formTemplate,
        inputDir: settings?.inputDir || '',
        outputDir: settings?.outputDir || '',
        templatePath: `${settings?.templatesDir}/${formTemplate}`
      })
      addToast('Test created', 'success')
      setShowModal(false)
      navigate(`/test/${id}`)
    } catch (e) {
      addToast('Failed to create test', 'error')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test?')) return
    try {
      await deleteTest(id)
      setTests(tests.filter(t => t.id !== id))
      addToast('Test deleted', 'success')
    } catch (e) {
      addToast('Failed to delete test', 'error')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Your Tests</h1>
        <div className="flex gap-3">
          <Link to="/settings" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300">Settings</Link>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">New Test</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Template</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tests.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">No tests found. Create one to get started.</td></tr>
            )}
            {tests.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                <td className="px-6 py-4 text-gray-600">{t.date}</td>
                <td className="px-6 py-4 text-gray-600">{t.templateFolder}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link to={`/test/${t.id}`} className="text-blue-600 hover:text-blue-800 font-medium mr-4">Open</Link>
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Test</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={formTemplate} onChange={e => setFormTemplate(e.target.value)}>
                  <option value="">Select a template</option>
                  {templates.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

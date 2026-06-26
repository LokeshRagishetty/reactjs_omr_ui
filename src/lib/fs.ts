import { set, get } from 'idb-keyval'

export async function saveDirectoryHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  await set(key, handle)
}

export async function getDirectoryHandle(key: string): Promise<FileSystemDirectoryHandle | undefined> {
  return await get(key)
}

export async function verifyPermission(
  fileHandle: FileSystemHandle,
  readWrite: boolean = true
): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = {
    mode: readWrite ? 'readwrite' : 'read'
  }
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true
  }
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true
  }
  return false
}

export async function clearDirectory(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  // We use Array.from with an async iterator, but to be simple we can loop
  const entries = []
  // @ts-expect-error values() async iterator
  for await (const entry of dirHandle.values()) {
    entries.push(entry)
  }
  for (const entry of entries) {
    await dirHandle.removeEntry(entry.name, { recursive: entry.kind === 'directory' })
  }
}

export async function copyDirectoryContents(
  src: FileSystemDirectoryHandle,
  dest: FileSystemDirectoryHandle
): Promise<void> {
  // @ts-expect-error values() async iterator
  for await (const entry of src.values()) {
    if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle
      const file = await fileHandle.getFile()
      const newFileHandle = await dest.getFileHandle(entry.name, { create: true })
      const writable = await newFileHandle.createWritable()
      await writable.write(file)
      await writable.close()
    } else if (entry.kind === 'directory') {
      const dirHandle = entry as FileSystemDirectoryHandle
      const newDirHandle = await dest.getDirectoryHandle(entry.name, { create: true })
      await copyDirectoryContents(dirHandle, newDirHandle)
    }
  }
}

export async function saveBase64ToImage(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  base64Data: string
): Promise<void> {
  // e.g. "data:image/png;base64,iVBORw0KGgo..."
  const base64 = base64Data.split(',')[1]
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: 'image/png' })

  const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}

export async function readFirstCsvFile(dirHandle: FileSystemDirectoryHandle): Promise<File | null> {
  // @ts-expect-error values() async iterator
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.csv')) {
      const fileHandle = entry as FileSystemFileHandle
      return await fileHandle.getFile()
    }
  }
  return null
}

export async function getSubDirectories(dirHandle: FileSystemDirectoryHandle): Promise<string[]> {
  const dirs: string[] = []
  // @ts-expect-error values() async iterator
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'directory') {
      dirs.push(entry.name)
    }
  }
  return dirs
}

export async function uploadImage(file, onProgress) {
  onProgress?.(10)
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  onProgress?.(90)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Error al subir la imagen')
  }

  const { url } = await res.json()
  onProgress?.(100)
  return url
}

import { storage } from '../config/firebase'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

export async function uploadImage(file, onProgress) {
  const ext = file.name.split('.').pop()
  const filename = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const storageRef = ref(storage, filename)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file)
    task.on(
      'state_changed',
      snap => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress?.(pct)
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve(url)
      }
    )
  })
}

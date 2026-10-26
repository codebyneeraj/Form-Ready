export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

// Delay between files: browsers drop back-to-back programmatic downloads.
export async function downloadAll(files: { blob: Blob; name: string }[]) {
  for (const f of files) {
    downloadBlob(f.blob, f.name)
    await new Promise((r) => setTimeout(r, 400))
  }
}

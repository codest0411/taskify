export async function startScreenCapture(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Screen sharing is not supported on this browser.')
  }
  
  return navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'always',
      displaySurface: 'monitor',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    } as any,
    audio: false,
  })
}

export function getScreenDimensions(stream: MediaStream): { width: number; height: number } {
  const track = stream.getVideoTracks()[0]
  if (!track) return { width: 1920, height: 1080 }
  const settings = track.getSettings()
  return { width: settings.width ?? 1920, height: settings.height ?? 1080 }
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return
  stream.getTracks().forEach(track => {
    track.stop()
  })
}

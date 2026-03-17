'use client'

import { ShareHUD } from '@/components/screen-share/share-hud'
import { ViewerScreen } from '@/components/screen-share/viewer-screen'

export function ScreenShareOverlay() {
  return (
    <>
      <ShareHUD />
      <ViewerScreen />
    </>
  )
}

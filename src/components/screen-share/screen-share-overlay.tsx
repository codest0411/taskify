'use client'

import { ShareHUD } from '@/components/screen-share/share-hud'
import { ViewerScreen } from '@/components/screen-share/viewer-screen'
import { ControlRequestToast } from '@/components/screen-share/control-request-toast'

export function ScreenShareOverlay() {
  return (
    <>
      <ShareHUD />
      <ViewerScreen />
      <ControlRequestToast />
    </>
  )
}

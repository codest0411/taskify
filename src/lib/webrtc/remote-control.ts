export type ControlEvent =
  | { type: 'mousemove';    x: number; y: number }
  | { type: 'mousedown';    x: number; y: number; button: number }
  | { type: 'mouseup';      x: number; y: number; button: number }
  | { type: 'click';        x: number; y: number; button: number }
  | { type: 'dblclick';     x: number; y: number }
  | { type: 'contextmenu';  x: number; y: number }
  | { type: 'wheel';        x: number; y: number; deltaX: number; deltaY: number }
  | { type: 'keydown';      key: string; code: string; modifiers: string[] }
  | { type: 'keyup';        key: string; code: string; modifiers: string[] }

export function normalizeCoords(
  event: MouseEvent | WheelEvent,
  videoEl: HTMLVideoElement,
  remoteWidth: number,
  remoteHeight: number
): { x: number; y: number } {
  const rect = videoEl.getBoundingClientRect()
  
  // Calculate the actual video display area within the <video> element (considering object-fit: contain)
  const videoRatio = remoteWidth / remoteHeight
  const elementRatio = rect.width / rect.height
  
  let actualWidth, actualHeight, offsetX, offsetY
  
  if (elementRatio > videoRatio) {
    // Height limited
    actualHeight = rect.height
    actualWidth = actualHeight * videoRatio
    offsetX = (rect.width - actualWidth) / 2
    offsetY = 0
  } else {
    // Width limited
    actualWidth = rect.width
    actualHeight = actualWidth / videoRatio
    offsetX = 0
    offsetY = (rect.height - actualHeight) / 2
  }

  const relativeX = (event.clientX - rect.left - offsetX) / actualWidth
  const relativeY = (event.clientY - rect.top - offsetY) / actualHeight
  
  return {
    x: Math.max(0, Math.min(1, relativeX)) * remoteWidth,
    y: Math.max(0, Math.min(1, relativeY)) * remoteHeight,
  }
}

export function injectControlEvent(event: ControlEvent, streamWidth: number, streamHeight: number): void {
  const isKey = event.type === 'keydown' || event.type === 'keyup'
  
  if (isKey) {
    const focused = document.activeElement ?? document.body
    const keyboardEvent = new KeyboardEvent(event.type, {
      bubbles: true,
      cancelable: true,
      key: (event as any).key,
      code: (event as any).code,
      ctrlKey: (event as any).modifiers?.includes('ctrl'),
      shiftKey: (event as any).modifiers?.includes('shift'),
      altKey: (event as any).modifiers?.includes('alt'),
      metaKey: (event as any).modifiers?.includes('meta'),
    })
    focused.dispatchEvent(keyboardEvent)
    
    // Fallback for input filling if event not prevented
    if (event.type === 'keydown' && !keyboardEvent.defaultPrevented) {
      const el = focused as HTMLInputElement | HTMLTextAreaElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (event.key.length === 1) {
          // Simplistic insertion — in reality might need selection handling
          // but for this app it's a huge improvement
          try {
            document.execCommand('insertText', false, event.key)
          } catch (e) {
             // execCommand might fail in some contexts, ignore
          }
        } else if (event.key === 'Backspace') {
          // Handle backspace manually if needed, or rely on native? 
          // dispatching often doesn't trigger native backspace.
        }
      }
    }
    return
  }

  const { x, y } = event as any
  
  // Calculate scaling between the stream resolution and current viewport
  // This is much more reliable than using DPR directly
  const scaleX = window.innerWidth / streamWidth
  const scaleY = window.innerHeight / streamHeight
  
  const cssX = x * scaleX
  const cssY = y * scaleY
  
  // Find target element at that position
  const target = document.elementFromPoint(cssX, cssY) ?? document.body

  if (['mousemove', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu'].includes(event.type)) {
    // Dispatch both Mouse and Pointer events for widest compatibility
    const eventProps = {
      bubbles: true,
      cancelable: true,
      clientX: cssX,
      clientY: cssY,
      button: (event as any).button ?? 0,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    }

    if (event.type === 'mousedown') (target as any).focus?.()

    const mouseEvent = new MouseEvent(event.type, eventProps)
    const pointerEvent = new PointerEvent(event.type.replace('mouse', 'pointer'), eventProps)
    
    target.dispatchEvent(pointerEvent)
    target.dispatchEvent(mouseEvent)
    
    // If it's a click, ensure we also send pointerup/mousedown if missed
    if (event.type === 'click') {
      target.dispatchEvent(new PointerEvent('pointerdown', eventProps))
      target.dispatchEvent(new PointerEvent('pointerup', eventProps))
    }
  }

  if (event.type === 'wheel') {
    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      deltaX: (event as any).deltaX,
      deltaY: (event as any).deltaY,
      clientX: cssX,
      clientY: cssY,
    })
    target.dispatchEvent(wheelEvent)
  }
}

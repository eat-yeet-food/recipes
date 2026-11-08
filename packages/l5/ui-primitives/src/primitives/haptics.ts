/**
 * A short haptic tick for taps that change something. Android browsers use
 * the Vibration API. iOS Safari has none, but iOS 18+ plays the system haptic
 * when a native switch toggles, so a hidden switch is toggled instead; that is
 * unofficial and may stop working, in which case taps are simply silent.
 * Call it from the click handler: both paths need the user's gesture.
 * `strong` is for destructive confirmations.
 */
/** Mirrors the widely used ios-haptics approach: a fresh, hidden switch in <head>, clicked through its label, then removed. */
function iosTick() {
  const label = document.createElement('label')
  label.setAttribute('aria-hidden', 'true')
  label.style.display = 'none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.append(input)
  document.head.append(label)
  label.click()
  label.remove()
}

export function haptic(kind: 'tick' | 'strong' = 'tick') {
  if (typeof window === 'undefined') return
  try {
    if (typeof navigator.vibrate === 'function') { navigator.vibrate(kind === 'strong' ? [14, 60, 14] : 10); return }
    iosTick()
    if (kind === 'strong') setTimeout(iosTick, 90)
  } catch { /* haptics are a nicety; never let them break a tap */ }
}

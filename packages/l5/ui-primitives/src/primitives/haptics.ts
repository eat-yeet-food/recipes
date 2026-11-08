/**
 * A short haptic tick for taps that change something. Android browsers use
 * the Vibration API. iOS Safari (17.4+) has none, but plays the system haptic
 * when a native switch toggles, so a hidden switch is toggled instead; that is
 * unofficial and may stop working, in which case taps are simply silent.
 * Call it from the click handler: both paths need the user's gesture.
 * `strong` is for destructive confirmations.
 */
let iosSwitch: HTMLLabelElement | null = null

function iosTick() {
  if (!iosSwitch) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    iosSwitch = document.createElement('label')
    iosSwitch.setAttribute('aria-hidden', 'true')
    iosSwitch.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;clip-path:inset(50%)'
    iosSwitch.append(input)
    document.body.append(iosSwitch)
  }
  iosSwitch.click()
}

export function haptic(kind: 'tick' | 'strong' = 'tick') {
  if (typeof window === 'undefined') return
  try {
    if (typeof navigator.vibrate === 'function') { navigator.vibrate(kind === 'strong' ? [14, 60, 14] : 10); return }
    iosTick()
    if (kind === 'strong') setTimeout(iosTick, 90)
  } catch { /* haptics are a nicety; never let them break a tap */ }
}

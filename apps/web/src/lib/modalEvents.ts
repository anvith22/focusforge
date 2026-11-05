export function openDistractionPad() {
  window.dispatchEvent(new CustomEvent('focusforge-open-distraction-pad'));
}

export function openBreathingBreak() {
  window.dispatchEvent(new CustomEvent('focusforge-open-breathing-break'));
}


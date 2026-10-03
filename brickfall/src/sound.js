// Blips made by the Web Audio API: no sound files to download or cache.
let audio = null

const TONES = {
  wall: [320, 0.04],
  paddle: [220, 0.06],
  dent: [520, 0.05],
  break: [660, 0.07],
  miss: [110, 0.3],
  cleared: [880, 0.25],
  over: [90, 0.5],
}

export const play = (event) => {
  const tone = TONES[event]
  if (!tone) return
  // Browsers start audio only after a gesture, and every sound follows one.
  audio ??= new AudioContext()
  const [frequency, duration] = tone
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = 'square'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.06, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration)
  oscillator.connect(gain).connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + duration)
}

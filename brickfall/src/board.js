import { component } from 'imp'
import { b, canvas, div, small, span } from 'imp/html'
import { luPause, luPlay, luVolume2, luVolumeX } from 'imp/icons'
import { computed, initState } from 'imp/state'
import { button, icon } from 'imp/std'
import { loader } from 'imp/std/feedback'
import { HEIGHT, launch, newGame, step, togglePause, WIDTH } from './game.js'
import { play } from './sound.js'
import { loadSprites } from './sprites.js'
import { read, write } from './storage.js'

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif'
const TRAIL = 6

const styles = `
  :host { display: block; }
  .hud {
    display: flex;
    align-items: center;
    gap: var(--imp-space-4, 16px);
    margin-block-end: var(--imp-space-2, 8px);
    font-variant-numeric: tabular-nums;
  }
  .stat { display: flex; flex-direction: column; line-height: 1.1; }
  .stat b { font-size: var(--imp-font-size-lg, 1.125rem); color: var(--imp-color-text, #e2e8f0); }
  .stat small {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--imp-color-secondary, #94a3b8);
  }
  .actions { margin-inline-start: auto; display: flex; gap: var(--imp-space-2, 8px); }
  canvas {
    display: block;
    inline-size: min(100%, calc((100dvh - 190px) * 0.75));
    min-inline-size: 240px;
    aspect-ratio: 3 / 4;
    margin-inline: auto;
    border-radius: var(--imp-radius-container, 12px);
    border: var(--imp-border-width, 1px) solid var(--imp-color-border, #334155);
    touch-action: none;
    cursor: none;
    outline: none;
  }
  .help {
    margin-block-start: var(--imp-space-2, 8px);
    text-align: center;
    font-size: var(--imp-font-size-sm, 0.875rem);
    color: var(--imp-color-secondary, #94a3b8);
  }
`

const BANNERS = {
  ready: (game) => [`Level ${game.level + 1}`, 'Tap or press Space to launch'],
  paused: () => ['Paused', 'Tap or press Space to resume'],
  cleared: (game) => [`Level ${game.level + 1}`, 'Cleared! Tap or press Space'],
  over: (game) => ['Game over', `Score ${game.score} - tap or press Space`],
}

const drawBanner = (ctx, [title, line]) => {
  ctx.fillStyle = 'rgba(8, 10, 28, 0.55)'
  ctx.fillRect(0, HEIGHT / 2 - 70, WIDTH, 120)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 34px ${FONT}`
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 18)
  ctx.fillStyle = '#b8c1e6'
  ctx.font = `400 17px ${FONT}`
  ctx.fillText(line, WIDTH / 2, HEIGHT / 2 + 20)
}

// A sprite, or a plain shape when the picture did not load.
const sprite = (ctx, image, x, y, w, h, fallback) => {
  if (image) {
    ctx.drawImage(image, x, y, w, h)
    return
  }
  ctx.fillStyle = fallback
  ctx.fillRect(x, y, w, h)
}

const draw = (ctx, game, sprites, trail) => {
  sprite(ctx, sprites.background, 0, 0, WIDTH, HEIGHT, '#0e1330')
  for (const brick of game.bricks) {
    if (brick.hp <= 0) continue
    sprite(ctx, sprites[`brick-${brick.sprite}`], brick.x, brick.y, brick.w, brick.h, '#8b5cf6')
    if (brick.hp < brick.hits && sprites.crack) {
      ctx.drawImage(sprites.crack, brick.x, brick.y, brick.w, brick.h)
    }
  }
  const { paddle, ball } = game
  sprite(ctx, sprites.paddle, paddle.x, paddle.y, paddle.w, paddle.h, '#c3cbef')
  trail.forEach((point, i) => {
    ctx.fillStyle = `rgba(111, 240, 255, ${(0.25 * (i + 1)) / trail.length})`
    ctx.beginPath()
    ctx.arc(point.x, point.y, ball.r * ((i + 1) / trail.length), 0, Math.PI * 2)
    ctx.fill()
  })
  sprite(ctx, sprites.ball, ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2, '#ffffff')
  const banner = BANNERS[game.phase]
  if (banner) drawBanner(ctx, banner(game))
}

// The plain values the page shows around the canvas. The game object itself
// changes 60 times a second and stays out of state: only this summary goes in,
// and a set with the same content notifies nobody.
const summary = (game, best) => ({
  score: game.score,
  lives: game.lives,
  level: game.level + 1,
  phase: game.phase,
  best,
})

const stat = (label, value) => span({ class: 'stat' }, b(value), small(label))

const KEYS = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
}

const fromControl = (event) => {
  const origin = event.composedPath()[0]
  return origin instanceof HTMLElement && origin.closest('button, input, select, textarea, a')
}

export const board = component('brickfall-board', {
  styles,
  loading: () => loader({ label: 'Loading the game' }),
  setup: async (self) => {
    const best = read('brickfall.best', 0)
    self.game = newGame()
    self.input = { left: false, right: false, pointerX: null }
    self.trail = []
    const hud = initState(self, 'brickfall.hud', summary(self.game, best))
    const sound = initState(self, 'brickfall.sound', read('brickfall.sound', true))
    sound.watch(self, (on) => write('brickfall.sound', on))

    self.sprites = await loadSprites()
    if (self.abortSignal.aborted) return null

    const ratio = Math.min(devicePixelRatio || 1, 3)
    self.canvas = canvas({
      width: WIDTH * ratio,
      height: HEIGHT * ratio,
      // Not a tab stop, but a click takes the focus off a button, so Space
      // goes to the game and not to the button last pressed.
      tabindex: -1,
      role: 'img',
      'aria-label':
        'Brickfall board. Arrow keys move the paddle, Space launches the ball and pauses.',
    })
    self.ctx = self.canvas.getContext('2d')
    self.ctx.scale(ratio, ratio)

    const phase = computed([hud], (value) => value.phase)
    self.phase = phase
    const pauseLabel = computed([phase], (value) => (value === 'paused' ? 'Resume' : 'Pause'))

    // Space, or a tap on a waiting board, does the next thing the game waits for.
    self.act = () => {
      if (self.game.phase === 'playing' || self.game.phase === 'paused') togglePause(self.game)
      else launch(self.game)
      self.trail = []
    }
    self.publish = () => {
      const score = self.game.score
      if (score > hud.get().best) write('brickfall.best', score)
      hud.set(summary(self.game, Math.max(score, hud.get().best)))
    }
    self.feedback = (events) => {
      if (sound.get()) events.forEach(play)
      if (events.includes('miss')) navigator.vibrate?.(events.includes('over') ? [80, 60, 160] : 60)
    }

    return div(
      div(
        { class: 'hud' },
        stat('Score', hud.text((value) => String(value.score))),
        stat('Level', hud.text((value) => String(value.level))),
        stat('Lives', hud.text((value) => String(value.lives))),
        stat('Best', hud.text((value) => String(value.best))),
        div(
          { class: 'actions' },
          button(
            {
              size: 'sm',
              disabled: computed([phase], (value) => value !== 'playing' && value !== 'paused'),
              events: { click: () => togglePause(self.game) },
            },
            phase.view((value) => icon(value === 'paused' ? luPlay : luPause, { size: 'sm' })),
            pauseLabel.text(),
          ),
          button(
            { size: 'sm', square: true, label: 'Sound', pressed: sound },
            sound.view((on) => icon(on ? luVolume2 : luVolumeX, { size: 'sm' })),
          ),
        ),
      ),
      self.canvas,
      div(
        { class: 'help' },
        'Steer with the mouse, a finger or the arrow keys. Tap or press Space to launch, P to pause.',
      ),
    )
  },
  onMount: (self) => {
    const options = { signal: self.abortSignal }

    // Board units, whatever size the canvas is drawn at.
    const toBoardX = (event) => {
      const box = self.canvas.getBoundingClientRect()
      return ((event.clientX - box.left) / box.width) * WIDTH
    }
    self.canvas.addEventListener('pointermove', (event) => {
      self.input.pointerX = toBoardX(event)
    }, options)
    self.canvas.addEventListener('pointerdown', (event) => {
      self.input.pointerX = toBoardX(event)
      self.canvas.focus({ preventScroll: true })
      // A finger on the board steers: only a game waiting for its player takes the tap.
      if (self.game.phase !== 'playing') self.act()
    }, options)

    addEventListener('keydown', (event) => {
      const direction = KEYS[event.key]
      if (direction) {
        self.input[direction] = true
        self.input.pointerX = null
        event.preventDefault()
      } else if (event.key === ' ' || event.key === 'Enter') {
        // On a focused button these keys press the button.
        if (fromControl(event)) return
        if (!event.repeat) self.act()
        event.preventDefault()
      } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        togglePause(self.game)
      }
    }, options)
    addEventListener('keyup', (event) => {
      const direction = KEYS[event.key]
      if (direction) self.input[direction] = false
    }, options)

    // A game in a background tab, or on a locked phone, waits for its player.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && self.game.phase === 'playing') togglePause(self.game)
    }, options)

    // The screen stays on while the ball is in play, as a game should.
    computed([self.phase], (value) => value === 'playing').watch(self, async (playing) => {
      if (!playing) {
        self.wakeLock?.release()
        self.wakeLock = null
        return
      }
      self.wakeLock = await navigator.wakeLock?.request('screen').catch(() => null)
    })

    let last = performance.now()
    const frame = (now) => {
      // A long gap, such as a tab coming back, is not a reason to jump the ball.
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const events = step(self.game, dt, self.input)
      if (self.game.phase === 'playing') {
        self.trail.push({ x: self.game.ball.x, y: self.game.ball.y })
        if (self.trail.length > TRAIL) self.trail.shift()
      }
      if (events.length) self.feedback(events)
      self.publish()
      draw(self.ctx, self.game, self.sprites, self.trail)
      self.frame = requestAnimationFrame(frame)
    }
    self.frame = requestAnimationFrame(frame)
  },
  onRemove: (self) => {
    cancelAnimationFrame(self.frame)
    self.wakeLock?.release()
  },
})

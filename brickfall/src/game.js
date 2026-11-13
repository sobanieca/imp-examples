import { KINDS, LEVELS } from './levels.js'

// The rules of the game, with no DOM: the board component calls step() once per
// frame and draws what it returns. Positions are in board units, not pixels,
// so the game plays the same on any screen.
export const WIDTH = 480
export const HEIGHT = 640

const COLUMNS = 10
const BRICK = { w: 42, h: 18, gap: 4, top: 80 }
const LEFT = (WIDTH - (COLUMNS * BRICK.w + (COLUMNS - 1) * BRICK.gap)) / 2
const PADDLE = { w: 84, h: 14, y: HEIGHT - 48, speed: 560 }
const BALL_RADIUS = 7
const MAX_BOUNCE = Math.PI / 3
const LIVES = 3

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// The ball starts faster on every level, and speeds up a little on each paddle hit.
const baseSpeed = (level) => 300 + 35 * level
const maxSpeed = (level) => baseSpeed(level) + 220

const buildBricks = (level) =>
  LEVELS[level % LEVELS.length].flatMap((row, r) =>
    [...row].flatMap((char, c) => {
      const kind = KINDS[char]
      if (!kind) return []
      return [
        {
          x: LEFT + c * (BRICK.w + BRICK.gap),
          y: BRICK.top + r * (BRICK.h + BRICK.gap),
          w: BRICK.w,
          h: BRICK.h,
          hp: kind.hits,
          ...kind,
        },
      ]
    }),
  )

const resetBall = (game) => {
  game.speed = baseSpeed(game.level)
  game.ball = { x: 0, y: 0, vx: 0, vy: 0, r: BALL_RADIUS }
  stickBall(game)
}

const stickBall = ({ ball, paddle }) => {
  ball.x = paddle.x + paddle.w / 2
  ball.y = paddle.y - ball.r
}

// phase: 'ready' (ball on the paddle), 'playing', 'paused', 'cleared' (a level
// is done, the next one waits) or 'over'.
export const newGame = (level = 0) => {
  const game = {
    phase: 'ready',
    score: 0,
    lives: LIVES,
    level,
    paddle: { x: (WIDTH - PADDLE.w) / 2, y: PADDLE.y, w: PADDLE.w, h: PADDLE.h },
    bricks: buildBricks(level),
  }
  resetBall(game)
  return game
}

// Space, a tap or a click: launch the ball, go on to the next level, or start over.
export const launch = (game) => {
  if (game.phase === 'over') {
    Object.assign(game, newGame())
    return
  }
  if (game.phase !== 'ready' && game.phase !== 'cleared') return
  const angle = -0.35
  game.ball.vx = game.speed * Math.sin(angle)
  game.ball.vy = -game.speed * Math.cos(angle)
  game.phase = 'playing'
}

export const togglePause = (game) => {
  if (game.phase === 'playing') game.phase = 'paused'
  else if (game.phase === 'paused') game.phase = 'playing'
}

const touches = (ball, rect) => {
  const dx = ball.x - clamp(ball.x, rect.x, rect.x + rect.w)
  const dy = ball.y - clamp(ball.y, rect.y, rect.y + rect.h)
  return dx * dx + dy * dy < ball.r * ball.r
}

const movePaddle = ({ paddle }, dt, input) => {
  if (input.pointerX != null) paddle.x = input.pointerX - paddle.w / 2
  else paddle.x += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * PADDLE.speed * dt
  paddle.x = clamp(paddle.x, 0, WIDTH - paddle.w)
}

// The paddle sends the ball off at an angle set by where it hit: the centre
// straight up, the edges up to 60 degrees to the side.
const bounceOffPaddle = (game) => {
  const { ball, paddle } = game
  const offset = clamp((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1)
  game.speed = Math.min(game.speed * 1.02, maxSpeed(game.level))
  ball.vx = game.speed * Math.sin(offset * MAX_BOUNCE)
  ball.vy = -game.speed * Math.cos(offset * MAX_BOUNCE)
  ball.y = paddle.y - ball.r
}

// Moves the ball by one small step, so a fast ball never jumps over a brick.
const moveBall = (game, dt, events) => {
  const { ball, paddle } = game
  const fromX = ball.x
  const fromY = ball.y
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  if (ball.x - ball.r < 0 || ball.x + ball.r > WIDTH) {
    ball.x = clamp(ball.x, ball.r, WIDTH - ball.r)
    ball.vx = -ball.vx
    events.push('wall')
  }
  if (ball.y - ball.r < 0) {
    ball.y = ball.r
    ball.vy = Math.abs(ball.vy)
    events.push('wall')
  }
  if (ball.vy > 0 && touches(ball, paddle)) {
    bounceOffPaddle(game)
    events.push('paddle')
    return
  }

  const brick = game.bricks.find((candidate) => candidate.hp > 0 && touches(ball, candidate))
  if (!brick) return
  // The side the ball came from decides the bounce: from the left or the right
  // it turns back horizontally, otherwise vertically.
  const fromSide = fromX + ball.r <= brick.x || fromX - ball.r >= brick.x + brick.w
  if (fromSide) ball.vx = -ball.vx
  else ball.vy = -ball.vy
  ball.x = fromX
  ball.y = fromY
  brick.hp -= 1
  if (brick.hp > 0) {
    events.push('dent')
    return
  }
  game.score += brick.points
  events.push('break')
}

const loseBall = (game, events) => {
  game.lives -= 1
  events.push('miss')
  if (game.lives > 0) {
    game.phase = 'ready'
    resetBall(game)
    return
  }
  game.phase = 'over'
  events.push('over')
}

const clearLevel = (game, events) => {
  game.level += 1
  game.bricks = buildBricks(game.level)
  game.phase = 'cleared'
  resetBall(game)
  events.push('cleared')
}

// Advances the game by dt seconds. input: { left, right, pointerX }. Returns
// what happened, for sounds and vibration: 'wall', 'paddle', 'dent', 'break',
// 'miss', 'over' and 'cleared'.
export const step = (game, dt, input) => {
  const events = []
  if (game.phase === 'paused' || game.phase === 'over') return events
  movePaddle(game, dt, input)
  if (game.phase !== 'playing') {
    stickBall(game)
    return events
  }

  const distance = game.speed * dt
  const steps = Math.max(1, Math.ceil(distance / (BALL_RADIUS / 2)))
  for (let i = 0; i < steps && game.phase === 'playing'; i++) {
    moveBall(game, dt / steps, events)
    if (game.bricks.every((brick) => brick.hp <= 0)) clearLevel(game, events)
    else if (game.ball.y - game.ball.r > HEIGHT) loseBall(game, events)
  }
  return events
}

import { expect, test } from 'imp/test'
import { HEIGHT, launch, newGame, step, togglePause, WIDTH } from '../src/game.js'

const still = { left: false, right: false, pointerX: null }

// Puts the ball at a spot, flying in a direction, with the game in play.
const fire = (game, { x, y, vx, vy }) => {
  launch(game)
  Object.assign(game.ball, { x, y, vx, vy })
  return game
}

test('the ball waits on the paddle until it is launched', () => {
  const game = newGame()
  step(game, 0.1, { ...still, right: true })
  expect(game.phase).toEqual('ready')
  expect(game.ball.x).toEqual(game.paddle.x + game.paddle.w / 2)
  launch(game)
  expect(game.phase).toEqual('playing')
  expect(game.ball.vy < 0).toBeTruthy()
})

test('the paddle follows the pointer and stays on the board', () => {
  const game = newGame()
  step(game, 0.016, { ...still, pointerX: WIDTH + 100 })
  expect(game.paddle.x).toEqual(WIDTH - game.paddle.w)
  step(game, 0.016, { ...still, pointerX: 100 })
  expect(game.paddle.x + game.paddle.w / 2).toEqual(100)
})

test('a wall turns the ball back', () => {
  const game = fire(newGame(), { x: 10, y: 400, vx: -300, vy: 0 })
  expect(step(game, 0.05, still)).toContain('wall')
  expect(game.ball.vx > 0).toBeTruthy()
})

test('a brick breaks, scores and bounces the ball', () => {
  const game = newGame()
  const brick = game.bricks.at(-1)
  fire(game, { x: brick.x + brick.w / 2, y: brick.y + brick.h + 20, vx: 0, vy: -300 })
  const events = step(game, 0.1, still)
  expect(events).toContain('break')
  expect(brick.hp).toEqual(0)
  expect(game.score).toEqual(brick.points)
  expect(game.ball.vy > 0).toBeTruthy()
})

test('a steel brick takes two hits', () => {
  const game = newGame(1)
  const steel = game.bricks.find((brick) => brick.sprite === 'steel')
  game.bricks = [steel, { ...steel, x: 0, y: 0, hp: 1 }]
  fire(game, { x: steel.x + steel.w / 2, y: steel.y + steel.h + 20, vx: 0, vy: -300 })
  expect(step(game, 0.1, still)).toContain('dent')
  expect(steel.hp).toEqual(1)
})

test('the last brick clears the level', () => {
  const game = newGame()
  const brick = game.bricks[0]
  game.bricks = [brick]
  fire(game, { x: brick.x + brick.w / 2, y: brick.y + brick.h + 10, vx: 0, vy: -300 })
  expect(step(game, 0.1, still)).toContain('cleared')
  expect(game.phase).toEqual('cleared')
  expect(game.level).toEqual(1)
  expect(game.bricks.length > 0).toBeTruthy()
})

test('a missed ball costs a life, the last one ends the game', () => {
  const game = fire(newGame(), { x: 20, y: HEIGHT - 5, vx: 0, vy: 400 })
  expect(step(game, 0.1, still)).toContain('miss')
  expect({ lives: game.lives, phase: game.phase }).toEqual({ lives: 2, phase: 'ready' })

  game.lives = 1
  fire(game, { x: 20, y: HEIGHT - 5, vx: 0, vy: 400 })
  expect(step(game, 0.1, still)).toContain('over')
  expect(game.phase).toEqual('over')

  launch(game)
  expect({ lives: game.lives, score: game.score, phase: game.phase }).toEqual({
    lives: 3,
    score: 0,
    phase: 'ready',
  })
})

test('a paused game does not move', () => {
  const game = fire(newGame(), { x: 200, y: 400, vx: 100, vy: -100 })
  togglePause(game)
  step(game, 0.1, still)
  expect({ x: game.ball.x, y: game.ball.y }).toEqual({ x: 200, y: 400 })
  togglePause(game)
  expect(game.phase).toEqual('playing')
})

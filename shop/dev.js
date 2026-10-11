// `npm run dev`: build the islands, build them again on every change, and run
// the server in watch mode. Reload the browser to pick up a new islands build.
import { spawn } from 'node:child_process'
import { watch } from 'node:fs'

const buildIslands = () =>
  new Promise((resolve) => {
    spawn('imp', ['build', 'islands/main.js', '--output', 'public/islands'], { stdio: 'inherit' })
      .on('close', resolve)
      .on('error', (error) => {
        console.error(`Could not run imp: ${error.message}`)
        resolve()
      })
  })

await buildIslands()

spawn(process.execPath, ['--watch', 'server/main.js'], { stdio: 'inherit' })

let pending
watch('islands', { recursive: true }, () => {
  clearTimeout(pending)
  pending = setTimeout(buildIslands, 200)
})

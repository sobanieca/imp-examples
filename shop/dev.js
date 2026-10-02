// `deno task dev`: build the islands, build them again on every change, and run
// the server in watch mode. Reload the browser to pick up a new islands build.
const buildIslands = () =>
  new Deno.Command('imp', { args: ['build', 'islands/main.js', '--output', 'public/islands'] })
    .spawn().status

await buildIslands()

new Deno.Command(Deno.execPath(), {
  args: ['run', '--allow-net', '--allow-read', '--allow-env', '--watch', 'server/main.js'],
}).spawn()

let pending
for await (const _change of Deno.watchFs('islands')) {
  clearTimeout(pending)
  pending = setTimeout(buildIslands, 200)
}

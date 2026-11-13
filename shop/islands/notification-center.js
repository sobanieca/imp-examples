import { component } from 'imp'
import { span } from 'imp/html'
import { luBell, luBellOff } from 'imp/icons'
import { initHttpClient } from 'imp/http'
import { computed, initState } from 'imp/state'
import { button, icon } from 'imp/std'
import { timeline } from 'imp/std/data'
import { emptyState, tag } from 'imp/std/display'
import { notify, toast } from 'imp/std/feedback'
import { drawer, flex, stack } from 'imp/std/layout'

const COLORS = { info: 'blue', success: 'green', warning: 'amber', error: 'red' }

// The bell of the header. The inbox lives on the server, so it survives a page
// load; new entries arrive over server-sent events and pop up as a toast.
export const notificationCenter = component('impulse-notification-center', {
  setup: (self, { inbox: initialInbox }) => {
    const api = initHttpClient(self, 'impulse.api', { baseUrl: '/api' })
    const inbox = initState(self, 'impulse.inbox', initialInbox)
    const open = initState(self, 'impulse.inbox.open', false)
    const unread = computed([inbox], (all) => all.filter((entry) => !entry.read).length)

    const stream = new EventSource('/api/notifications/stream')
    stream.addEventListener('message', (event) => {
      const entry = JSON.parse(event.data)
      inbox.set((all) => [entry, ...all])
      const { kind, title, description, link } = entry
      notify({ kind, title, description, link, ttl: 0 })
    })
    self.abortSignal.addEventListener('abort', () => stream.close())

    open.watch(self, async (isOpen) => {
      if (isOpen && unread.get() > 0) inbox.set(await api.post('/notifications/read'))
    })

    const clearAll = async () => inbox.set(await api.delete('/notifications'))

    return span(
      button(
        {
          variant: 'ghost',
          label: computed([unread], (count) =>
            count ? `Notifications, ${count} unread` : 'Notifications',
          ),
          events: { click: () => open.set(true) },
        },
        icon(luBell),
        unread.view((count) => count > 0 && tag({ color: 'red', size: 'sm' }, count)),
      ),
      drawer(
        { title: 'Notifications', open },
        inbox.view((all) =>
          all.length === 0
            ? emptyState({ icon: luBellOff, title: 'You are all caught up' })
            : stack(
                { gap: 4 },
                timeline({
                  label: 'Notifications',
                  items: all.map((entry) => ({
                    id: entry.id,
                    time: entry.time,
                    title: entry.title,
                    description: entry.description,
                    color: COLORS[entry.kind],
                    href: entry.link?.href,
                  })),
                }),
                flex(
                  { horizontalAlign: 'end' },
                  button({ variant: 'ghost', events: { click: clearAll } }, 'Clear all'),
                ),
              ),
        ),
      ),
      toast(),
    )
  },
})

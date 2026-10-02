import { component } from 'imp'
import { useHttpClient } from 'imp/http'
import { navigate, useRoute } from 'imp/router'
import { useState } from 'imp/state'
import { heading, text } from 'imp/std'
import { card } from 'imp/std/display'
import { form, FormError, textField } from 'imp/std/inputs'
import { stack } from 'imp/std/layout'
import { app } from './app-map.js'
import { submitButton } from './submit-button.js'
import { writeToken } from './token.js'

// Only follow `?next=` to a path of this app, never to another site.
const nextPath = () => {
  const next = useRoute().get().query.next ?? ''
  return /^\/(?![/\\])/.test(next) ? next : app.dashboards.href()
}

export const signInPage = component('beacon-sign-in', {
  styles: `:host { display: block; inline-size: min(26rem, calc(100dvi - 2rem)); }`,
  setup: (self) => {
    const api = useHttpClient(self, 'beacon.api')
    const session = useState(self, 'beacon.session')

    const signIn = async (credentials) => {
      let user
      try {
        user = await api.post('/session', { body: credentials })
      } catch (error) {
        throw new FormError('Wrong email or password', { cause: error })
      }
      writeToken(user.token)
      session.set(user)
      navigate(nextPath(), { replace: true })
    }

    return card(
      { padding: 'lg' },
      stack(
        { gap: 5 },
        stack(
          { gap: 2, horizontalAlign: 'center' },
          heading({ align: 'center' }, 'Sign in to Beacon'),
          text({ tone: 'secondary', align: 'center' }, 'Any email works. The password is "admin".'),
        ),
        form(
          { initialValues: { email: 'grace@beacon.dev', password: '' }, onSubmit: signIn },
          textField({ field: 'email', type: 'email', label: 'Email', required: true }),
          textField({ field: 'password', type: 'password', label: 'Password', required: true }),
          submitButton('Sign in'),
        ),
      ),
    )
  },
})

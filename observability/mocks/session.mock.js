// Sign-in: any email with the password "admin". The token is the email itself.

const userFrom = (authorization) => {
  const email = authorization?.replace(/^Bearer /, '')
  return email ? { email, name: email.split('@')[0] } : null
}

export const mocks = [
  {
    match: (request) => request.method === 'POST' && request.path === '/api/session',
    delay: 500,
    handler: ({ body }) => {
      if (body.password !== 'admin') return { status: 401, body: { message: 'Wrong password' } }
      return { status: 201, body: { ...userFrom(body.email), token: body.email } }
    },
  },
  {
    match: (request) => request.method === 'GET' && request.path === '/api/session',
    handler: ({ headers }) => {
      const user = userFrom(headers.authorization)
      return user ? { body: user } : { status: 401, body: { message: 'Not signed in' } }
    },
  },
]

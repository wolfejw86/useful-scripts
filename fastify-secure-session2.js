const fastify = require('fastify')({ logger: true })
const fs = require('fs')
const path = require('path')

fastify.register(require('fastify-secure-session'), {
  // adapt this to point to the directory where secret-key is located
  key: fs.readFileSync(path.join(__dirname, 'secret-key')),
  cookie: {
    path: '/',
    httpOnly: true,
      maxAge: 100000,
    // options from setCookie, see https://github.com/fastify/fastify-cookie
  }
})

fastify.get('/login', (request, reply) => {
  fs.createReadStream('index.html').pipe(reply.res)
})

fastify.post('/', (request, reply) => {
  request.session.set('data', request.body)
  reply.send('hello world')
})

fastify.get('/', (request, reply) => {
  const data = request.session.get('data')
  if (!data) {
    reply.code(404).send()
    return
  }
  reply.send(data)
})

fastify.post('/logout', (request, reply) => {
  request.session.delete()
  reply.send('logged out')
});

fastify.listen(3000);
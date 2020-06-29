const Fastify = require('fastify');
const cookieSession = require('fastify-secure-session');
const sodium = require('sodium-native');
const fs = require('fs');

const fastify = Fastify({ logger: true });



/**
 * 
 * @param {Fastify.FastifyInstance} instance 
 * @param {*} opts 
 * @param {*} next 
 */
function plugin(instance, opts, next) {
  console.log(sodium.crypto_secretbox_KEYBYTES);
  const key1 = Buffer.alloc(sodium.crypto_secretbox_KEYBYTES);
  sodium.randombytes_buf(key1);
  console.log(key1.toString('hex'));

  instance.register(cookieSession, {
    key: key1,
    cookieName: 'my-session',
    cookie: {
      httpOnly: true,
      secure: false,
      path: '/',
      maxAge:  10, // 10 seconds
    }
  });

  let sessions = 0;

  instance.get('/', (request, reply) => {
    if (request.session.get('data')) {
      console.log({msg: 'session already current'});
    } else {
      sessions++;
    }

    console.log({msg: 'creating session', sessions });

    request.session.set('data', { hello: 'world', sessions });
    reply.send('Hello - cookie set to {hello: "world"}');
  });

  instance.get('/show', (request, reply)=> {
    reply.send(request.session.get('data') || 'No session found');
  });

  instance.get('/delete', (request, reply) => {
    request.session.delete();
    reply.send('session deleted');
  });

  next();
}

fastify.register(plugin);

fastify.listen(3000);
const buffer = require('buffer');
const crypto = require('crypto');

// Demo implementation of using `aes-256-gcm` with node.js's `crypto` lib.
const aes256gcm = (key) => {
  const ALGO = 'aes-256-gcm';

  // encrypt returns base64-encoded ciphertext
  const encrypt = (str) => {
    // Hint: the `iv` should be unique (but not necessarily random).
    // `randomBytes` here are (relatively) slow but convenient for
    // demonstration.
    const iv = Buffer.from(crypto.randomBytes(16), 'utf8');
    const cipher = crypto.createCipheriv(ALGO, key, iv);

    // Hint: Larger inputs (it's GCM, after all!) should use the stream API
    let enc = cipher.update(str, 'utf8', 'base64');
    enc += cipher.final('base64');
    return [enc, iv, cipher.getAuthTag()];
  };

  // decrypt decodes base64-encoded ciphertext into a utf8-encoded string
  const decrypt = (enc, iv, authTag) => {
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    let str = decipher.update(enc, 'base64', 'utf8');
    str += decipher.final('utf8');
    return str;
  };

  return {
    encrypt,
    decrypt,
  };
};

const KEY = Buffer.from(crypto.randomBytes(32), 'utf8');

console.log(KEY.toString('hex').length)

const aesCipher = aes256gcm(KEY);

const [encrypted, iv, authTag] = aesCipher.encrypt('evil jenkins ');
console.log({ encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') })
const [encrypted2, iv2, authTag2] = aesCipher.encrypt('evil jenkins ');
console.log({ encrypted2, iv: iv2.toString('hex'), authTag: authTag2.toString('hex') })
const decrypted = aesCipher.decrypt(encrypted, iv, authTag);

console.log(decrypted);


const KEY1 = Buffer.from(crypto.randomBytes(32), 'utf8');
const KEY2 = Buffer.from(crypto.randomBytes(32), 'utf8');
const KEY3 = Buffer.from(crypto.randomBytes(32), 'utf8');

const encryptedDoc = {
  field1: 'not encrypted, but field2 is!',
  field2: 'encrypted',
  keyIndex: 0,
};

const [e, i, tag] = aes256gcm(KEY1).encrypt(encryptedDoc.field2)
encryptedDoc.field2 = `${i.toString('hex')}:${tag.toString('hex')}:${e}`;


console.log(encryptedDoc)
const [ui, utag, ue] = encryptedDoc.field2.split(':');
console.log('decrypted doc field!', aes256gcm(KEY1).decrypt(ue, Buffer.from(ui, 'hex'), Buffer.from(utag, 'hex')));
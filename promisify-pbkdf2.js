// crypo.randomBytes() and crypto.pbkdf2() are CPU intensive. The synchronous versions may block the worker pool with a large number of requests
// use the built-in util.promisify method to convert the callback-based functions into promises

const util = require('util')
const crypto = require('crypto')

// promisify crypto.pbkdf2() and crypto.randomBytes()
const pbkdf2Async = util.promisify(crypto.pbkdf2)
const randomBytesAsync = util.promisify(crypto.randomBytes)


function generatePassword(password, saltLen=32, iter=50000, keyLen=256, digest='sha256') {
    
    this.exportedAuth = {} // object will be populated with salt and hash once computed
    return randomBytesAsync(saltLen)
            .then((randomBytes) => {
                let salt = randomBytes.toString('hex')
                //console.log(`The salt is: ${ salt }\n`) // logs salt correctly
                this.exportedAuth.salt = salt                
                return pbkdf2Async(password, salt, iter, keyLen, digest)
            })
            .then((hash) => {
                hash = hash.toString('hex')
                //console.log(`The hash is: ${ hash }\n`) // logs hash correctly
                this.exportedAuth.hash = hash
                //console.log(this.exportedAuth) // logs {salt: 'XXXX', hash: 'XXXX'}
                return this.exportedAuth
            })
            .catch((err) => {
                console.error(err)
            })
}

/*
(async () => {
    console.log(await generatePassword('cowz'))
})()
*/


module.exports = generatePassword
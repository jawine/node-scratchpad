require('dotenv').config()
const pg = require('pg')
const generatePassword = require('./promisify-pbkdf2.js')

// create database connection pool
const pool = new pg.Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDB,
    password: process.env.PGPASS,
    port: process.env.PGPORT
});

// create users table (this code would be split out into a separate file in the complete API)
(async () => {
    const client = await pool.connect()
    try {
        await pool.query(
            'CREATE TABLE IF NOT EXISTS users\
            (\
                user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\
                username VARCHAR(80) NOT NULL UNIQUE,\
                email VARCHAR(256) NOT NULL UNIQUE,\
                bio VARCHAR(280) NULL,\
                salt VARCHAR(512) NOT NULL,\
                hash VARCHAR(512) NOT NULL\
            )'
        )
    } catch (err) {
        console.error(err)
    } finally {
        client.release()
    }
})()

async function createUserInDB(username, email, password){

    if (username && email && password) {
        // check out a client connection (one per transaction)
        // if client connection is unsuccessful, it will be undefined
        const client = await pool.connect()

        try {
            // insertion values need to be populated
            // username, email, and password are provided from HTTP POST request body, 
            // need to run async method to get the salt and hash of the provided password
            const authInfo = await generatePassword(password)
            // populate array of values to be inserted
            const insertUserValues = [username, email]
            insertUserValues[2] = authInfo.salt
            insertUserValues[3] = authInfo.hash

            // new user creation needs to be atomic, so it should run in a single transaction 
            // (we can't create a user missing an email, username, or salt and hash of password)
            await client.query('BEGIN')
            // we will want to return the id of the new user to the calling function
            const insertUserText = 'INSERT INTO users (username, email, salt, hash) \
                                    VALUES($1, $2, $3, $4) RETURNING user_id'

            // insert the new user and store their new ID in a variable
            const { rows } = await client.query(insertUserText, insertUserValues)
            await client.query('COMMIT')
            return rows[0]
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally { // release the client back to the pool no matter what
            client.release()
        }
    } else {
        throw new Error('username, email, and password are required!')
    }
}

/*
(async () => {
    return await createUserInDB('johnny7', 'johnny7@test.com', 'doggiez!').catch((err) => { console.error(err.detail) })
})()
*/
module.exports = createUserInDB
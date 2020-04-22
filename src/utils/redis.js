const REDIS_TOTAL_RETRY_TIME_SECS = 3600
const REDIS_MAX_RETRY_ATTEMPTS = 10

const redis = require('redis')

let clientInstance = null

const initClient = () => {
    const client = redis.createClient({
        retry_strategy: options => {
            if (options.error && options.error.code === "ECONNREFUSED") {
                // End reconnecting on a specific error and flush all commands with a individual error
                return new Error("The server refused the connection")
            }
            if (options.total_retry_time > 1000 * REDIS_TOTAL_RETRY_TIME_SECS) {
                // End reconnecting after a specific timeout and flush all commands with a individual error
                return new Error("Retry time exhausted")
            }
            if (options.attempt > REDIS_MAX_RETRY_ATTEMPTS) {
                // End reconnecting with built in error
                return undefined;
            }
            // reconnect after
            return Math.min(options.attempt * 100, 3000)
        },
    })

    client.on("error", error => {
        throw error
    })

    return client
}

const getClientInstance = () => {
    if (clientInstance === null) {
        try {
            clientInstance = initClient()
            return clientInstance
        } catch (err) {
            throw err
        }
    } else {
        return clientInstance
    }
}

const getKey = key => {
    return new Promise((resolve, reject) => {
        try {
            client = getClientInstance()
            client.get(key, (err, reply) => {
                // console.log(reply)
                if (err) {
                    reject(err)
                } else {
                    resolve(reply)
                } 
            })
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    getKey
}



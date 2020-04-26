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

const getSingleFromKey = key => {
    return new Promise((resolve, reject) => {
        try {
            const client = getClientInstance()
            client.get(key, (error, reply) => {
                // console.log(reply)
                if (error) {
                    reject(error)
                } else {
                    resolve(reply)
                }
            })
        } catch (error) {
            reject(error)
        }
    })
}

// const getValuesFromKeys = keys => {
//     return new Promise((resolve, reject) => {
//         if (!keys.length) {
//             resolve({})
//         }
//         try {
//             const client = getClientInstance()
//             let count = 0
//             let errors = 0
//             let result = {} 
//             keys.forEach(k => {
//                 client.get(k,(error, reply)=>{
//                     ++count
//                     if (error) {
//                         ++errors
//                     } else {
//                         result[k] = reply
//                     }
//                     if (count === keys.length) {
//                         if (errors) {
//                             console.warn(`redis get multi keys: get ${keys.length} keys with ${errors} error`)
//                         }
//                         resolve(result)
//                     }
//                 })
//             })

//         } catch (error) {
//             reject(error)
//         }
//     })
// }

const setSingle = (key, val) => {
    return new Promise((resolve, reject) => {
        try {
            const client = getClientInstance()
            client.set(key, val, (error, reply) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(reply)
                }
            })
        } catch (error) {
            reject(error)
        }
    })
}

const addToSets = (key, val) => {
    return new Promise((resolve, reject) => {
        try {
            const client = getClientInstance()
            client.sadd(key, val, (error, reply) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(reply)
                }
            })
        } catch (error) {
            reject(error)
        }
    })
}

const getSetsFromKey = key => {
    return new Promise((resolve, reject) => {
        try {
            const client = getClientInstance()
            client.smembers(key, (error, reply) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(reply)
                }
            })
        } catch (error) {
            reject(error)
        }
    })
}

const removeFromSets = (key, val) => {
    return new Promise((resolve, reject) => {
        try {
            const client = redis.createClient()
            client.srem(key,val, (error, reply) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(reply)
                }
            })
        } catch (error) {
            reject(error)
        }
    })
}

//const addToHash

module.exports = {
    addToSets,
    getClientInstance,
    getSingleFromKey,
    getSetsFromKey,
    removeFromSets,
    setSingle,
}
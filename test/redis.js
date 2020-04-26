//const redis = require('../src/utils/redis')

// const main = async () => {
//     try {
//         let reply = null
//         console.log('redis test single key')
//         await redis.setSingle('16vls:test:1', '1')
//         reply = await redis.getSingleFromKey('16vls:test:1');
//         (reply !== '1') && console.error('error: reply should equals \'1\'')

//         reply = null
//         console.log('redis test single object')
//         await redis.setSingle('16vls:test:object', JSON.stringify({ a: 3, b: "c" }))
//         reply = await redis.getSingleFromKey('16vls:test:object')
//         JSON.parse(reply);
//         (reply["a"] !== 3 || reply["b"] !== 'c') && console.error('error: reply should equals object {a:3,b:"c"}')


//         reply = null
//         console.log('redis test add to sets')
//         await redis.addToSets('16vls:test:sets1', '1')
//         reply = await redis.getSetsFromKey('16vls:test:sets1');
//         (reply[0] !== '1') && console.error('error 1st element of reply (array) should equal \'1\'')

//         reply = null
//         console.log('redis test remove from sets')
//         await redis.removeFromSets('16vls:test:sets1', '1')
//         reply = await redis.getSetsFromKey('16vls:test:sets1');
//         reply.length && console.error('error reply must be empty array')

        

//     } catch (error) {
//         console.error(error)
//     }

// }

//main()
var mongoose = require('mongoose')
var dotenv = require('dotenv')
dotenv.config()

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-c2upe.mongodb.net/16vls?retryWrites=true&w=majority`

const databaseConnect = () => {
  return mongoose.createConnection(uri, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  })
}

module.exports = {
  connection: async (entity, schemaName) => {
    return new Promise((resolve, reject) => {
      databaseConnect()
        .then(results => {
          resolve(results.model(entity, schemaName))
        })
        .catch(error => {
          reject(error)
        })
        // connect.connection.close()
    })
  }
}

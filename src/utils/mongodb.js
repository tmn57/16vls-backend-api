var mongoose = require('mongoose')

module.exports = async function connect(uri) {
    try {
      mongoose
        .connect(uri, {
          useUnifiedTopology: true,
          useNewUrlParser: true
        })
        .then(async item => {
          console.log('Connect database successfully!')
          mongoose.Promise = global.Promise
          // const database = item.connection
        })
    } catch (error) {
      console.log('ERR / CONNECT DATABASE FAILED: ', error)
    } finally {
      console.log('Connection is close!')
    }
  }

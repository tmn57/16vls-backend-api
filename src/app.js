const http = require('http')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const cors = require('cors')
const { isAuthenticated } = require('./middlewares/auth')
const { cryptoExchange } = require('./CryptoJs')
require('express-async-errors')
//Init Express App
const app = express()
app.use(cors())
dotenv.config()

const apiPort = process.env.PORT || '3000'
const socketioPort = process.env.SOCKETIO_PORT || '5000'

// let logFileName = (new Date()).toISOString()
// let logFileDir = 'logs/' + logFileName + '.log'
// app.use(logger('common', {
//     stream: fs.createWriteStream(logFileDir, {flags: 'a'})
// }))

app.use(logger('dev'))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
// Some route
app.get('/', (req, res) => {
  res.send('16vls web API')
})
app.get('/cryptoJS', (req, res) => {
  res.send(cryptoExchange)
})
app.use('/static', express.static(path.join(__dirname, 'public')))
app.use('/', require('./routes/common.route'))
app.use('/stores', isAuthenticated, require('./routes/store.route'))
app.use('/products', isAuthenticated, require('./routes/product.route'))
app.use('/images', isAuthenticated, require('./routes/image.route'))
app.use('/promotions', isAuthenticated, require('./routes/promotion.route'))
app.use('/users', isAuthenticated, require('./routes/user.route'))

//handle error
app.use(function (err, req, res, next) {
  return res.status(err.status).json(err)
})

// NOT FOUND API
app.use((req, res, next) => {
  res.status(404).send('NOT FOUND')
})

//Init apiServer
const apiServer = http.Server(app)
apiServer.listen(apiPort)
apiServer.on('error', error => onError('apiServer', error))
apiServer.on('listening', () => onListening(apiServer))


//Init socketio server
const socketServer = http.Server(app)
socketServer.listen(socketioPort)
socketServer.on('error', error => onError('socketServer', error))
socketServer.on('listening', () => onListening(socketServer))


//connect database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-c2upe.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
const connectDatabase = () => {
  mongoose.connect(
    uri,
    {
      useUnifiedTopology: true,
      useNewUrlParser: true
    },
    err => {
      if (err) {
        console.log('Failed to connect to mongo on startup - retrying in 2 sec', err)
        setTimeout(connectDatabase, 2000)
      } else {
        console.log('Connected to the database')
      }
    }
  )
}

connectDatabase()
    

//helpers
const onListening = server => {
  const addr = server.address()
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
  console.log('Listening on ' + bind)
}

const onError = (serverName, error) => {
  console.error(`from ${serverName}: ${error.code}`)
}

module.exports = app


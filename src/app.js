const http = require('http')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const { isAuthenticated } = require('./middlewares/auth')

//Init Express App
const app = express()

dotenv.config()

const port = process.env.PORT || '3000'
app.set('port', port)

// let logFileName = (new Date()).toISOString()
// let logFileDir = 'logs/' + logFileName + '.log'
// app.use(logger('common', {
//     stream: fs.createWriteStream(logFileDir, {flags: 'a'})
// }))

app.use(logger('dev'))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

// Some route
app.get('/', (req, res) => {
  res.json({
    msg: '16VLS API'
  })
})

app.use('/users', require('./routes/user.route'))
app.use('/stores', isAuthenticated, require('./routes/store.route'))
app.use('/accounts', isAuthenticated, require('./routes/account.route'))

//handle error
app.use(function (err, req, res, next) {
  res.json(err)
})

// NOT FOUND API
app.use((req, res, next) => {
  res.status(404).send('NOT FOUND')
})

//handle error
function onError(err, req, res, next) {
  console.log(err)
}

//Init server
const server = http.createServer(app)
server.listen(port)
server.on('error', onError)
server.on('listening', onListening)


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

//function
function onListening() {
  const addr = server.address()
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
  console.log('Listening on ' + bind)
}

module.exports = app

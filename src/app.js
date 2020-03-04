var http = require('http')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')
var fs = require('fs')
var dotenv = require('dotenv')

var indexRouter = require('./routes/index')

//Init Express App
var app = express()

dotenv.config()

var port = process.env.PORT || '3000'
app.set('port', port)

let logFileName = (new Date()).toISOString()
let logFileDir = 'logs/' + logFileName + '.log'
app.use(logger('common', {
    stream: fs.createWriteStream(logFileDir, {flags: 'a'})
}));

app.use(logger('dev'))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)

//Init server
var server  = http.createServer(app)
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

//
function onError(error){
    console.error(error.code)
}

//function
function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}

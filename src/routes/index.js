var express = require('express')
var router = express.Router()

/* GET home page. */
router.get('/', (req, res, next) => {
  res.status(200).send('16vls web API')
})

router.get('/test-route', (req, res, next) => {
  res.status(200).send('it is going to work !')
})

module.exports = router

module.exports = {
  apps: [{
    name: 'api',
    script: './src/app.js',
    cwd: '16vls-backend-api/',
    "watch": "../",
    "log_date_format": "YYYY-MM-DD HH:mm Z",
  }]
}
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
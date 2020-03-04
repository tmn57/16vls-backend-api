var express = require('express')
var router = express.Router()

/* GET home page. */
router.get('/', function(req, res, next) {
  res.status(200).send('16vls web API');
})

module.exports = router

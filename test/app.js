const request = require('supertest')
const app = require('../src/app.js')

describe('GET /', function () {
    it('home route', function (done) {
        request(app).get('/').expect('16vls web API').end((err,res)=>{
            if (err) return done(err)
            return done()
        })
    })
})
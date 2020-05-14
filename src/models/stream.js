const { Schema, model } = require('mongoose')

const StreamSchema = new Schema(
  {
    startTime: { type: Number, default: Date.now },
    duration: { type: Number, default: 0 }, // -1 means is 'live' / 0: means 'incoming' / >0: is lived
    title: String,
    storeId: String, //owner of store is host
    products: [{
      productId: String,
      inStreamAt: [Number]
    }],
    messages: [{
      userId: String,
      message: { type: String, default: 'text message'},
      inStreamAt: {type: Number, default: 0}
    }]
  },
  {
    timestamps: true,
    versionKey: false // remove field "__v"
  }
)
//how to format code?
//
module.exports = model('Stream', StreamSchema)

/**
 * products element object schema
 * {
        productId:'prodidtest',
        inStreamAt: [-1],
        variants:[
            {
                color:'white',
                size:'32',
                qty:32,
                streamPrice:120000,
                inCartOf: ['uidtest',]
            }
        ]
    }
 */

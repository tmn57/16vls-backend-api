const { Schema, model } = require('mongoose')

const StreamSchema = new Schema(
  {
    startTime: { type: Number, default: 0 }, //0 means not scheduled
    endTime: { type: Number, default: Number.MIN_SAFE_INTEGER },
    //Number.MAX_SAFE_INTEGER means the stream is live and has not end yet
    //Number.MIN_SAFE_INTEGER means the stream is still not live yet
    //endTime < Number.MAX_SAFE_INTEGER: //stream was live 
    title: String,
    storeId: String, //owner of store is host
    products: [{
      productId: String,
      inStreamAt: [Number],
      streamPrice: Number
    }],
    messages: [{
      userId: String,
      message: { type: String, default: 'text message' },
      inStreamAt: { type: Number, default: 0 }
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
                quantity:32,
                streamPrice:120000,
                inCartOf: ['uidtest',]
            }
        ]
    }
 */

let userSessions = new Map()
let streamSessions = new Map()

userSessions.set('uidtest',{
                                name:'user name Test',
                                avatarUrl: 'https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=320&q=80',
                                cart: [{
                                    productId: 'test',
                                    variantIndex:0,
                                    qty:1,
                                    price:100000
                                },],
                                inStreamId:null
                            })

userSessions.set('hostuidtest',{ 
                                name:'user host name Host Test',
                                avatarUrl: 'https://images.unsplash.com/photo-1506919258185-6078bba55d2a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=320&q=80',
                            })
                            
streamSessions.set('streamidtest',{ 
                                title:'stream title Test',
                                hostUId: 'hostuidtest',
                                startTimeStamp: 1587711460069,
                                products: [{
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
                                },],
                                messages:[{
                                    user_id:'user_id',
                                    message: 'this is the testing msg',
                                    inStreamAt: 0
                                },],
                                participants:['uidtest'],
                            })
module.exports = {
    userSessions,
    streamSessions
}
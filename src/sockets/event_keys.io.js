/**
 * 3 subjects: server, stream (individual stream), user
 * Event naming convention:
 * +if event from client: Verb + Noun
 * +if event from server: Noun + Verb
 * +if event from server is error or warning: start the msg with
 */
module.exports = {
    //JSON payload
    SERVER_MESSAGE: 'server message', 
    //{type:"error"/"message", message} 
    //test OK

    STREAM_CHAT_MESSAGE: 'stream chat message', 
    //test OK

    STREAM_MESSAGE: 'stream message', 
    //test OK

    STREAM_PRODUCT_QUANTITY: 'stream updates quantity', 
    //{productIndex, variantIndex, quantity} 
    //test OK

    STREAM_UPDATE_CURRENT_PRODUCT_INDEX: 'stream updates current product index', 
    //{productIndex,inStreamAt}
    //test OK

    STREAM_STATUS_UPDATE: 'stream status updated', 
    //{statusCode: 0/1/2/3, [videoUri], [message]} 
    //0: incoming stream, 1 is live (HLS link) , 2: was live (http VOD link), 3: error
    //test OK

    STREAM_UPDATE_STREAMPRICE: 'stream updates streamPrice', 
    // {productIndex, streamPrice}
    //NOT test yet

    SELLER_UPDATE_STREAMPRICE: 'seller updates streamPrice', 
    // {productIndex, streamPrice}
    //NOT test yet

    USER_ADD_PRODUCT_TO_CART: 'user adds product', 
    //{productIndex,isReliable,variantIndex,quantity}
    //test OK

    USER_LIKE: 'user likes stream',
    //test OK

    //String payload
    STREAM_COUNT_VIEWS: 'stream count views', 
    //returns views: Number
    //Test OK

    STREAM_COUNT_LIKES: 'stream count likes',
    //returns likes: Number
    //Test OK

    SELLER_END_STREAM: 'seller ends stream',
    //NOT test yet

    SELLER_GET_PUBLISH_TOKEN: 'seller gets publish token',
    //Test OK --- Mockup

    SELLER_PUBLISH_PLAYER_STATUS: 'sellers publish player status', //"event_code",
    //OK

    SELLER_SET_CURRENT_PRODUCT_INDEX: 'seller sets current product index', 
    //Product index
    //Test OK

    SELLER_START_STREAM: 'seller starts stream',
    //Test OK

    USER_JOIN_STREAM: 'user joins stream',
    //Test OK
    
    USER_ADD_MESSAGE: 'user adds chat message',
    //Test OK

  };
  
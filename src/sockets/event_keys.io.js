/**
 * 3 subjects: server, stream (individual stream), user
 * Event naming convention:
 * +if event from client: Verb + Noun
 * +if event from server: Noun + Verb
 * +if event from server is error or warning: start the msg with
 */
module.exports = {
    //JSON payload
    SERVER_MESSAGE: 'server message', //{type:"error"/"message", message}
    //STREAM_INIT: 'stream init', //DEPRECATED
    STREAM_CHAT_MESSAGE: 'stream chat message',
    STREAM_MESSAGE: 'stream message',
    STREAM_PRODUCT_QUANTITY: 'stream updates quantity', //{productIndex, variantIndex, quantity}
    STREAM_UPDATE_CURRENT_PRODUCT_INDEX: 'stream updates current product index', //{productIndex,inStreamAt}
    STREAM_STATUS_UPDATE: 'stream status updated', //{statusCode: 0/1/2/3, [videoUri], [message]} ---- 0: incoming stream, 1 is live, 2: was live, 3: error
    STREAM_UPDATE_STREAMPRICE: 'stream updates streamPrice', // {productIndex, streamPrice}
    SELLER_UPDATE_STREAMPRICE: 'seller updates streamPrice', // {productIndex, streamPrice},
    USER_ADD_PRODUCT_TO_CART: 'user adds product', //{productIndex,isReliable,variantIndex,quantity}
    USER_LIKE: 'user likes stream',
    
    //String payload
    STREAM_COUNT_VIEWS: 'stream count views', // "views"
    STREAM_COUNT_LIKES: 'stream count likes', // "userIds", check user is liked or not
    STREAM_PUBLISH_TOKEN: 'stream publish token',
    STREAM_UPDATE_PUBLISH_TOKEN: 'stream updates publish token',
    SELLER_END_STREAM: 'seller ends stream',
    SELLER_GET_PUBLISH_TOKEN: 'seller gets publish token',
    SELLER_PUBLISH_PLAYER_STATUS: 'sellers publish player status', //"event_code",
    SELLER_SET_CURRENT_PRODUCT_INDEX: 'seller sets current product index', //Product index
    SELLER_START_STREAM: 'seller starts stream',
    USER_JOIN_STREAM: 'user joins stream',
    USER_ADD_MESSAGE: 'user adds chat message',
  
    //BUYER_SET_CURRENT_TIME: 'buyer set current time', //"time" (miliseconds)
    //BUYER_SET_SEEK_TIME: 'buyer set seek time', // "time" (miliseconds)
  };
  
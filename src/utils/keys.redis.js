module.exports = {
    //USER_DATA: 
    /**
     * hset of <key-val>:
     * key: name, avatar, stream_cart:[{product_id,variant_id,price,qty}]
     */
    USER_DATA: userId => {return `u16vls:${userId}`}, 
    //STREAM_HOST_UID: string, user ID of host of this stream (seller) 
    STREAM_HOST_UID: streamId => {return `s16vls:${streamId}:hostuid`},
    //STREAM_TITLE: string, title of stream
    STREAM_TITLE: streamId => {return `s16vls:${streamId}:title`},
    /**HSET of <key-json>:
     * key: string, index (sortable) of product in stream: also for product info security
     * json: stringified json object with struct:
     * {product_id,variants[qty,stream_price]} NOTE: idx of variant in array equivalent to idx in database
    */
    STREAM_PRODUCTS: streamId => {return `s16vls:${streamId}:products`}, 
    //STREAM_RTMP: string, url of video streaming on rtmp server
    STREAM_RTMP: streamId => {return `s16vls:${streamId}:rtmp`},
    //STREAM_MESSAGES:
    /** 
     * SET: stringified json obj: {uid,msg,time}
    */
    STREAM_MESSAGES: streamId => {return `s16vls:${streamId}:messages`},
    //STREAM_PARTICIPANTS: SET 
    STREAM_PARTICIPANTS: streamId => {return `s16vls:${streamId}:participants`}
}
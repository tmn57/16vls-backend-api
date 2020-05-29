# 16vls-backend
API server:
http://18.139.1.106:3000

DB Diagram:
https://drive.google.com/file/d/1VWH28GfMEtHXO61nvCVAfFkSyzd4mPa8/view?usp=sharing

DB Mongo link: 
mongodb+srv://16vls:16vls@cluster0-c2upe.mongodb.net/16vls?retryWrites=true&w=majority

**

Link chuyển đổi cryptoJs: 
http://18.139.1.106:3000/cryptoJS

Nhận token dưới dạng: token  = req.headers['access-token']

secret-code:
 + password: 16vls-s3cr3t-password (CryptoJS.AES.decrypt/decrypt)
 + phone-code: 16vls-s3cr3t-phone-code (CryptoJS.AES.decrypt/decrypt)
 + jwt-login: 16vls-s3cr3t-jwt-login


# API Description:

## Common API
 + login: `./login`, TOKEN expiresIn: 1 day
 + request new token: `./refreshToken` (req.body: { accessToken, refreshToken })
 + register: `./register`
 + verify account: `./verify`
 + get code from phone number: `./getCode`
 + checkCode: `./checkCode`

## For user
 + Change password: `./users/changePass`
 + update profile: `./users/update`
 + get user's profile: `./users/info`

## For store
 + create store: `./stores/create`
 + add categories to store: `./stores/categories/add`
 + remove categories to store: `./stores/categories/delete`
 + get info of store by id: `./stores?id=...`
 + get info of all stores by user's id (from access-token): `./stores/all`
 + get stores by some conditions (method: POST): `./stores/getByConditions`
 + update stores by _id : `./stores/update`


## For product
 + create product: `./products/create`
 + get info of product by id: `./products?id=...`
 + get info of all products by store's id: `./products/allByStore?id=...`
 + get products by some conditions (method: POST): `./products/getByConditions`
 + update product by _id : `./products/update`

## For image
 + upload multi images: `./images/upload`
 + get all infor image by user (from access-token): `./images/allByUser`
 
 ## For promotion
 + create promotion: `./promotions/create`
 + update promotion: `./promotions/update`
 + get promotion by code: `./promotions?code=...`

  ## For sysCategories
 + get sysCategories: `./sysCategories` (GET)
 + (for ADMIN) - replace array SysCategories: `./sysCategories/replace`
      * `(POST: body: {sysCategories: [{"_id": uuid(), "name": "example"}]})`
 + (for ADMIN) - restore SysCategories: `./promotions/restore` (GET)

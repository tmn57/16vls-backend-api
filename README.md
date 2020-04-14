# 16vls-backend
API server:
http://18.139.1.106:3000

DB Diagram:
https://drive.google.com/file/d/1VWH28GfMEtHXO61nvCVAfFkSyzd4mPa8/view?usp=sharing

DB Mongo link: 
mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-c2upe.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority

**

Link chuyển đổi cryptoJs: 
http://18.139.1.106:3000/cryptoJS

Nhận token dưới dạng: token  = req.headers['access-token']

secret-code:
 + password: 16vls-s3cr3t-password (CryptoJS.AES.decrypt/decrypt)
 + phone-code: 16vls-s3cr3t-phone-code (CryptoJS.AES.decrypt/decrypt)
 + jwt-login: 16vls-s3cr3t-jwt-login

link API:
 + login: ./users/login
 + register: ./users/register
 + verify: ./users/verify
 + getCodeVerify: ./users/getCode

 + create store: ./stores/create
 + add categories to store: ./stores/categories/add
 + remove categories to store: ./stores/categories/delete
 + create product: ./products/create


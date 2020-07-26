# Cài đặt và cấu hình NGINX
## 1. Cài đặt
#### Biên dịch mã nguồn NGINX với cấu hình:
```
./configure --with-http_ssl_module
            --with-http_mp4_module
            --with-http_flv_module
            --with-debug
            --add-module=/path/to/nginx-rtmp-module
```
Trong đó `path/to/nginx-rtmp-module` là đường dẫn tới thư mục đã giải nén của [nginx-rtmp-module](https://github.com/arut/nginx-rtmp-module).
## 2. [Cấu hình](https://github.com/tmn57/16vls-backend-api/blob/master/NGINX/nginx.conf)

## 3. Scripts
- [publish.sh](https://github.com/tmn57/16vls-backend-api/blob/master/NGINX/publish.sh)
- [record_done.sh](https://github.com/tmn57/16vls-backend-api/blob/master/NGINX/record_done.sh)
#!/bin/bash

# check authorization
response_code=$(curl -X POST --write-out %{http_code} "http://13.250.161.81:3000/streams/rtmp-pub-auth/?${1}")

# write to log
$d=$(date)
echo "${d}: response ${response_code}" >> /usr/local/nginx/conf/script_log.txt
#!/bin/bash

vod_dir="/datadrive/nginx/vod"
stream_key=$1
echo > $vod_dir/catlist.txt

# prepair concatenate list
for file in `ls -tr ${vod_dir}/ | grep ${stream_key}`; do
    name=${file##*/}
	sk=${name%%-*}
	
	if [ "$sk" = "$stream_key" ]; then
		echo "file ${vod_dir}/${file}" >> $vod_dir/catlist.txt
	fi
done

timestamp=$(date +"%s")
new_name="${stream_key}_${timestamp}"

# concatenating
ffmpeg -f concat -safe 0 -i $vod_dir/catlist.txt -c copy $vod_dir/$new_name.flv > /usr/local/nginx/conf/ffmpeg_log.txt

# convert to mp4
ffmpeg -i $vod_dir/$new_name.flv -codec copy $vod_dir/$new_name.mp4
echo "file ${vod_dir}/${new_name}.flv" >> $vod_dir/catlist.txt

# call rest API
response_code=$(curl -X POST --write-out %{http_code} "http://13.250.161.81:3000/streams/rtmp-record-join-done?fn=${new_name}.mp4")
$d=$(date)

# remove old files
while read -r line; do
    path=${line#* }
    rm "${path}"
done < $vod_dir/catlist.txt

# write to log
echo "${d}: response code ${response}" >>  /usr/local/nginx/conf/script_log.txt
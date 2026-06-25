#!/bin/bash

./mjpg_streamer -i "./input_uvc.so -d /dev/video0 -r 1280x720 -f 30" -o "./output_http.so -w ./www -l 192.168.0.101 -p 8080"

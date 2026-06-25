#!/usr/bin/env bash

if [ $# -ne 1 ]; then
    echo "usage: $0 <delta> "
    exit 1
fi

delta=$1
dev="/dev/obsbot"
min=-32400
max=+32400

cur=$(v4l2-ctl -d ${dev} --get-ctrl=tilt_absolute | cut -d' ' -f2)
new=$((cur + ${delta}))

# clamp
if [ $new -lt $min ]; then new=$min; fi
if [ $new -gt $max ]; then new=$max; fi

v4l2-ctl -d ${dev} --set-ctrl=tilt_absolute=$new

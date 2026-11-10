#!/bin/bash
# v14: сборка ролика из готовой озвучки. ./make14.sh v14m-ru v14a-ru → out/<ep>/<ep>_16x9_clean_master.mp4 и _9x16_clean_master.mp4
# Нужно заранее: python3 el13.py voice <ep> --voice <id> --model eleven_v4 --stab .4 --style .25 ; python3 el13.py sfx ; music/v14-raw.mp3
set -e
cd "$(dirname "$0")"; export NODE_PATH=${NODE_PATH:-/opt/node-tools/node_modules}
for EP in "$@"; do
  python3 el13.py demon $EP
  node capture.mjs $EP cues 20
  MUSIC=music/v14-raw.mp3 python3 audio.py $EP
  node capture.mjs $EP video 30 4
  FMT=9x16 node capture.mjs $EP video 30 4
  for F in 16x9 9x16; do
    V=out/$EP/video$([ $F = 9x16 ] && echo -9x16).mp4
    ffmpeg -y -v error -i $V -i out/$EP/mix.wav -map 0:v -map 1:a -af volume=-0.6dB -c:v libx264 -preset medium -crf 21 -maxrate 8M -bufsize 16M -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out/$EP/${EP%-ru}_${F}_clean_master.mp4
  done
  echo "$EP ГОТОВО"
done

#!/bin/bash
cd /home/kavia/workspace/code-generation/pricecompare-pro-327651-327667/web_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi


#!/usr/bin/env bash

echo 'Updating Gatsby-config to invalidate cache..'
echo "// ${BUILD_ID}" >> ./gatsby-config.js
#!/bin/bash

# Generate deploy-id.js with the actual DEPLOY_ID environment variable
echo "export const DEPLOY_ID = \"$DEPLOY_ID\";" > ./src/deploy-id.js

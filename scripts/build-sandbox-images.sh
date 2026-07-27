#!/usr/bin/env bash
set -e

docker build -t codroom-node   -f Dockerfile.sandbox-node   .
docker build -t codroom-ts     -f Dockerfile.sandbox-ts     .
docker build -t codroom-python -f Dockerfile.sandbox-python .
docker build -t codroom-java   -f Dockerfile.sandbox-java   .
docker build -t codroom-cpp    -f Dockerfile.sandbox-cpp    .
docker build -t codroom-go     -f Dockerfile.sandbox-go     .
docker build -t codroom-rust   -f Dockerfile.sandbox-rust   .

echo "All sandbox images built."

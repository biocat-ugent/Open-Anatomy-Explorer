#!/bin/bash

# ===== TODO =====

OPANEX_REGISTRY="gitlab.ilabt.imec.be:4567/mvkenhov/opanex-registry"
OPANEX_IMAGE_NAME="opanex-frontend-ua"
OPANEX_IMAGE_TAG="1.1.1"
OPANEX_ADDITIONAL_IMAGE_TAG="latest"

# ===== END =====


set -e

yarn --version
yarn install --immutable --immutable-cache --check-cache
yarn build

cd docker

docker build -t "${OPANEX_REGISTRY}/${OPANEX_IMAGE_NAME}:${OPANEX_IMAGE_TAG}" .
docker build -t "${OPANEX_REGISTRY}/${OPANEX_IMAGE_NAME}:${OPANEX_ADDITIONAL_IMAGE_TAG}" .

docker push "${OPANEX_REGISTRY}/${OPANEX_IMAGE_NAME}:${OPANEX_IMAGE_TAG}"
docker push "${OPANEX_REGISTRY}/${OPANEX_IMAGE_NAME}:${OPANEX_ADDITIONAL_IMAGE_TAG}"



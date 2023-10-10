#!/bin/bash

# ===== TODO =====

export QUARKUS_CONTAINER_IMAGE_REGISTRY="gitlab.ilabt.imec.be:4567"
export QUARKUS_CONTAINER_IMAGE_GROUP="mvkenhov/opanex-registry"
export QUARKUS_CONTAINER_IMAGE_NAME="opanex-backend-ua"
#export QUARKUS_CONTAINER_IMAGE_USERNAME="username"
#export QUARKUS_CONTAINER_IMAGE_PASSWORD="password"

# ===== END =====


export QUARKUS_JIB_BASE_JVM_IMAGE="openjdk:17"
export QUARKUS_CONTAINER_IMAGE_TAG="1.0.0"
export QUARKUS_CONTAINER_IMAGE_ADDITIONAL_TAGS="latest"
export QUARKUS_CONTAINER_IMAGE_PUSH="true"

chmod +x gradlew

bash gradlew build -x test


#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../backend"

exec bash ./mvnw \
  -Dmaven.repo.local=/tmp/quizzboard-m2 \
  spring-boot:run \
  -Dspring-boot.run.profiles=local

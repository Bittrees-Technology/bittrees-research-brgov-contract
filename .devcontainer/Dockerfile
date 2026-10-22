# Exact supported Node toolchain; do not reinstall a second, older Node with nvm.
FROM node:22.23.4-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && dpkg --compare-versions "$(dpkg-query -W -f='${Version}' ca-certificates)" ge '20250419~deb12u2' \
  && rm -rf /var/lib/apt/lists/*

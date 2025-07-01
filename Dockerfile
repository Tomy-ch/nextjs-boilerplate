# -----------------------------------
# For development
# -----------------------------------

FROM node:22.15.0-alpine AS dev

# Additional installation as needed for libraries such as sharp.
RUN apk add --no-cache \
  build-base \
  python3 \
  libc6-compat \
  vips-dev \
  libjpeg-turbo-dev \
  libpng-dev \
  zlib-dev \
  libwebp-dev \
  git

ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

# -----------------------------------
# For builder
# -----------------------------------

FROM node:22.15.0-alpine AS builder

RUN apk add --no-cache \
  build-base \
  python3 \
  libc6-compat \
  vips-dev \
  libjpeg-turbo-dev \
  libpng-dev \
  zlib-dev \
  libwebp-dev \
  git

WORKDIR /app

ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci

COPY . .
RUN npm run build

# -----------------------------------
# For production
# -----------------------------------

FROM node:22.15.0-alpine AS prd

ENV NODE_ENV=production
WORKDIR /app

# The prerequisite is that 'standalone' is set to next.config.ts.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["node", "server.js"]

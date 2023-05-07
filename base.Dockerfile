FROM node:14-alpine AS development
RUN apk --no-cache add --update --virtual .builds-deps build-base python3 py3-pip make g++

WORKDIR /usr/src/app
RUN chmod -R 777 /usr/src/app

ARG app

RUN echo "Building: $app"

COPY package*.json ./
COPY . ./
RUN rm -rf ./apps
COPY apps/${app} ./apps/${app}

RUN rm -rf ./node_modules
RUN npm install
RUN ls
RUN npm run build -- ${app} --inspect false --skip-nx-cache=true

FROM node:14-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ARG app

RUN echo "Building: $app"

WORKDIR /usr/src/app

COPY package*.json ./
COPY . ./

EXPOSE 3000

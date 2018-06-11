FROM node:8

RUN apt-get update
RUN apt-get install -y build-essential
RUN apt-get install -y libc6-dev
RUN apt-get install -y libc6-dev-i386
RUN apt-get install -y wget
RUN apt-get clean

WORKDIR /bridge
COPY . .
RUN npm install
CMD ["npm","run","watcher:deposit"]

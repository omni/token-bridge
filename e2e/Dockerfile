FROM node:8

RUN mkdir /stuff
WORKDIR /stuff

COPY package.json .
COPY package-lock.json .

RUN git clone https://github.com/rstormsf/poa-parity-bridge-contracts.git
RUN mkdir submodules && \
  mv poa-parity-bridge-contracts submodules/poa-bridge-contracts && \
  cd submodules/poa-bridge-contracts && \
  git checkout 57dfe2285f18f5ecd2f9f0ee7a111b1fbcaaf307

RUN npm install --unsafe-perm

RUN cd submodules/poa-bridge-contracts && \
  npm install && \
  ./node_modules/.bin/truffle compile && \
  cd deploy && \
  npm install

ADD . .


CMD ["npm", "start"]

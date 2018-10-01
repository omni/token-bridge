
# POA Bridge - NodeJS Oracle

[![Build Status](https://travis-ci.org/poanetwork/bridge-nodejs.svg?branch=develop)](https://travis-ci.org/poanetwork/bridge-nodejs)
[![Gitter](https://badges.gitter.im/poanetwork/poa-bridge.svg)](https://gitter.im/poanetwork/poa-bridge?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Bridge Overview

The POA Bridge allows users to transfer assets between two chains in the Ethereum ecosystem. It is composed of several elements which are located in different POA Network repositories:

**Bridge Elements**
1. An oracle written in NodeJS, contained in this repository.
2. [Solidity smart contracts](https://github.com/poanetwork/poa-bridge-contracts). Used to manage bridge validators, collect signatures, and confirm asset relay and disposal.
3. [Bridge UI Application](https://github.com/poanetwork/bridge-ui). A DApp interface to transfer tokens and coins between chains.
4. [Bridge Monitor](https://github.com/poanetwork/bridge-monitor). A tool for checking balances and unprocessed events in bridged networks. 

The bridge oracle is deployed on validator nodes in the network (nodes are specified in the smart contracts). The oracle connects to two chains via a Remote Procedure Call (RPC). It is responsible for:
- listening to events related to bridge contracts
- sending transactions to authorize token transfers

Following is an overview of the NodeJS bridge oracle and [instructions for getting started](#how-to-use) with the POA Bridge.

## Interoperability

Interoperability is the ability to share resources between networks. The POA Bridge is an interoperability protocol where users can transfer value (ERC20 compatible tokens and network coins) between chains in the Ethereum ecosystem.  This creates opportunities to use different chains for different purposes. For example, smart contracts can allocate resource intensive operations to a sidechain where transactions are fast and inexpensive.

## Operational Modes

The POA bridge currently provides two operational modes, with a 3rd mode in development. In this context, **Home** - or Native - refers to a sidechain or private chain network, and **Foreign** generally refers to the Ethereum mainnet. 

**Note:** _In ERC20-to-ERC20 mode Foreign can refer to another sidechain, so that two sidechains can bridge with one another._

- [x] `Native-to-ERC20` **Coins** on a Home network can be converted to ERC20-compatible **tokens** on a Foreign network. Coins are locked on the Home side and the corresponding amount of ERC20 tokens are minted on the Foreign side. When the operation is reversed, tokens are burnt on the Foreign side and unlocked in the Home network. 
- [x] `ERC20-to-ERC20` ERC20-compatible tokens on the Foreign network are locked and minted as ERC20-compatible tokens (ERC677 tokens) on the Home network. When transferred from Home to Foreign, they are burnt on the Home side and unlocked in the Foreign network. This can be considered a form of atomic swap when a user swaps the token "X" in network "A" to the token "Y" in network "B".
- [ ] `ERC20-to-Native`: Currently in development. Pre-existing tokens in the Foreign network are locked and coins are minted in the `Home` network.  


## Architecture

![bridge architecture](https://user-images.githubusercontent.com/4614574/42094368-f260f648-7b85-11e8-91d4-e602253a6560.png)

### Watcher
A watcher listens for a certain event and creates proper jobs in the queue. These jobs contain the transaction data (without the nonce) and the transaction hash for the related event. The watcher runs on a given frequency, keeping track of the last processed block.

There are three Watchers:
- **Signature Request Watcher**: Listens to `UserRequestForSignature` events on Home network.
- **Collected Signatures Watcher**: Listens to `CollectedSignatures` events on Home network.
- **Affirmation Request Watcher**: Listens to `UserRequestForAffirmation` events on Foreign network.

### Sender
A sender subscribes to the queue and keeps track of the nonce. It takes jobs from the queue, extracts transaction data, adds the proper nonce, and sends it to the network.

There are two Senders:
- **Home Sender**: Sends transaction to the `Home` network.
- **Foreign Sender**: Sends transaction to the `Foreign` network.

# How to Use

## Installation and Deployment

### Requirements

- [Truffle](https://github.com/trufflesuite/truffle) version `4.0`
- [RabbitMQ](https://www.rabbitmq.com/) version: `3.7`
- [Redis](https://redis.io/) version: `4.0`

For more information on the Redis/RabbitMQ requirements, see [#90](/../../issues/90)

### Deploy Bridge Contracts

1. Deploy the bridge contracts
    1. Clone repo: `git clone https://github.com/poanetwork/poa-bridge-contracts`
    2. `cd poa-bridge-contracts`
    3. Checkout branch `refactor_v1` : `git checkout refactor_v1`
    4. Compile contracts: `truffle compile`
    5. Go to deploy folder: `cd deploy`
    6. create a `.env` file: `cp .env.example .env` (look at `.env.example` to see the variables that need to be present)
    7. Execute `node deploy.js`

2. Start Redis and RabbitMQ in your local environment.
    1. `redis-server` starts Redis. `redis-cli ping` will return a `pong` if Redis is running.
    2. `rabbitmq-server` starts RabbitMQ. Use `rabbitmqctl status` to check if RabbitMQ is running. 

3. Create a `.env` file: `cp .env.example .env`
   1. fill in the required information using the output data from the bridge contract deployment. Check the `.env.example` file to see the required variables.

## Run the Processes

### Native to ERC mode
  - `npm run watcher:signature-request`
  - `npm run watcher:collected-signatures`
  - `npm run watcher:affirmation-request`
  - `npm run sender:home`
  - `npm run sender:foreign`

To send deposits to a home contract run `node scripts/sendUserTxToHome.js`

To send withdrawals to a foreign contract run `node scripts/sendUserTxToForeign.js`

Make sure your `HOME_MIN_AMOUNT_PER_TX` and `FOREIGN_MIN_AMOUNT_PER_TX` is the same as in your .env deployment contract.


### ERC to ERC Mode

In `.env` file set `BRIDGE_MODE=ERC_TO_ERC`

  - `npm run watcher:signature-request`
  - `npm run watcher:collected-signatures`
  - `npm run watcher:affirmation-request`
  - `npm run sender:home`
  - `npm run sender:foreign`

To deposit from Foreign to Home contract run `node scripts/sendUserTxToErcForeign.js 10` where `10` is how many tx you would like to send out.

To withdrawal to Home to Foreign contract run `node scripts/sendUserTxToErcHome.js 10` where `10` is how many tx you would like to send out.

### Run with Docker

  - Start RabbitMQ and Redis: `docker-compose up -d`
  - `docker-compose run bridge npm run watcher:signature-request`
  - `docker-compose run bridge npm run watcher:collected-signatures`
  - `docker-compose run bridge npm run watcher:affirmation-request`
  - `docker-compose run bridge npm run sender:home`
  - `docker-compose run bridge npm run sender:foreign`


To use the bridge UI, clone [the repo](https://github.com/poanetwork/bridge-ui/),
create a `.env` using the same values as before, and run `npm start`.

### Useful Commands for Development

#### RabbitMQ
Command | Description
--- | ---
`rabbitmqctl list_queues` | List all queues
`rabbitmqctl purge_queue home` | Remove all messages from `home` queue
`rabbitmqctl status` | check if rabbitmq server is currently running  
`rabbitmq-server`    | start rabbitMQ server  

#### Redis
Use `redis-cli`

Command | Description
--- | ---
`KEYS *` | Returns all keys
`SET signature-request:lastProcessedBlock 1234` | Set key to hold the string value.
`GET signature-request:lastProcessedBlock` | Get the value of key.
`DEL signature-request:lastProcessedBlock` | Removes the specified key.
`FLUSHALL` | Delete all the keys of all the existing databases
`redis-cli ping`     | check if redis is running  
`redis-server`       | starts redis server  


### Env Variables
Variable | Description | Values
--- | --- | ---
`ALLOW_HTTP` | Explicitly allows the usage of `http` connections instead of `https`. | `yes` / `no`

## Testing

```bash
npm test
```

## Contributing

See the [CONTRIBUTING](CONTRIBUTING.md) document for contribution, testing and pull request protocol.

## License

[![License: LGPL v3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0)

This project is licensed under the GNU Lesser General Public License v3.0. See the [LICENSE](LICENSE) file for details.

## References

* [POA Bridge FAQ](https://poanet.zendesk.com/hc/en-us/categories/360000349273-POA-Bridge)

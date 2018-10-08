
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
5. [Bridge Deployment Playbooks](https://github.com/poanetwork/deployment-bridge). Manages configuration instructions for remote deployments.

The bridge oracle is deployed on specified validator nodes (only nodes whose private keys correspond to addresses specified in the smart contracts) in the network. The oracle connects to two chains via a Remote Procedure Call (RPC). It is responsible for:
- listening to events related to bridge contracts
- sending transactions to authorize asset transfers

Following is an overview of the NodeJS bridge oracle and [instructions for getting started](#how-to-use) with the POA Bridge.

## Interoperability

Interoperability is the ability to share resources between networks. The POA Bridge is an interoperability protocol where users can transfer value (ERC20 compatible tokens and network coins) between chains in the Ethereum ecosystem.  This creates opportunities to use different chains for different purposes. For example, smart contracts can allocate resource intensive operations to a sidechain where transactions are fast and inexpensive.

## Network Processes 

### Network Definitions

 Bridging occurs between two networks.

 * **Home** - or Native - is a network with fast and inexpensive operations. All bridge operations to collect validator confirmations are performed on this side of the bridge.

* **Foreign** can be any chain, but generally refers to the Ethereum mainnet. 

### Operational Modes

The POA bridge currently provides two operational modes, with a 3rd mode in development.

- [x] `Native-to-ERC20` **Coins** on a Home network can be converted to ERC20-compatible **tokens** on a Foreign network. Coins are locked on the Home side and the corresponding amount of ERC20 tokens are minted on the Foreign side. When the operation is reversed, tokens are burnt on the Foreign side and unlocked in the Home network. 
- [x] `ERC20-to-ERC20` ERC20-compatible tokens on the Foreign network are locked and minted as ERC20-compatible tokens (ERC677 tokens) on the Home network. When transferred from Home to Foreign, they are burnt on the Home side and unlocked in the Foreign network. This can be considered a form of atomic swap when a user swaps the token "X" in network "A" to the token "Y" in network "B".
- [ ] `ERC20-to-Native`: Currently in development. Pre-existing tokens in the Foreign network are locked and coins are minted in the `Home` network.  


## Architecture

### Native-to-ERC

![Native-to-ERC](Native-to-ERC.png)

### ERC-to-ERC

![ERC-to-ERC](ERC-to-ERC.png)


### Watcher
A watcher listens for a certain event and creates proper jobs in the queue. These jobs contain the transaction data (without the nonce) and the transaction hash for the related event. The watcher runs on a given frequency, keeping track of the last processed block.

If the watcher observes that the transaction date cannot be prepared, which generally means that the corresponding method of the bridge contract cannot be invoked, it inspects the contract state to identify the potential reason for failure and records this in the logs. 


There are three Watchers:
- **Signature Request Watcher**: Listens to `UserRequestForSignature` events on the Home network.
- **Collected Signatures Watcher**: Listens to `CollectedSignatures` events on the Home network.
- **Affirmation Request Watcher**: Depends on the bridge mode. 
   - Native-to-ERC: Listens to `UserRequestForAffirmation` raised by the bridge contract.
   - `ERC-to-ERC` and `ERC-to-Native`: Listens to `Transfer` events raised by the token contract.


### Sender
A sender subscribes to the queue and keeps track of the nonce. It takes jobs from the queue, extracts transaction data, adds the proper nonce, and sends it to the network.

There are two Senders:
- **Home Sender**: Sends transaction to the `Home` network.
- **Foreign Sender**: Sends transaction to the `Foreign` network.

# How to Use

## Installation and Deployment

The bridge contracts can be installed and deployed using [Docker](https://www.docker.com/products/docker-engine) and [Docker Compose](https://docs.docker.com/compose/install/) or manually with [RabbitMQ](https://www.rabbitmq.com/) version `3.7` and [Redis](https://redis.io/) version `4.0`.

For more information on the Redis/RabbitMQ requirements, see [#90](/../../issues/90)

#### Deploy the Bridge Contracts

1. [Deploy the bridge contracts](https://github.com/poanetwork/poa-bridge-contracts/blob/master/deploy/README.md)

2. Start Redis and RabbitMQ in your local environment.
    1. **Docker**: Start RabbitMQ and Redis: `docker-compose up -d` 
    2. **Manual Start**:  
    `redis-server` starts Redis. `redis-cli ping` will return a `pong` if Redis is running.  
    `rabbitmq-server` starts RabbitMQ. Use `rabbitmqctl status` to check if RabbitMQ is running. 

3. Create a `.env` file: `cp .env.example .env`
   1. fill in the required information using the output data from the bridge contract deployment in step 1. Check the `.env.example` file to see the required variables.


## Run the Processes

- **Native-to-ERC**: In the `.env` file set `BRIDGE_MODE=NATIVE_TO_ERC`
- **ERC-to-ERC mode**: In the `.env` file set `BRIDGE_MODE=ERC_TO_ERC`


### RabbitMQ / Redis

  - `npm run watcher:signature-request`
  - `npm run watcher:collected-signatures`
  - `npm run watcher:affirmation-request`
  - `npm run sender:home`
  - `npm run sender:foreign`


### Docker

  - Start RabbitMQ and Redis: `docker-compose up -d`
  - `docker-compose run bridge npm run watcher:signature-request`
  - `docker-compose run bridge npm run watcher:collected-signatures`
  - `docker-compose run bridge npm run watcher:affirmation-request`
  - `docker-compose run bridge npm run sender:home`
  - `docker-compose run bridge npm run sender:foreign`

### Bridge UI

See the [Bridge UI installation instructions](https://github.com/poanetwork/bridge-ui/) to configure and use the optional Bridge UI.


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
`GET signature-request:lastProcessedBlock` | Get the key value.
`DEL signature-request:lastProcessedBlock` | Removes the specified key.
`FLUSHALL` | Delete all the keys in all existing databases.
`redis-cli ping`     | check if redis is running.  
`redis-server`       | start redis server.  

##### Rollback the Last Processed Block in Redis

If the bridge does not handle an event properly (i.e. a transaction stalls due to a low gas price), the Redis DB can be rolled back. You must identify which watcher needs to re-run. For example, if the validator signatures were collected but the transaction with signatures was not sent to the Foreign network, the `collected-signatures` watcher must look at the block where the corresponding `CollectedSignatures` event was raised.

Execute this command in the bridge root directory:

```shell
bash ./reset-lastBlock.sh <watcher> <block num>
```

where the _watcher_ could be one of:

- `signature-request`
- `collected-signatures`
- `affirmation-request`

### Parameters

| Variable | Description | Values |
|-------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| `BRIDGE_MODE` | The bridge mode. The bridge starts listening to a different set of events based on this parameter. | `NATIVE_TO_ERC` / `ERC_TO_ERC` |
| `HOME_RPC_URL` | The HTTPS URL(s) used to communicate to the RPC nodes in the Home network. Several URLs can be specified, delimited by spaces. If the connection to one of these nodes is lost the next URL is used for connection. | url(s) |
| `HOME_BRIDGE_ADDRESS` | The address of the bridge contract address in the Home network. It is used to listen to events from and send validators' transactions to the Home network. | hexidecimal beginning with "0x" |
| `HOME_POLLING_INTERVAL` | The interval in milliseconds used to request the RPC node in the Home network for new blocks. The interval should match the average production time for a new block. | integer |
| `FOREIGN_RPC_URL` | The HTTPS URL(s) used to communicate to the RPC nodes in the Foreign network. Several URLs can be specified, delimited by spaces. If the connection to one of these nodes is lost the next URL is used for connection. | url(s) |
| `FOREIGN_BRIDGE_ADDRESS` | The  address of the bridge contract address in the Foreign network. It is used to listen to events from and send validators' transactions to the Foreign network. | hexidecimal beginning with "0x" |
| `ERC20_TOKEN_ADDRESS` | Used with the `ERC_TO_ERC` bridge mode, this parameter specifies the ERC20-compatible token contract address. The token contract address is used to identify transactions that transfer tokens to the Foreign Bridge account address. Omit this parameter with other bridge modes. | hexidecimal beginning with "0x" |
| `FOREIGN_POLLING_INTERVAL` | The interval in milliseconds used to request the RPC node in the Foreign network for new blocks. The interval should match the average production time for a new block. | integer |
| `HOME_GAS_PRICE_ORACLE_URL` | The URL used to get a JSON response from the gas price prediction oracle for the Home network. The gas price provided by the oracle is used to send the validator's transactions to the RPC node. Since it is assumed that the Home network has a predefined gas price (e.g. the gas price in the Core of POA.Network is `1 GWei`), the gas price oracle parameter can be omitted for such networks. | url |
| `HOME_GAS_PRICE_SPEED_TYPE` | Assuming the gas price oracle responds with the following JSON structure: `{"fast": 20.0, "block_time": 12.834, "health": true, "standard": 6.0, "block_number": 6470469, "instant": 71.0, "slow": 1.889}`, this parameter specifies the desirable transaction speed. The speed type can be omitted when `HOME_GAS_PRICE_ORACLE_URL` is not used. | `instant` / `fast` / `standard` / `slow` |
| `HOME_GAS_PRICE_FALLBACK` | The gas price (in GWei) that is used if both the oracle and the fall back gas price specified in the Home Bridge contract are not available. | integer |
| `HOME_GAS_PRICE_UPDATE_INTERVAL` | An interval in milliseconds used to get the updated gas price value either from the oracle or from the Home Bridge contract. | integer |
| `FOREIGN_GAS_PRICE_ORACLE_URL` | The URL used to get a JSON response from the gas price prediction oracle for the Foreign network. The provided gas price is used to send the validator's transactions to the RPC node. If the Foreign network is Ethereum Foundation mainnet, the oracle URL can be: https://gasprice.poa.network. Otherwise this parameter can be omitted. | url |
| `FOREIGN_GAS_PRICE_SPEED_TYPE` | Assuming the gas price oracle responds with the following JSON structure: `{"fast": 20.0, "block_time": 12.834, "health": true, "standard": 6.0, "block_number": 6470469, "instant": 71.0, "slow": 1.889}`, this parameter specifies the desirable transaction speed. The speed type can be omitted when `FOREIGN_GAS_PRICE_ORACLE_URL`is not used. | `instant` / `fast` / `standard` / `slow` |
| `FOREIGN_GAS_PRICE_FALLBACK` | The gas price (in GWei) used if both the oracle and fall back gas price specified in the Foreign Bridge contract are not available. | integer |
| `FOREIGN_GAS_PRICE_UPDATE_INTERVAL` | The interval in milliseconds used to get the updated gas price value either from the oracle or from the Foreign Bridge contract. | integer |
| `VALIDATOR_ADDRESS_PRIVATE_KEY` | The private key of the bridge validator used to sign confirmations before sending transactions to the bridge contracts. The validator account is calculated automatically from the private key. Every bridge instance (set of watchers and senders) must have its own unique private key. The specified private key is used to sign transactions on both sides of the bridge. | hexidecimal beginning with "0x" |
| `HOME_START_BLOCK` | The block number in the Home network used to start watching for events when the bridge instance is run for the first time. Usually this is the same block where the Home Bridge contract is deployed. If a new validator instance is being deployed for an existing set of validators, the block number could be the latest block in the chain. | integer |
| `FOREIGN_START_BLOCK` | The block number in the Foreign network used to start watching for events when the bridge instance runs for the first time. Usually this is the same block where the Foreign Bridge contract was deployed to. If a new validator instance is being deployed for an existing set of validators, the block number could be the latest block in the chain. | integer |
| `QUEUE_URL` | RabbitMQ url used by watchers and senders to communicate to the message queue. Typically set to: `amqp://127.0.0.1`. | local url |
| `REDIS_URL` | Redis DB url used by watchers and senders to communicate to the database. Typically set to: `redis://127.0.0.1:6379`. | local url |
| `REDIS_LOCK_TTL` | Threshold in milliseconds for locking a resource in the Redis DB. Until the threshold is exceeded, the resource is unlocked. Usually it is `1000`. | integer |
| `ALLOW_HTTP` | **Only use in test environments - must be omitted in production environments.**. If this parameter is specified and set to `yes`, RPC urls can be specified in form of HTTP links. A warning that the connection is insecure will be written to the logs. | `yes` / `no` |


## Testing

```bash
npm test
```

### E2E tests

See the [E2E README](/e2e) for instructions. 


### Native-to-ERC Mode Testing

When running the processes, the following commands can be used to test functionality.

- To send deposits to a home contract run `node scripts/sendUserTxToHome.js`

- To send withdrawals to a foreign contract run `node scripts/sendUserTxToForeign.js`

Confirm the `HOME_MIN_AMOUNT_PER_TX` and `FOREIGN_MIN_AMOUNT_PER_TX` is the same as in the .env deployment contract.

### ERC-to-ERC-Mode Testing

- To deposit from a Foreign to a Home contract run `node scripts/sendUserTxToErcForeign.js 10` where `10` is how many tx you would like to send out.

- To make withdrawal to Home from a Foreign contract run `node scripts/sendUserTxToErcHome.js 10` where `10` is how many tx you would like to withdraw.


## Contributing

See the [CONTRIBUTING](CONTRIBUTING.md) document for contribution, testing and pull request protocol.

## License

[![License: LGPL v3.0](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0)

This project is licensed under the GNU Lesser General Public License v3.0. See the [LICENSE](LICENSE) file for details.

## References

* [POA Bridge FAQ](https://poanet.zendesk.com/hc/en-us/categories/360000349273-POA-Bridge)

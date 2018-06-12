# Architecture

![bridge architecture](https://user-images.githubusercontent.com/417134/40630604-4a41c986-62aa-11e8-999e-08dca615532d.png)

### Watcher
A watcher listens for a certain event and creates proper jobs in the queue. These jobs contain the transaction data (without the nonce) and the transaction hash for the related event. The watcher runs on a given frequency, keeping track of the last processed block.

There are three Watchers:
- Deposit Watcher: Listens to `Deposit` events on Home network. 
- Collected Signatures Watcher: Listens to `CollectedSignatures` events on Home network. 
- Withdraw Watcher: Listens to `Withdraw` events on Foreign network. 

### Sender
A sender subscribes to the queue and keeps track of the nonce. It takes jobs from the queue, extract transaction data, adds proper nonce and sends it to the network.

There are two Senders:
- Home Sender: Sends transaction to Home network. 
- Foreign Sender: Sends transaction to Foreign network. 

# How to use

1. Deploy bridge contracts
    1. Clone repo: `git clone https://github.com/poanetwork/poa-bridge-contracts`
    2. `cd poa-bridge-contracts`
    3. Checkout branch `v2` : `git checkout v2`
    4. Compile contracts: `truffle compile`
    5. Go to deploy folder: `cd deploy`
    6. create a `.env` file: `cp .env.example .env` (look at `.env.example` to see the variables that need to be present)
    7. Execute `node deploy.js`

2. Create a `.env` file: `cp .env.example .env` and fill in the information using the output data from previous deploy step. Check the `.env.example` file to see the required variables.

### Run on local environment

3. Install [RabbitMQ](https://www.rabbitmq.com/) and [Redis](https://redis.io/)

4. To run the processes:
  - `npm run watcher:deposit`
  - `npm run watcher:collected-signatures`
  - `npm run watcher:withdraw`
  - `npm run sender:home`
  - `npm run sender:foreign`

### Run with Docker

  - Start RabbitMQ and Redis: `docker-compose up -d`
  - `docker-compose run bridge npm run watcher:deposit`
  - `docker-compose run bridge npm run watcher:collected-signatures`
  - `docker-compose run bridge npm run watcher:withdraw`
  - `docker-compose run bridge npm run sender:home`
  - `docker-compose run bridge npm run sender:foreign`


In order to quickly send deposits run
`node tests/sendUserTxToHome.js`
this will send small deposits to home contract
Make sure your HOME\_MIN\_AMOUNT\_PER\_TX is same as in your .env deployment contract

In order to quickly send withdrawals run
`node tests/sendUserTxToForeignWithdraw.js`

To use the bridge UI, clone [the repo](https://github.com/poanetwork/bridge-ui/),
create a `.env` using the same values as before, and run `npm start`.

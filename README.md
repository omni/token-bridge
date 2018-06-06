# Architecture

![bridge architecture](https://user-images.githubusercontent.com/417134/40630604-4a41c986-62aa-11e8-999e-08dca615532d.png)

### Watcher
A watcher listen for a certain event and creates proper jobs in the queue. These jobs contains the transaction data (without the nonce) and the transaction hash for the related event. It runs every specific interval and keeps track of the last block processed.

There are three Watchers:
- Deposit Watcher: Listen to `Deposit` events on Home network. 
- Collected Signatures Watcher: Listen to `CollectedSignatures` events on Home network. 
- Withdraw Watcher: Listen to `Withdraw` events on Foreign network. 

### Sender
A sender subscribes to the queue and keeps track of the nonce. It takes jobs from the queue, extract the transaction data, add the proper nonce and send it to the network. 

There are two Senders:
- Home Sender: Sends transaction to Home network. 
- Foreign Sender: Sends transaction to Foreign network. 

# How to use

1. Deploy bridge contracts
    1. Clone repo https://github.com/poanetwork/poa-bridge-contracts
    2. Checkout branch `v2`
    3. Compile contracts (`truffle compile`)
    4. Go to `deploy` folder and create a `.env` file (look at `.env.example` to see the variables that need to be present)
    5. Execute `node deploy.js`

2. Install [RabbitMQ](https://www.rabbitmq.com/) and [Redis](https://redis.io/)

3. Create a `.env` file and fill in the information using the output of the deploy in the previous step. Check the `.env.example` file to see the required variables.

4. To run the processes:
  - `npm run watcher:deposit`
  - `npm run watcher:collected-signatures`
  - `npm run watcher:withdraw`
  - `npm run sender:home`
  - `npm run sender:foreign`

In order to quickly send deposits run
`node tests/sendUserTxToHome.js`
this will send small deposits to home contract
Make sure your HOME\_MIN\_AMOUNT\_PER\_TX is same as in your .env deployment contract

In order to quickly send withdrawals run
`node tests/sendUserTxToForeignWithdraw.js`

To use the bridge UI, clone [the repo](https://github.com/poanetwork/bridge-ui/),
create a `.env` using the same values as before, and run `npm start`.

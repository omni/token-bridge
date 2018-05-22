# How to use

1. Deploy bridge contracts
    1. Clone repo https://github.com/poanetwork/poa-bridge-contracts
    2. Checkout branch `v2`
    3. Compile contracts (`truffle compile`)
    4. Go to `deploy` folder and create a `.env` file (look at `.env.example` to see the variables that need to be present)
    5. Execute `node deploy.js`

2. Create a `.env` file and fill in the information using the output of the deploy in the previous step. Check the `.env.example` file to see the required variables.

3. Run `node src/start.js`

In order to quickly send deposits run
`node tests/sendUserTxToHome.js`
this will send small deposits to home contract
Make sure your HOME\_MIN\_AMOUNT\_PER\_TX is same as in your .env deployment contract

In order to quickly send withdrawals run
`node tests/sendUserTxToForeignWithdraw.js`

To use the bridge UI, clone [the repo](https://github.com/poanetwork/bridge-ui/),
create a `.env` using the same values as before, and run `npm start`.

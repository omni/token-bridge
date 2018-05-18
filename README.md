# How to use
1. Deploy contracts:
https://github.com/poanetwork/poa-bridge-contracts/tree/v2
go to `deploy` folder and create `.env` file

2. Check `.env.example` file and fill in the information

3. Run `node src/start.js`

IN order to quickly send deposits run
`node tests/sendUserTxToHome.js`
this will send small deposits to home contract
Make sure your HOME_MIN_AMOUNT_PER_TX is same as in your .env deployment contract
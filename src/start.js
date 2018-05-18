const processDeposits = require('./processDeposits')

processDeposits()
setInterval(processDeposits, 5000);
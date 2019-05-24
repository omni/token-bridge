# Token Bridge Oracle

The token bridge oracle should be deployed on specified validator nodes (only nodes whose private keys correspond to addresses specified in the smart contracts) in the network. It connects to two chains via a Remote Procedure Call (RPC) and is responsible for:
- listening to events related to bridge contracts
- sending transactions to authorize asset transfers

By doing this, users are able to transfer assets between two chains in the Ethereum ecosystem.

Due to reorganization of the token bridge repos into one monorepo the sources of the token bridge oracle was moved to [the TokenBridge repo](https://github.com/poanetwork/tokenbridge).

What does it mean for you? If you would like
  * to raise an issue against the oracle, follow [this link](https://github.com/poanetwork/tokenbridge/issues/new).
  * to find if a new version of the UI is ready in the monorepo, visit [the releases tab](https://github.com/poanetwork/tokenbridge/releases).
  * to get access to the last changes made in this repo, check the release [`1.3.1`](https://github.com/poanetwork/token-bridge/releases/tag/1.3.1) or the [`master`](https://github.com/poanetwork/token-bridge/tree/master) branch.

If you still have no clear understanding what you need to do, please visit [the TokenBridge forum](https://forum.poa.network/c/tokenbridge) and raise your question there.
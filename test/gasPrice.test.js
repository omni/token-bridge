const sinon = require('sinon')
const { expect } = require('chai')
const { fetchGasPrice } = require('../src/services/gasPrice')

describe('gasPrice', () => {
  describe('fetchGasPrice', () => {
    beforeEach(() => {
      sinon.stub(console, 'error')
    })
    afterEach(() => {
      console.error.restore()
    })

    it('should fetch the gas price from the oracle by default', async () => {
      // given
      const oracleFnMock = () => Promise.resolve('1')
      const bridgeContractMock = {
        methods: {
          gasPrice: {
            call: sinon.stub().returns(Promise.resolve('2'))
          }
        }
      }

      // when
      const gasPrice = await fetchGasPrice({
        bridgeContract: bridgeContractMock,
        oracleFn: oracleFnMock
      })

      // then
      expect(gasPrice).to.equal('1')
    })
    it('should fetch the gas price from the contract if the oracle fails', async () => {
      // given
      const oracleFnMock = () => Promise.reject(new Error('oracle failed'))
      const bridgeContractMock = {
        methods: {
          gasPrice: sinon.stub().returns({
            call: sinon.stub().returns(Promise.resolve('2'))
          })
        }
      }

      // when
      const gasPrice = await fetchGasPrice({
        bridgeContract: bridgeContractMock,
        oracleFn: oracleFnMock
      })

      // then
      expect(gasPrice).to.equal('2')
    })
    it('should return null if both the oracle and the contract fail', async () => {
      // given
      const oracleFnMock = () => Promise.reject(new Error('oracle failed'))
      const bridgeContractMock = {
        methods: {
          gasPrice: sinon.stub().returns({
            call: sinon.stub().returns(Promise.reject(new Error('contract failed')))
          })
        }
      }

      // when
      const gasPrice = await fetchGasPrice({
        bridgeContract: bridgeContractMock,
        oracleFn: oracleFnMock
      })

      // then
      expect(gasPrice).to.equal(null)
    })
  })
})

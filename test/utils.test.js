const sinon = require('sinon')
const { expect } = require('chai')
const { checkHTTPS } = require('../src/utils/utils')

describe('utils', () => {
  describe('checkHTTPS', () => {
    beforeEach(() => {
      sinon.stub(console, 'warn')
    })
    afterEach(() => {
      console.warn.restore()
    })

    it('should do nothing if HTTP is allowed and the URL is https', () => {
      checkHTTPS('yes')('https://www.google.com')
      expect(console.warn.called).to.equal(false)
    })

    it('should emit a warning if HTTP is allowed and the URL is http', () => {
      checkHTTPS('yes')('http://www.google.com')
      expect(console.warn.called).to.equal(true)
    })

    it('should do nothing if HTTP is not allowed and the URL is https', () => {
      checkHTTPS('no')('https://www.google.com')
      expect(console.warn.called).to.equal(false)
    })

    it('should throw an error if HTTP is not allowed and the URL is http', () => {
      expect(() => checkHTTPS('no')('http://www.google.com')).to.throw()
    })
  })
})

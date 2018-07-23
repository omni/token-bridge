const { expect } = require('chai')
const { createMessage } = require('../src/utils/message')

describe('message utils', () => {
  describe('createMessage', () => {
    it('should create a message when receiving valid values', () => {
      // given
      const recipient = '0xe3D952Ad4B96A756D65790393128FA359a7CD888'
      const value = '42'
      const transactionHash = '0x4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'

      // when
      const message = createMessage({ recipient, value, transactionHash })

      // then
      expect(message).to.equal(
        [
          '0xe3D952Ad4B96A756D65790393128FA359a7CD888',
          '000000000000000000000000000000000000000000000000000000000000002a',
          '4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'
        ].join('')
      )
    })

    it('should work if the recipient is not prefixed with 0x', () => {
      // given
      const recipient = 'e3D952Ad4B96A756D65790393128FA359a7CD888'
      const value = '42'
      const transactionHash = '0x4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'

      // when
      const message = createMessage({ recipient, value, transactionHash })

      // then
      expect(message).to.equal(
        [
          '0xe3D952Ad4B96A756D65790393128FA359a7CD888',
          '000000000000000000000000000000000000000000000000000000000000002a',
          '4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'
        ].join('')
      )
    })

    it('should work if the value is in hexadecimal', () => {
      // given
      const recipient = '0xe3D952Ad4B96A756D65790393128FA359a7CD888'
      const value = '0x2a'
      const transactionHash = '0x4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'

      // when
      const message = createMessage({ recipient, value, transactionHash })

      // then
      expect(message).to.equal(
        [
          '0xe3D952Ad4B96A756D65790393128FA359a7CD888',
          '000000000000000000000000000000000000000000000000000000000000002a',
          '4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'
        ].join('')
      )
    })

    it('should work if the transaction hash is not prefixed with 0x', () => {
      // given
      const recipient = '0xe3D952Ad4B96A756D65790393128FA359a7CD888'
      const value = '42'
      const transactionHash = '4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'

      // when
      const message = createMessage({ recipient, value, transactionHash })

      // then
      expect(message).to.equal(
        [
          '0xe3D952Ad4B96A756D65790393128FA359a7CD888',
          '000000000000000000000000000000000000000000000000000000000000002a',
          '4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'
        ].join('')
      )
    })

    it('should fail if the recipient is too short', () => {
      // given
      const recipient = '0xe3D952Ad4B96A756D65790393128FA359a7CD88'
      const value = '42'
      const transactionHash = '0x4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'

      // when
      const messageThunk = () => createMessage({ recipient, value, transactionHash })

      // then
      expect(messageThunk).to.throw()
    })

    it('should fail if the recipient is too long', () => {
      // given
      const recipient = '0xe3D952Ad4B96A756D65790393128FA359a7CD8888'
      const value = '42'
      const transactionHash = '0x4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5a'

      // when
      const messageThunk = () => createMessage({ recipient, value, transactionHash })

      // then
      expect(messageThunk).to.throw()
    })

    it('should fail if the transaction hash is too short', () => {
      // given
      const recipient = '0xe3D952Ad4B96A756D65790393128FA359a7CD888'
      const value = '42'
      const transactionHash = '0x4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5'

      // when
      const messageThunk = () => createMessage({ recipient, value, transactionHash })

      // then
      expect(messageThunk).to.throw()
    })

    it('should fail if the transaction hash is too long', () => {
      // given
      const recipient = '0xe3D952Ad4B96A756D65790393128FA359a7CD888'
      const value = '42'
      const transactionHash = '0x4a298455c1ccb17de77718fc045a876e1b4e063afaad361dcdef142a8ee48d5aa'

      // when
      const messageThunk = () => createMessage({ recipient, value, transactionHash })

      // then
      expect(messageThunk).to.throw()
    })
  })
})

class AlreadyProcessedError extends Error {}
class AlreadySignedError extends Error {}
class InvalidValidatorError extends Error {}

module.exports = {
  AlreadyProcessedError,
  AlreadySignedError,
  InvalidValidatorError
}

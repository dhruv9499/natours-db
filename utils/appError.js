class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // if status code starts with 4 then it is fail otherwise error
    this.isOperational = true;

    // so that this class constructor does got capture in error stack
    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = AppError;

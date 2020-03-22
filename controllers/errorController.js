const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value ${value}! Please use a different value`;
  return new AppError(message, 400);
};

const handleValidationErrorsDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data . ${errors.join(', ')}`;
  return new AppError(message, 400);
};

const handleJWTError = err => {
  const message = 'Invalid token . Please login again';
  return new AppError(message, 401);
};

const handleJWTExpiredError = err => {
  const message = 'Your token has expired. Please login again';
  return new AppError(message, 401);
};

const sendErrorDev = (err, req, res) => {
  // A) For API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }
  //B) RENDERED WEBSITE
  console.error('ERROR', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  // 1) API ---
  if (req.originalUrl.startsWith('/api')) {
    // A) OPERATIONAL , Trusted errors : send message to the client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    //B) PROGRAMMING oR other unknown error : we don't want to leak eror details
    // 1) Log the error to the console

    console.error('ERROR', err);
    // 2) Send generic response message
    return res.status(500).json({
      status: 'error',
      message: 'something went very wrong'
    });
  }
  // 2) RENDERED WEBSITE ---
  // OPERATIONAL , Trusted errors : send message to the client
  // eslint-disable-next-line no-lonely-if
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      msg: err.message
    });
    // PROGRAMMING oR other unknown error : we don't want to leak eror details
  }
  // 1) Log the error to the console

  console.error('ERROR', err);
  // 2) Send generic response message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: 'Please Try Again later !'
  });
};

// global error control middleware function
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (err.name === 'CastError') error = handleCastErrorDB(error);

    if (error.code === 11000) error = handleDuplicateFieldsDB(error);

    if (err.name === 'ValidationError') error = handleValidationErrorsDB(error);

    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError')
      error = handleJWTExpiredError(error);
    sendErrorProd(error, req, res);
  }
};

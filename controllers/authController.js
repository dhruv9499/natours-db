const crypto = require('crypto');
const { promisify } = require('util'); // using destructuring
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToke = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),

    httpOnly: true // this prevents that cookie cannot be modified by browser in any way
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  // Remove the password from output
  user.password = undefined;

  // code 201 for created
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // this below code has a security issue that anyone can register themself as admin
  //const newUser = await User.create(req.body);
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToke(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if email and password exists
  if (!email || !password) {
    return next(new AppError('please provide email and password', 400));
  }

  // 2) check if user exists and password is correct
  const user = await User.findOne({ email: email }).select('+password');
  // we cannot run the check here as if the user doesnot exist the the values will be undefined
  //const correct = await user.correctPassword(password, user.password);

  // if the user is not found the !user will be true so it will enter if block and error will be sent back without checking for password
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) if everything is ok , send token to client
  createSendToke(user, 200, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'logged-out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({
    status: 'success'
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1) getting token and check if token is there or not
  if (
    // check for the Bearer token in the request headers
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    // check for cookie in the incoming request
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in please login to get access.', 401)
    );
  }

  // 2) verification of token
  const decodedPayload = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  // 3) check if user still exists
  const currentUser = await User.findById(decodedPayload.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to the token does no longer exist', 401)
    );
  }

  // 4) check if the user changed password after token was issued
  // TRUE means password is changed after token was issued
  if (currentUser.changedPasswordAfter(decodedPayload.iat)) {
    return next(
      new AppError('User recently chnaged password. please login again', 401)
    );
  }

  // GRANT ACCESS TO THE PROTECTED ROUTE
  res.locals.user = currentUser;
  req.user = currentUser;
  next();
});

// Check if the user is logged in or not ----Only fro the rendered pages and there will be not errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    // 1) verification of token
    try {
      const decodedPayload = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) check if user still exists
      const currentUser = await User.findById(decodedPayload.id);
      if (!currentUser) {
        return next();
      }

      // 3) check if the user changed password after token was issued
      // TRUE means password is changed after token was issued
      if (currentUser.changedPasswordAfter(decodedPayload.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser; // Each and every pug templated will have access to response.locals.user
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// we can pass arbitary number of parameters which will be converted array
exports.restrictTo = (...roles) => {
  // as we cannot pass paramtere in a middleware function so we will crreate a wrapper function which will accept paramaters and return a middleware function but the middleware function will have access to the roles parameters

  // MIDDLEWARE FUNCTION TO BE RETURNED
  return (req, res, next) => {
    // if the user roles matches one of the paramaters in role then give access
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get User based on the POSTed Email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  // validateBeforeSave is required otherwiswe it will require all fields which are required in Schema
  await user.save({ validateBeforeSave: false });

  // const message = `Forgot your password?? Submit a patch request with new password and passwordConfrim to ${resetURL}.\n If you didnt forget your password then please ignore this email !`;
  // await sendEmail({
  //   email: user.email,
  //   subject: 'Your password reset token (valid for only 10 min)',
  //   message
  // });
  try {
    // 3) Send it to User's email address
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendpasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email !'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending email. please try again later',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Send the user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token not expired ,and there is a user , set new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the users

  // 4) Log the user in , send JWT
  createSendToke(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the user from the collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if PoSTed password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }
  // 3) If the current password is correct then update the current password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // user.findByIdandUpdate will not work in this case as validators and pre save hooks will not run on update

  // 4) Log in the user , send new JWT token
  createSendToke(user, 200, res);
});

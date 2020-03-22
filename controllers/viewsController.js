const Tour = require('./../models/tourModel');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Booking = require('../models/bookingModel');

exports.getOverview = catchAsync(async (req, res, next) => {
  //1) Get Tour data from collections
  const tours = await Tour.find();

  // 2) Build Template

  // 3)Render the template using tour data from step 1)
  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });
  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }

  // 2) Build the template
  // 3) Render the data using the step 1) data
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  });
});

exports.getLoginForm = catchAsync(async (req, res, next) => {
  res.status(200).render('login', {
    title: 'Log Into Your Account'
  });
});

exports.getAccount = catchAsync(async (req, res, next) => {
  res.status(200).render('account', {
    title: 'Your Account'
  });
});
exports.getMyTours = catchAsync(async (req, res, next) => {
  // const UpdatedUser = await Booking.find({ user: req.user.id });

  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find Tours with the retuned IDs
  const tourIds = bookings.map(el => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).render('overview', {
    title: 'My tours',
    tours
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const UpdatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      runValidators: true,
      new: true
    }
  );
  res.status(200).render('account', {
    title: 'Your Account',
    user: UpdatedUser
  });
});

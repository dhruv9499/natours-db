const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// Trust Proxy
app.enable('trust ');

// Telling express that which template engine we will be using
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARE
// Implementation of cors
app.use(cors());
// Acess-control-allow-origin header to all coming requests
// iN case we want to only all request from a particular domain or subdomain
// The below code will only allow requests from "http://www.natours.com"
// app.use(
//   cors({
//     origin: 'http://www.natours.com'
//   })
// );

// Allow to perform OPTIONS requests during pre-flight phase
app.options('*', cors());
// app.options('/api.v1/tours/:id', cors());

//SERVING STATIC FILES --  Important for serving static assets like images or ccs or icons etc to the client
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// SET SECURE HTTP header
app.use(helmet());

// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// LIMIT request from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP ,Please try again in an hour'
});

app.use('/api', limiter);

app.post(
  '/webhook-checkout',
  express.raw({
    type: 'application/json'
  }),
  bookingController.webhookCheckout
);
// Body Parser -- Reading data from the body into req.body
app.use(express.json({ limit: '10Kb' }));
// The option in json middleware will reject the body greater than 10 KB
app.use(cookieParser());
//for parsing the data recieved from form submitting
app.use(express.urlencoded({ extended: true, limit: '10Kb' }));

// Data sanitization againts Nosql Query Injection
app.use(mongoSanitize());

// Data sanitization againts XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// For compressing responses html and json while sending back to the client
app.use(compression());
//TEST MIDDLEWARE ---  a defined middleware which will run on every request
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});
// app.use((req, res, next) => {
//   console.log('Hello from the Middleware ##');
//   next();
// });

// app.get('/', (req, res) => {
//   res.status(200).json({ message: 'Hello from server side', author: 'DB' });
// });

// app.get('/api/v1/tours', getAllTours);
// app.post('/api/v1/tours', createTour);
// app.get('/api/v1/tours/:id', getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// ROUTES
// Tour Resources
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter);

// we will define a middleware which will run if above two middleware are not able to catch the request
// app.all will work for all types of http request
app.all('*', function(req, res, next) {
  // res.status('404').json({
  //   status: 'fail',
  //   message: `can't find ${req.originalUrl} on this server`
  // });

  // const err = new Error(`can't find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

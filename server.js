const mongoose = require('mongoose');

const dotenv = require('dotenv');

// THIS NEED TO BE DEFINED AT TOP BEFORE RUNNING THE APP
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION ! .... SHUTTING DOWN');
  console.log(err);
  process.exit(1);
});

dotenv.config({ path: './config.env' }); //Because we need to set the envirnomant varialbles before app file loads as the app files uses it
const app = require('./app');

// console.log(process.env);
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB Connection sucessful'));
//
//
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}....`);
});

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION 🔥🔥 ! .... SHUTTING DOWN');
  console.log(err);
  // first we close the server so that all pending requests are completed then we exit the application
  server.close(() => {
    process.exit(1);
  });
});

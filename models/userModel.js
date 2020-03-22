const mongoose = require('mongoose');
const crypto = require('crypto');
const validator = require('validator');
const bcrypt = require('bcryptjs');

//
const userScheama = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell you Name !']
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: [true, 'Please provide you Email'],
    validate: [validator.isEmail, 'please provide a valid email address']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please Confirm your password'],
    validate: {
      // This only works on CREATE and SAVE !!!
      validator: function(value) {
        return value === this.password;
      },
      message: 'Password are not same'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userScheama.pre('save', async function(next) {
  // only run this function if password was actually modifies
  if (!this.isModified('password')) return next();

  // hash the password with the cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // delete the passwordConfirm field
  // we only need the passwordConfirm for matching but we dont want to store that in DB
  this.passwordConfirm = undefined;
  next();
});

// SETTING passwordChangedAt FIELD IF current document is not new && pasword is chnaged
userScheama.pre('save', async function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  // subtracting 1 second from the value as saving to DB is slower so we need to adjust the amount of time gap
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// A QUERY MIDDLEWARE for hiding the inactive or deleted users from all type of find operations
userScheama.pre(/^find/, function(next) {
  // points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// instance methods that will be available with every document
// we have to pass stored user hash password as the select is false so it wont be available in "this"
userScheama.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userScheama.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    //console.log(JWTTimestamp, changedTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  // FALSE measn not chnaged
  return false; // if the password has not been changed after token is issued
};

userScheama.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // encrypt the hash token again before storing it in the database.
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // by default token will expire in 10 minutes.
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userScheama);

module.exports = User;

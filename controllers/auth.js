const User = require("../models/user");

const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const name = req.body.name;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error("Invalid details");
    err.status = 422;
    err.data = errors.array();
    throw err;
  }
  bcrypt
    .hash(password, 12)
    .then((hashedpw) => {
      const user = new User({
        email,
        password: hashedpw,
        name,
      });
      return user.save();
    })
    .then((result) => {
      return res.status(201).json({
        message: "User created",
        userId: result._id,
      });
    })
    .catch((err) => {
      if (!err.status) {
        err.status = 500;
      }
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email })
    .then((user) => {
      if (!user) {
        const err = new Error("Email or password incorrect");
        err.status = 401;
        throw err;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((equal) => {
      if (!equal) {
        const err = new Error("Email or password incorrect");
        err.status = 401;
        throw err;
      }
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        "somesupersecretsecret",
        { expiresIn: "1h" }
      );
      return res.status(200).json({
        token,
        userId: loadedUser._id.toString(),
      });
    })
    .catch((err) => {
      if (!err.status) {
        err.status = 500;
      }
      next(err);
    });
};

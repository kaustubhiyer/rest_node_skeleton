const { validationResult } = require("express-validator");

const Post = require("../models/post");
const User = require("../models/user");

const { clearImage } = require("../util/image");

exports.getPosts = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 2;
  let totalItems;
  Post.find()
    .countDocuments()
    .then((numDocs) => {
      totalItems = numDocs;
      return Post.find()
        .skip((page - 1) * perPage)
        .limit(perPage);
    })
    .then((posts) => {
      return res.status(200).json({
        message: "retreived posts",
        posts,
        totalItems,
      });
    })
    .catch((err) => {
      if (!err.status) {
        err.status = 500;
      }
      next(err);
    });
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const err = new Error("Could not find post");
        err.status = 404;
        throw err;
      }
      return res.status(200).json({
        message: "Post fetched",
        post,
      });
    })
    .catch((err) => {
      if (!err.status) {
        err.status = 500;
      }
      next(err);
    });
};

exports.createPost = (req, res, next) => {
  const title = req.body.title;
  const content = req.body.content;
  const errors = validationResult(req);
  let creator;
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed on server side");
    error.status = 422;
    throw error;
  }
  if (!req.file) {
    const err = new Error("Image missing.");
    err.status = 422;
    throw err;
  }
  const imageUrl = req.file.path;
  const post = new Post({
    title,
    content,
    imageUrl: imageUrl,
    creator: req.userId,
  });
  post
    .save()
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then((result) => {
      return res.status(201).json({
        message: "Post created successfully",
        post: post,
        creator: { _id: creator._id, name: creator.name },
      });
    })
    .catch((err) => {
      if (!err.status) {
        err.status = 500;
      }
      next(err);
    });
};

exports.getStatus = (req, res, next) => {
  const userId = req.userId;
  User.findById(userId)
    .then((user) => {
      if (!user) {
        throw new Error("Could not retrieve user");
      }
      return res.status(200).json({
        status: user.status,
      });
    })
    .catch((err) => {
      if (!err.status) {
        err.status = 500;
      }
      next(err);
    });
};

exports.updateStatus = (req, res, next) => {
  const userId = req.userId;
  const status = req.body.status;
  User.findById(userId)
    .then((user) => {
      if (!user) {
        throw new Error("Could not retrieve user");
      }
      console.log(user);
      user.status = status;
      return user.save();
    })
    .then((user) => {
      return res.status(200).json({
        status: user.status,
      });
    })
    .catch((err) => {
      if (!err.status) {
        err.status = 500;
      }
      next(err);
    });
};

exports.updatePost = (req, res, next) => {
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed on server side");
    error.status = 422;
    throw error;
  }
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    const err = new Error("no file picked");
    err.status = 422;
    throw err;
  }
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const err = new Error("Post not found!");
        err.status = 404;
        throw err;
      }
      if (post.creator.toString() !== req.userId.toString()) {
        const err = new Error("Not Authorized");
        err.status = 403;
        throw err;
      }
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;
      return post.save();
    })
    .then((result) => {
      return res.status(200).json({
        message: "Updated post",
        post: result,
      });
    })
    .catch((err) => {
      if (!err.status) {
        err.status = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const err = new Error("Post not found!");
        err.status = 404;
        throw err;
      }
      if (post.creator.toString() !== req.userId.toString()) {
        const err = new Error("Not Authorized");
        err.status = 403;
        throw err;
      }
      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(post._id);
    })
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(postId);
      return user.save;
    })
    .then((result) => {
      res.status(200).json({
        message: "Post deleted successfully",
      });
    })
    .catch((err) => {
      if (!err.status) {
        err.status = 500;
      }
      next(err);
    });
};

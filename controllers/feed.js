const { validationResult } = require("express-validator");

const Post = require("../models/post");
const User = require("../models/user");
const { getIO } = require("../socket");

const { clearImage } = require("../util/image");

exports.getPosts = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);
    return res.status(200).json({
      message: "retreived posts",
      posts,
      totalItems,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = Post.findById(postId);
    if (!post) {
      const err = new Error("Could not find post");
      err.status = 404;
      throw err;
    }
    return res.status(200).json({
      message: "Post fetched",
      post,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
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
  try {
    await post.save();
    creator = await User.findById(req.userId);
    creator.posts.push(post);
    await creator.save();
    getIO().emit("post", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: creator.name } },
    });
    return res.status(201).json({
      message: "Post created successfully",
      post: post,
      creator: { _id: creator._id, name: creator.name },
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
    }
    next(err);
  }
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

exports.updatePost = async (req, res, next) => {
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
  try {
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const err = new Error("Post not found!");
      err.status = 404;
      throw err;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
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
    let result = await post.save();
    getIO().emit("post", { action: "update", post: result });
    return res.status(200).json({
      message: "Updated post",
      post: result,
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const err = new Error("Post not found!");
      err.status = 404;
      throw err;
    }
    console.log(post.creator);
    if (post.creator.toString() !== req.userId.toString()) {
      const err = new Error("Not Authorized");
      err.status = 403;
      throw err;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(post._id);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save;
    getIO().emit("post", { action: "delete", post: postId });
    return res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (err) {
    if (!err.status) {
      err.status = 500;
    }
    next(err);
  }
};

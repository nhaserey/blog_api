const Post = require("../model/Post");
const User = require("../model/User");
const asyncHandler = require("express-async-handler");
const apiError = require("../utils/apiError");
const handlers = require("./handlersFactory");

exports.createPost = asyncHandler(async (req, res) => {
  req.body.author = req.user._id;
  const post = await Post.create(req.body);
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: { posts: post._id },
    },
    { new: true }
  );

  res.status(201).send({ data: post });
});

exports.updatePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const post = await Post.findById(id);

  if (!post) {
    return next(new apiError(`No Post for this id ${id}`));
  }

  if (post.author.toString() !== req.user._id.toString()) {
    return next(new apiError(`You are not allowed to update this post`, 403));
  }

  const doc = await Post.findOneAndUpdate(post._id, req.body, { new: true });

  res.status(200).json({ data: doc });
});

exports.allPosts = asyncHandler(async (req, res) => {
  const post = await Post.find().populate("author");

  const posts = post.filter((item) => {
    return !item.author.blocked.includes(req.user._id);
  });

  res.status(200).json({ size: posts.length, data: posts });
});

exports.getPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id).populate("author");

  if (!post) {
    return next(new apiError(`No post for this id ${req.params.id}`, 404));
  }

  if (post.author.blocked.includes(req.user._id)) {
    return next(
      new apiError(`Sorry, You Are Not Allowed to Access This Post`, 403)
    );
  }

  res.send(post);
});

exports.deletePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const post = await Post.findById(id);
  if (!post) {
    return next(new apiError(`No Post for this id ${id}`));
  }

  if (post.author.toString() !== req.user._id.toString()) {
    return next(new apiError(`You are not allowed to delete this post`, 403));
  }

  await Post.findByIdAndDelete(id);
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: { posts: post._id },
    },
    { new: true }
  );

  res.status(204).send();
});

const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');
const redis = require('redis');
const util = require('util');

const Blog = mongoose.model('Blog');

module.exports = (app) => {
  app.get('/api/blogs/:id', requireLogin, async (req, res) => {
    const blog = await Blog.findOne({
      _user: req.user.id,
      _id: req.params.id,
    });

    res.send(blog);
  });

  app.get('/api/blogs', requireLogin, async (req, res) => {
    const client = redis.createClient('redis://127.0.0.1:6379');
    client.get = util.promisify(client.get);

    // do we have any cached data in our cached layer(redis) if yes,
    // then response it, if not go to mlab
    const cachedBlog = await client.get(req.user.id);
    if (cachedBlog) {
      // console.log('serving on redis');
      return res.send(JSON.parse(cachedBlog));
    }
    const blogs = await Blog.find({ _user: req.user.id });
    // console.log('serving on mongo db');
    client.set(req.user.id, JSON.stringify(blogs)); // set data to redis

    return res.send(blogs);
  });

  app.post('/api/blogs', requireLogin, async (req, res) => {
    const { title, content } = req.body;

    const blog = new Blog({
      title,
      content,
      _user: req.user.id,
    });

    try {
      await blog.save();
      res.send(blog);
    } catch (err) {
      res.send(400, err);
    }
  });
};

const { Post } = require('../models/post');

class PostService {
  async createPost(userId, channelIds, content, scheduleTime, tags = [], settings = {}) {
    const post = new Post({
      userId,
      channelId: channelIds,
      content,
      scheduleTime,
      tags,
      settings
    });
    return await post.save();
  }

  async getScheduledPosts(userId) {
    return await Post.find({
      userId,
      status: 'scheduled',
      scheduleTime: { $gt: new Date() }
    }).sort({ scheduleTime: 1 });
  }

  async getPostById(postId, userId) {
    return await Post.findOne({ _id: postId, userId });
  }

  async updatePost(postId, userId, updateData) {
    return await Post.findOneAndUpdate(
      { _id: postId, userId },
      { $set: updateData },
      { new: true }
    );
  }

  async deletePost(postId, userId) {
    return await Post.findOneAndUpdate(
      { _id: postId, userId },
      { $set: { status: 'deleted' } },
      { new: true }
    );
  }

  async markAsPublished(postId) {
    return await Post.findOneAndUpdate(
      { _id: postId },
      { $set: { status: 'published' } },
      { new: true }
    );
  }

  async markAsFailed(postId, error) {
    return await Post.findOneAndUpdate(
      { _id: postId },
      { 
        $set: { 
          status: 'failed',
          error: error.message
        } 
      },
      { new: true }
    );
  }

  async getPostsByTag(userId, tag) {
    return await Post.find({
      userId,
      tags: tag,
      status: 'scheduled'
    }).sort({ scheduleTime: 1 });
  }
}

module.exports = new PostService(); 
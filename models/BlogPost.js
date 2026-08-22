const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const BlogPost = mongoose.model("BlogPost", baseSchema);
module.exports = BlogPost;

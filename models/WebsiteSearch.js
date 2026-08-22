const  mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const WebsiteSearch = mongoose.model("WebsiteSearch", baseSchema);

module.exports = WebsiteSearch
const  mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const KeywordSearch = mongoose.model("KeywordSearch", baseSchema);

module.exports = KeywordSearch
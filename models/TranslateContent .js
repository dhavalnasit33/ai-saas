const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const ContentTranslator  = mongoose.model("ContentTranslator ", baseSchema);
module.exports = ContentTranslator ;

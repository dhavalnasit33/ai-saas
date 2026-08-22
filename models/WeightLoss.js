const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const WeightLoss = mongoose.model("WeightLoss", baseSchema);
module.exports = WeightLoss;

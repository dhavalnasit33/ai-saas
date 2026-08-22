const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const OnlineIncome = mongoose.model("OnlineIncome", baseSchema);
module.exports = OnlineIncome;

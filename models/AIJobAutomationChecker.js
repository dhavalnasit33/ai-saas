const  mongoose = require('mongoose');
const baseSchema = require('./commonSchema');

const AIJobAutomationChecker = new mongoose.model('AiJobAutomationChecker', baseSchema);
module.exports = AIJobAutomationChecker;
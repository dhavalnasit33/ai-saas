const UAParser = require("ua-parser-js");

function getDeviceInfo(req) {
  const ua = req.headers["user-agent"];

  const parser = new UAParser(ua);
  const result = parser.getResult();

  return {
    deviceType: result.device.type || "desktop",
    browser: result.browser.name || "Unknown",
    os: result.os.name || "Unknown",
    userAgent: ua,
    ip:
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress,
    loginAt: new Date(),
  };
}

module.exports = { getDeviceInfo };
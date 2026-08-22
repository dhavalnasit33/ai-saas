const sgMail = require("@sendgrid/mail");
const TemplateService = require("./templateService");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendTemplateEmail = async ({ to, subject, templateName, variables,fromName }) => {
  try {
    // Load full HTML (template + base layout)
    const html = await TemplateService.loadTemplate(
      templateName,
      variables,
      subject,
    );

    const response = await sgMail.send({
      to,
    from: {
        email: "notifications@onechatai.ai", 
        name: fromName || "OneChat AI",      
      },
      subject,
      html,
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false,
        },
      },
    });

    return response;
  } catch (error) {
    console.error("\n❌ EMAIL SEND FAILED");
    console.error("📛 Template:", templateName);
    console.error("📛 To:", to);

    if (error.response) {
      console.error("📛 Status Code:", error.response.statusCode);
      console.error("📛 Body:", JSON.stringify(error.response.body, null, 2));
    } else {
      console.error("📛 Error:", error.message);
    }

    throw error;
  }
};

module.exports = { sendTemplateEmail };

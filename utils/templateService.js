const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

class TemplateService {
 static async loadTemplate(templateName, variables, title = "OneChat AI") {
  const templatePath = path.join(__dirname, '..', 'emailTemplates', `${templateName}.ejs`);
  const layoutPath = path.join(__dirname, '..', 'emailTemplates', 'baseLayout.ejs');

  if (!fs.existsSync(templatePath) || !fs.existsSync(layoutPath)) {
    throw new Error(`Template ${templateName} not found`);
  }

  const contentHtml = ejs.render(
    fs.readFileSync(templatePath, 'utf8'),
    variables
  );

  return ejs.render(
    fs.readFileSync(layoutPath, 'utf8'),
    { title, content: contentHtml }
  );
}
}

module.exports = TemplateService;

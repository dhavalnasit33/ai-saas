// logo/LogoService.js
const axios = require("axios");
const FormData = require("form-data");
const { Readable } = require("stream");
const { getSafeUserId } = require("./aiService");

function bufferToStream(buffer) {
  return Readable.from(buffer);
}

class LogoService {
  constructor() {
    this.BASE_URL = "https://api.stability.ai/v2beta/stable-image";
  }

  buildGeneratePrompt({
    businessName,
    tagline,
    industry,
    style,
    colors,
    description,
  }) {
    let prompt = `Create a clean, professional, vector-style logo for a business named "${businessName}".`;

    if (industry) prompt += ` Industry: ${industry}.`;
    if (style) prompt += ` Style: ${style}.`;
    if (colors?.length) prompt += ` Preferred colors: ${colors.join(", ")}.`;

    if (description) {
      prompt += ` Description / context: ${description}.`;
    }

    prompt += ` Text spelling must be EXACT: "${businessName}".`;

    if (tagline) {
      prompt += `tagline: "${tagline}".`;
    }

    prompt +=
      " Minimal background, flat design, centered composition, logo-friendly, high contrast.";

    return prompt;
  }

  buildNegativePrompt() {
    return (
      "photorealistic, background scenery, watermark, misspelled text, " +
      "blurry, low quality, 3d render, shadows, gradients, noisy background"
    );
  }

  buildRefinePrompt(refineInstruction) {
    return `
You are performing a STYLE REFINEMENT on an existing logo image.

PRIMARY GOAL:
- Apply the requested COLOR CHANGES exactly as specified.
- The color update is intentional and allowed.

COLOR RULES (VERY IMPORTANT):
- Replace the existing color palette with the new requested colors.
- Completely remove all previous colors that are not mentioned.
- Do NOT preserve, blend, or hint any old colors.

RENDERING RULES:
- Flat vector logo
- Clean background suitable for branding

USER REQUEST:
"${refineInstruction}"
`;
  }

  async generateLogoConcepts(inputs) {
    const prompt = this.buildGeneratePrompt(inputs);
    const negative_prompt = this.buildNegativePrompt();
    const samples = inputs.count || 1;

    const images = [];

    for (let i = 0; i < samples; i++) {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("negative_prompt", negative_prompt);
      formData.append("aspect_ratio", "1:1");
      formData.append("output_format", "png");
      formData.append("model", "sd3.5-medium");

      const headers = {
        ...formData.getHeaders(),
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "image/*", // ✅ IMPORTANT
      };

      if (inputs.userId) {
        const safeId = getSafeUserId(inputs.userId);
        if (safeId) {
          headers["stability-client-user-id"] = safeId;
        }
      }

      const response = await axios.post(
        `${this.BASE_URL}/generate/sd3`,
        formData,
        {
          headers,
          responseType: "arraybuffer", // ✅ IMPORTANT
        }
      );

      // ✅ DIRECT IMAGE BUFFER
      images.push(Buffer.from(response.data));
    }

    return {
      generationId: `gen_${Date.now()}`,
      imageBuffers: images,
    };
  }

  async refineLogo(inputs, sourceImageBuffer) {
    const prompt = this.buildRefinePrompt(inputs.refineInstruction);
    const negative_prompt = this.buildNegativePrompt();

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("negative_prompt", negative_prompt);
    formData.append("output_format", "png");

    formData.append("image", bufferToStream(sourceImageBuffer), {
      filename: "source.png",
      contentType: "image/png",
    });

    try {
      const headers = {
        ...formData.getHeaders(),
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "image/*",
      };

      if (inputs.userId) {
        const safeId = getSafeUserId(inputs.userId);
        if (safeId) {
          headers["stability-client-user-id"] = safeId;
        }
      }

      const response = await axios.post(
        `${this.BASE_URL}/control/style`,
        formData,
        {
          headers,
          responseType: "arraybuffer",
        }
      );

      return Buffer.from(response.data);
    } catch (err) {
      let msg = err.message;
      if (err.response?.data) {
        try {
          msg = Buffer.from(err.response.data).toString("utf8");
        } catch (_) {}
      }
      console.error("Stability Style Refine Error:", msg);
      throw new Error("Logo refinement failed");
    }
  }
}

module.exports = new LogoService();

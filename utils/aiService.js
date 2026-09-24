// // // // const axios = require('axios');
// // // // const AIProvider = require('../models/AIProvider');

// // // // class AIService {
// // // //   constructor() {
// // // //     this.providers = new Map();
// // // //     this.loadProviders();
// // // //   }

// // // //   async loadProviders() {
// // // //     try {
// // // //       const providers = await AIProvider.find({ is_active: true }).select('+api_key');
// // // //       providers.forEach(provider => {
// // // //         this.providers.set(provider.name, provider);
// // // //       });
// // // //     } catch (error) {
// // // //       console.error('Error loading AI providers:', error);
// // // //     }
// // // //   }

// // // //   async generateResponse(prompt, systemPrompt, preferredProvider = 'openai') {
// // // //     try {
// // // //       // Try preferred provider first
// // // //       let provider = this.providers.get(preferredProvider);

// // // //       // Fallback to any available provider
// // // //       if (!provider || !provider.is_active) {
// // // //         provider = Array.from(this.providers.values()).find(p => p.is_active);
// // // //       }

// // // //       if (!provider) {
// // // //         throw new Error('No active AI providers available');
// // // //       }

// // // //       const response = await this.callProvider(provider, prompt, systemPrompt);

// // // //       // Update usage stats
// // // //       await this.updateUsageStats(provider._id, response.tokens_used);

// // // //       return {
// // // //         response: response.text,
// // // //         provider: provider.name,
// // // //         model: provider.model,
// // // //         tokens_used: response.tokens_used
// // // //       };
// // // //     } catch (error) {
// // // //       console.error('AI generation error:', error);
// // // //       throw error;
// // // //     }
// // // //   }

// // // //   async callProvider(provider, prompt, systemPrompt) {
// // // //     switch (provider.name) {
// // // //       case 'openai':
// // // //         return await this.callOpenAI(provider, prompt, systemPrompt);
// // // //       case 'deepseek':
// // // //         return await this.callDeepSeek(provider, prompt, systemPrompt);
// // // //       default:
// // // //         throw new Error(`Unsupported provider: ${provider.name}`);
// // // //     }
// // // //   }

// // // //   async callOpenAI(provider, prompt, systemPrompt) {
// // // //     try {
// // // //       const response = await axios.post(
// // // //         `${provider.base_url}/chat/completions`,
// // // //         {
// // // //           model: provider.model,
// // // //           messages: [
// // // //             { role: 'system', content: systemPrompt },
// // // //             { role: 'user', content: prompt }
// // // //           ],
// // // //           max_tokens: provider.max_tokens,
// // // //           temperature: 0.7
// // // //         },
// // // //         {
// // // //           headers: {
// // // //             'Authorization': `Bearer ${provider.api_key}`,
// // // //             'Content-Type': 'application/json'
// // // //           },
// // // //         }
// // // //       );

// // // //       return {
// // // //         text: response.data.choices[0].message.content,
// // // //         tokens_used: response.data.usage.total_tokens
// // // //       };
// // // //     } catch (error) {
// // // //       console.error('OpenAI API error:', error.response?.data || error.message);
// // // //       throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
// // // //     }
// // // //   }

// // // //   async callDeepSeek(provider, prompt, systemPrompt) {
// // // //     try {
// // // //       const response = await axios.post(
// // // //         `${provider.base_url}/chat/completions`,
// // // //         {
// // // //           model: provider.model,
// // // //           messages: [
// // // //             { role: 'system', content: systemPrompt },
// // // //             { role: 'user', content: prompt }
// // // //           ],
// // // //           max_tokens: provider.max_tokens,
// // // //           temperature: 0.7
// // // //         },
// // // //         {
// // // //           headers: {
// // // //             'Authorization': `Bearer ${provider.api_key}`,
// // // //             'Content-Type': 'application/json'
// // // //           }
// // // //         }
// // // //       );

// // // //       return {
// // // //         text: response.data.choices[0].message.content,
// // // //         tokens_used: response.data.usage?.total_tokens || 1
// // // //       };
// // // //     } catch (error) {
// // // //       console.error('DeepSeek API error:', error.response?.data || error.message);
// // // //       throw new Error(`DeepSeek API error: ${error.response?.data?.error?.message || error.message}`);
// // // //     }
// // // //   }

// // // //   async updateUsageStats(providerId, tokensUsed) {
// // // //     try {
// // // //       await AIProvider.findByIdAndUpdate(providerId, {
// // // //         $inc: {
// // // //           'usage_stats.total_requests': 1,
// // // //           'usage_stats.total_tokens': tokensUsed
// // // //         },
// // // //         'usage_stats.last_used': new Date()
// // // //       });
// // // //     } catch (error) {
// // // //       console.error('Error updating usage stats:', error);
// // // //     }
// // // //   }

// // // //   async refreshProviders() {
// // // //     await this.loadProviders();
// // // //   }
// // // // }

// // // // // Create singleton instance
// // // // const aiService = new AIService();

// // // // // Export the generate function
// // // // const generateAIResponse = async (prompt, systemPrompt, preferredProvider) => {
// // // //   return await aiService.generateResponse(prompt, systemPrompt, preferredProvider);
// // // // };

// // // // module.exports = {
// // // //   generateAIResponse,
// // // //   aiService
// // // // };
// // // const axios = require("axios")
// // // const AIProvider = require("../models/AIProvider")

// // // class AIService {
// // //   constructor() {
// // //     this.providers = new Map()
// // //     this.loadProviders()
// // //   }

// // //   async loadProviders() {
// // //     try {
// // //       const providers = await AIProvider.find({ is_active: true }).select("+api_key")
// // //       providers.forEach((provider) => {
// // //         this.providers.set(provider.name, provider)
// // //       })
// // //     } catch (error) {
// // //       console.error("Error loading AI providers:", error)
// // //     }
// // //   }

// // //   // Original non-streaming method (kept for backward compatibility)
// // //   async generateResponse(prompt, systemPrompt, preferredProvider = "openai") {
// // //     try {
// // //       let provider = this.providers.get(preferredProvider)

// // //       if (!provider || !provider.is_active) {
// // //         provider = Array.from(this.providers.values()).find((p) => p.is_active)
// // //       }

// // //       if (!provider) {
// // //         throw new Error("No active AI providers available")
// // //       }

// // //       const response = await this.callProvider(provider, prompt, systemPrompt)

// // //       await this.updateUsageStats(provider._id, response.tokens_used)

// // //       return {
// // //         response: response.text,
// // //         provider: provider.name,
// // //         model: provider.model,
// // //         tokens_used: response.tokens_used,
// // //       }
// // //     } catch (error) {
// // //       console.error("AI generation error:", error)
// // //       throw error
// // //     }
// // //   }

// // //   // New streaming method
// // //   async generateStreamingResponse(prompt, systemPrompt, preferredProvider = "openai", onChunk, onComplete, onError) {
// // //     try {
// // //       let provider = this.providers.get(preferredProvider)

// // //       if (!provider || !provider.is_active) {
// // //         provider = Array.from(this.providers.values()).find((p) => p.is_active)
// // //       }

// // //       if (!provider) {
// // //         throw new Error("No active AI providers available")
// // //       }

// // //       await this.callProviderStreaming(provider, prompt, systemPrompt, onChunk, onComplete, onError)
// // //     } catch (error) {
// // //       console.error("AI streaming error:", error)
// // //       if (onError) onError(error)
// // //       throw error
// // //     }
// // //   }

// // //   async callProvider(provider, prompt, systemPrompt) {
// // //     switch (provider.name) {
// // //       case "openai":
// // //         return await this.callOpenAI(provider, prompt, systemPrompt)
// // //       case "deepseek":
// // //         return await this.callDeepSeek(provider, prompt, systemPrompt)
// // //       default:
// // //         throw new Error(`Unsupported provider: ${provider.name}`)
// // //     }
// // //   }

// // //   async callProviderStreaming(provider, prompt, systemPrompt, onChunk, onComplete, onError) {
// // //     switch (provider.name) {
// // //       case "openai":
// // //         return await this.callOpenAIStreaming(provider, prompt, systemPrompt, onChunk, onComplete, onError)
// // //       case "deepseek":
// // //         return await this.callDeepSeekStreaming(provider, prompt, systemPrompt, onChunk, onComplete, onError)
// // //       default:
// // //         throw new Error(`Unsupported provider: ${provider.name}`)
// // //     }
// // //   }

// // //   async callOpenAI(provider, prompt, systemPrompt) {
// // //     try {
// // //       const response = await axios.post(
// // //         `${provider.base_url}/chat/completions`,
// // //         {
// // //           model: provider.model,
// // //           messages: [
// // //             { role: "system", content: systemPrompt },
// // //             { role: "user", content: prompt },
// // //           ],
// // //           max_tokens: provider.max_tokens,
// // //           temperature: 0.7,
// // //         },
// // //         {
// // //           headers: {
// // //             Authorization: `Bearer ${provider.api_key}`,
// // //             "Content-Type": "application/json",
// // //           },
// // //         },
// // //       )

// // //       return {
// // //         text: response.data.choices[0].message.content,
// // //         tokens_used: response.data.usage.total_tokens,
// // //       }
// // //     } catch (error) {
// // //       console.error("OpenAI API error:", error.response?.data || error.message)
// // //       throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`)
// // //     }
// // //   }

// // //   async callOpenAIStreaming(provider, prompt, systemPrompt, onChunk, onComplete, onError) {
// // //     try {
// // //       const response = await axios.post(
// // //         `${provider.base_url}/chat/completions`,
// // //         {
// // //           model: provider.model,
// // //           messages: [
// // //             { role: "system", content: systemPrompt },
// // //             { role: "user", content: prompt },
// // //           ],
// // //           max_tokens: provider.max_tokens,
// // //           temperature: 0.7,
// // //           stream: true,
// // //         },
// // //         {
// // //           headers: {
// // //             Authorization: `Bearer ${provider.api_key}`,
// // //             "Content-Type": "application/json",
// // //           },
// // //           responseType: "stream",
// // //         },
// // //       )

// // //       let fullResponse = ""
// // //       let totalTokens = 0

// // //       response.data.on("data", (chunk) => {
// // //         const lines = chunk
// // //           .toString()
// // //           .split("\n")
// // //           .filter((line) => line.trim() !== "")

// // //         for (const line of lines) {
// // //           if (line.includes("[DONE]")) {
// // //             if (onComplete) {
// // //               onComplete({
// // //                 fullResponse,
// // //                 provider: provider.name,
// // //                 model: provider.model,
// // //                 tokens_used: totalTokens || 1,
// // //               })
// // //             }
// // //             return
// // //           }

// // //           if (line.startsWith("data: ")) {
// // //             try {
// // //               const data = JSON.parse(line.slice(6))

// // //               if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
// // //                 const content = data.choices[0].delta.content
// // //                 fullResponse += content

// // //                 if (onChunk) {
// // //                   onChunk({
// // //                     content,
// // //                     fullResponse,
// // //                     provider: provider.name,
// // //                     model: provider.model,
// // //                   })
// // //                 }
// // //               }

// // //               if (data.usage) {
// // //                 totalTokens = data.usage.total_tokens
// // //               }
// // //             } catch (parseError) {
// // //               console.error("Error parsing streaming data:", parseError)
// // //             }
// // //           }
// // //         }
// // //       })

// // //       response.data.on("end", () => {
// // //         if (onComplete) {
// // //           onComplete({
// // //             fullResponse,
// // //             provider: provider.name,
// // //             model: provider.model,
// // //             tokens_used: totalTokens || 1,
// // //           })
// // //         }
// // //       })

// // //       response.data.on("error", (error) => {
// // //         console.error("Stream error:", error)
// // //         if (onError) onError(error)
// // //       })
// // //     } catch (error) {
// // //       console.error("OpenAI streaming error:", error.response?.data || error.message)
// // //       if (onError) onError(error)
// // //       throw new Error(`OpenAI streaming error: ${error.response?.data?.error?.message || error.message}`)
// // //     }
// // //   }

// // //   async callDeepSeek(provider, prompt, systemPrompt) {
// // //     try {
// // //       const response = await axios.post(
// // //         `${provider.base_url}/chat/completions`,
// // //         {
// // //           model: provider.model,
// // //           messages: [
// // //             { role: "system", content: systemPrompt },
// // //             { role: "user", content: prompt },
// // //           ],
// // //           max_tokens: provider.max_tokens,
// // //           temperature: 0.7,
// // //         },
// // //         {
// // //           headers: {
// // //             Authorization: `Bearer ${provider.api_key}`,
// // //             "Content-Type": "application/json",
// // //           },
// // //         },
// // //       )

// // //       return {
// // //         text: response.data.choices[0].message.content,
// // //         tokens_used: response.data.usage?.total_tokens || 1,
// // //       }
// // //     } catch (error) {
// // //       console.error("DeepSeek API error:", error.response?.data || error.message)
// // //       throw new Error(`DeepSeek API error: ${error.response?.data?.error?.message || error.message}`)
// // //     }
// // //   }

// // //   async callDeepSeekStreaming(provider, prompt, systemPrompt, onChunk, onComplete, onError) {
// // //     try {
// // //       const response = await axios.post(
// // //         `${provider.base_url}/chat/completions`,
// // //         {
// // //           model: provider.model,
// // //           messages: [
// // //             { role: "system", content: systemPrompt },
// // //             { role: "user", content: prompt },
// // //           ],
// // //           max_tokens: provider.max_tokens,
// // //           temperature: 0.7,
// // //           stream: true,
// // //         },
// // //         {
// // //           headers: {
// // //             Authorization: `Bearer ${provider.api_key}`,
// // //             "Content-Type": "application/json",
// // //           },
// // //           responseType: "stream",
// // //         },
// // //       )

// // //       let fullResponse = ""
// // //       let totalTokens = 0

// // //       response.data.on("data", (chunk) => {
// // //         const lines = chunk
// // //           .toString()
// // //           .split("\n")
// // //           .filter((line) => line.trim() !== "")

// // //         for (const line of lines) {
// // //           if (line.includes("[DONE]")) {
// // //             if (onComplete) {
// // //               onComplete({
// // //                 fullResponse,
// // //                 provider: provider.name,
// // //                 model: provider.model,
// // //                 tokens_used: totalTokens || 1,
// // //               })
// // //             }
// // //             return
// // //           }

// // //           if (line.startsWith("data: ")) {
// // //             try {
// // //               const data = JSON.parse(line.slice(6))

// // //               if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
// // //                 const content = data.choices[0].delta.content
// // //                 fullResponse += content

// // //                 if (onChunk) {
// // //                   onChunk({
// // //                     content,
// // //                     fullResponse,
// // //                     provider: provider.name,
// // //                     model: provider.model,
// // //                   })
// // //                 }
// // //               }

// // //               if (data.usage) {
// // //                 totalTokens = data.usage.total_tokens
// // //               }
// // //             } catch (parseError) {
// // //               console.error("Error parsing streaming data:", parseError)
// // //             }
// // //           }
// // //         }
// // //       })

// // //       response.data.on("end", () => {
// // //         if (onComplete) {
// // //           onComplete({
// // //             fullResponse,
// // //             provider: provider.name,
// // //             model: provider.model,
// // //             tokens_used: totalTokens || 1,
// // //           })
// // //         }
// // //       })

// // //       response.data.on("error", (error) => {
// // //         console.error("Stream error:", error)
// // //         if (onError) onError(error)
// // //       })
// // //     } catch (error) {
// // //       console.error("DeepSeek streaming error:", error.response?.data || error.message)
// // //       if (onError) onError(error)
// // //       throw new Error(`DeepSeek streaming error: ${error.response?.data?.error?.message || error.message}`)
// // //     }
// // //   }

// // //   async updateUsageStats(providerId, tokensUsed) {
// // //     try {
// // //       await AIProvider.findByIdAndUpdate(providerId, {
// // //         $inc: {
// // //           "usage_stats.total_requests": 1,
// // //           "usage_stats.total_tokens": tokensUsed,
// // //         },
// // //         "usage_stats.last_used": new Date(),
// // //       })
// // //     } catch (error) {
// // //       console.error("Error updating usage stats:", error)
// // //     }
// // //   }

// // //   async refreshProviders() {
// // //     await this.loadProviders()
// // //   }
// // // }

// // // // Create singleton instance
// // // const aiService = new AIService()

// // // // Export both streaming and non-streaming functions
// // // const generateAIResponse = async (prompt, systemPrompt, preferredProvider) => {
// // //   return await aiService.generateResponse(prompt, systemPrompt, preferredProvider)
// // // }

// // // const generateStreamingAIResponse = async (prompt, systemPrompt, preferredProvider, onChunk, onComplete, onError) => {
// // //   return await aiService.generateStreamingResponse(
// // //     prompt,
// // //     systemPrompt,
// // //     preferredProvider,
// // //     onChunk,
// // //     onComplete,
// // //     onError,
// // //   )
// // // }

// // // module.exports = {
// // //   generateAIResponse,
// // //   generateStreamingAIResponse,
// // //   aiService,
// // // }
// // const axios = require("axios")
// // const AIProvider = require("../models/AIProvider")
// // const AIModel = require("../models/AIModel")
// // const FormData = require('form-data')

// // class AIService {
// //   constructor() {
// //     this.providers = new Map()
// //     this.models = new Map()
// //     this.loadProvidersAndModels()
// //   }

// //   async loadProvidersAndModels() {
// //     try {
// //       // Load providers
// //       const providers = await AIProvider.find({ is_active: true }).select("+api_key")
// //       providers.forEach((provider) => {
// //         this.providers.set(provider.name, provider)
// //       })

// //       // Load models with their providers
// //       const models = await AIModel.find({ is_active: true }).populate("ai_provider_id", "+api_key")

// //       models.forEach((model) => {
// //         if (model.ai_provider_id && model.ai_provider_id.is_active) {
// //           const key = `${model.ai_provider_id.name}:${model.model}`
// //           this.models.set(key, {
// //             ...model.toObject(),
// //             provider: model.ai_provider_id,
// //           })
// //         }
// //       })
// //     } catch (error) {
// //       console.error("Error loading AI providers and models:", error)
// //     }
// //   }

// //   // Get model by provider and model name
// //   getModel(providerName, modelName) {
// //     const key = `${providerName}:${modelName}`
// //     return this.models.get(key)
// //   }

// //   // Get all models for a provider
// //   getModelsByProvider(providerName) {
// //     const models = []
// //     for (const [key, model] of this.models.entries()) {
// //       if (key.startsWith(`${providerName}:`)) {
// //         models.push(model)
// //       }
// //     }
// //     return models
// //   }

// //   // Get default model for a provider
// //   getDefaultModel(providerName) {
// //     const models = this.getModelsByProvider(providerName)
// //     return models.length > 0 ? models[0] : null
// //   }

// //   // Original non-streaming method (updated to use models)
// //   async generateResponse(prompt, systemPrompt, modelId) {
// //     try {
// //       let model = null

// //       // If modelId is provided, try to find the specific model
// //       if (modelId) {
// //         model = await AIModel.findById(modelId).populate("ai_provider_id", "+api_key")
// //         if (!model || !model.is_active || !model.ai_provider_id.is_active) {
// //           model = null
// //         }
// //       }

// //       // Fallback to any available model
// //       if (!model) {
// //         const availableModels = await AIModel.find({ is_active: true }).populate("ai_provider_id", "+api_key")

// //         model = availableModels.find((m) => m.ai_provider_id && m.ai_provider_id.is_active)
// //       }

// //       if (!model) {
// //         throw new Error("No active AI models available")
// //       }

// //       const response = await this.callProvider(model, prompt, systemPrompt)

// //       await this.updateUsageStats(model.ai_provider_id._id, model._id, response.tokens_used)

// //       return {
// //         response: response.text,
// //         provider: model.ai_provider_id.name,
// //         model: model.model,
// //         tokens_used: response.tokens_used,
// //       }
// //     } catch (error) {
// //       console.error("AI generation error:", error)
// //       throw error
// //     }
// //   }

// //   // New streaming method (updated to use models)
// //   async generateStreamingResponse(prompt, systemPrompt, modelId, onChunk, onComplete, onError) {
// //     try {
// //       let model = null

// //       // If modelId is provided, try to find the specific model
// //       if (modelId) {
// //         model = await AIModel.findById(modelId).populate("ai_provider_id", "+api_key")
// //         if (!model || !model.is_active || !model.ai_provider_id.is_active) {
// //           model = null
// //         }
// //       }

// //       // Fallback to any available model
// //       if (!model) {
// //         const availableModels = await AIModel.find({ is_active: true }).populate("ai_provider_id", "+api_key")

// //         model = availableModels.find((m) => m.ai_provider_id && m.ai_provider_id.is_active)
// //       }

// //       if (!model) {
// //         throw new Error("No active AI models available")
// //       }

// //       await this.callProviderStreaming(model, prompt, systemPrompt, onChunk, onComplete, onError)
// //     } catch (error) {
// //       console.error("AI streaming error:", error)
// //       if (onError) onError(error)
// //       throw error
// //     }
// //   }

// //   async callProvider(model, prompt, systemPrompt) {
// //     const provider = model.ai_provider_id

// //     switch (provider.name) {
// //       case "openai":
// //         return await this.callOpenAI(provider, model, prompt, systemPrompt)
// //       case "deepseek":
// //         return await this.callDeepSeek(provider, model, prompt, systemPrompt)
// //       case "anthropic":
// //         return await this.callAnthropic(provider, model, prompt, systemPrompt)
// //       case "perplexity":
// //         return await this.callPerplexity(provider, model, prompt, systemPrompt)
// //       case "xai":
// //         return await this.callXAI(provider, model, prompt, systemPrompt)
// //       case "groq":
// //         return await this.callGroq(provider, model, prompt, systemPrompt)
// //       case "google":
// //         return await this.callGoogle(provider, model, prompt, systemPrompt)
// //       default:
// //         throw new Error(`Unsupported provider: ${provider.name}`)
// //     }
// //   }

// //   async callProviderStreaming(model, prompt, systemPrompt, onChunk, onComplete, onError) {
// //     const provider = model.ai_provider_id

// //     switch (provider.name) {
// //       case "openai":
// //         return await this.callOpenAIStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError)
// //       case "deepseek":
// //         return await this.callDeepSeekStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError)
// //       case "anthropic":
// //         return await this.callAnthropicStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError)
// //       case "perplexity":
// //         return await this.callPerplexityStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError)
// //       case "xai":
// //         return await this.callXAIStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError)
// //       case "groq":
// //         return await this.callGroqStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError)
// //       case "google":
// //         return await this.callGoogleStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError)
// //       default:
// //         throw new Error(`Unsupported provider: ${provider.name}`)
// //     }
// //   }

// //   async generateCoreImage(prompt, imageFile) {
// //     try {
// //       const formData = new FormData();
// //       formData.append('prompt', prompt);
// //       formData.append('output_format', 'png');
// //       formData.append('width', '512');
// //       formData.append('height', '512');
// //       formData.append('samples', '1');
// //       if (imageFile) {
// //         formData.append('image', imageFile.buffer, {
// //           filename: imageFile.originalname,
// //           contentType: imageFile.mimetype,
// //         });
// //       }
// //       const response = await axios.post(
// //         'https://api.stability.ai/v2beta/stable-image/generate/core',
// //         formData,
// //         {
// //             'Authorization': `Bearer \${process.env.STABILITY_API_KEY}`,
// //             'Accept': 'image/*',
// //             'Content-Type': 'multipart/form-data',
// //           },
// //           responseType: 'arraybuffer', // To handle binary data
// //         }
// //       );
// //       console.log(response.data);
// //       return response.data; // This will be the image data
// //     } catch (error) {
// //       console.error('Stability AI image generation error:', error.response?.data || error.message);
// //       throw new Error(`Stability AI image generation error: ${error.response?.data?.error?.message || error.message}`);
// //     }
// //   }
// //   async generateUltraImage(prompt, imageFile) {
// //     try {
// //       const formData = new FormData();
// //       formData.append('prompt', prompt);
// //       formData.append('output_format', 'png');
// //       formData.append('width', '512');
// //       formData.append('height', '512');
// //       formData.append('samples', '1');
// //       formData.append('strength', '0.35');
// //       if (imageFile) {
// //         formData.append('image', imageFile.buffer, {
// //           filename: imageFile.originalname,
// //           contentType: imageFile.mimetype,
// //         });
// //       }
// //       const response = await axios.post(
// //         'https://api.stability.ai/v2beta/stable-image/generate/ultra',
// //         formData,
// //         {
// //           headers: {
// //             'Authorization': `Bearer \${process.env.STABILITY_API_KEY}`,
// //             'Accept': 'image/*',
// //             'Content-Type': 'multipart/form-data',
// //           },
// //           responseType: 'arraybuffer', // To handle binary data
// //         }
// //       );
// //       console.log(response.data);
// //       return response.data; // This will be the image data
// //     } catch (error) {
// //       console.error('Stability AI image generation error:', error.response?.data || error.message);
// //       throw new Error(`Stability AI image generation error: ${error.response?.data?.error?.message || error.message}`);
// //     }
// //   }

// //   // OpenAI implementation
// //   async callOpenAI(provider, model, prompt, systemPrompt) {
// //     try {
// //       const response = await axios.post(
// //         `${provider.base_url}/chat/completions`,
// //         {
// //           model: model.model,
// //           messages: [
// //             { role: "system", content: systemPrompt },
// //             { role: "user", content: prompt },
// //           ],
// //           max_tokens: provider.max_tokens,
// //           temperature: 0.7,
// //         },
// //         {
// //           headers: {
// //             Authorization: `Bearer ${provider.api_key}`,
// //             "Content-Type": "application/json",
// //           },
// //         },
// //       )

// //       return {
// //         text: response.data.choices[0].message.content,
// //         tokens_used: response.data.usage.total_tokens,
// //       }
// //     } catch (error) {
// //       console.error("OpenAI API error:", error.response?.data || error.message)
// //       throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`)
// //     }
// //   }

// //   async callOpenAIStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError) {
// //     try {
// //       const response = await axios.post(
// //         `${provider.base_url}/chat/completions`,
// //         {
// //           model: model.model,
// //           messages: [
// //             { role: "system", content: systemPrompt },
// //             { role: "user", content: prompt },
// //           ],
// //           max_tokens: provider.max_tokens,
// //           temperature: 0.7,
// //           stream: true,
// //         },
// //         {
// //           headers: {
// //             Authorization: `Bearer ${provider.api_key}`,
// //             "Content-Type": "application/json",
// //           },
// //           responseType: "stream",
// //         },
// //       )

// //       let fullResponse = ""
// //       let totalTokens = 0

// //       response.data.on("data", (chunk) => {
// //         const lines = chunk
// //           .toString()
// //           .split("\n")
// //           .filter((line) => line.trim() !== "")

// //         for (const line of lines) {
// //           if (line.includes("[DONE]")) {
// //             if (onComplete) {
// //               onComplete({
// //                 fullResponse,
// //                 provider: provider.name,
// //                 model: model.model,
// //                 tokens_used: totalTokens || 1,
// //               })
// //             }
// //             return
// //           }

// //           if (line.startsWith("data: ")) {
// //             try {
// //               const data = JSON.parse(line.slice(6))

// //               if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
// //                 const content = data.choices[0].delta.content
// //                 fullResponse += content

// //                 if (onChunk) {
// //                   onChunk({
// //                     content,
// //                     fullResponse,
// //                     provider: provider.name,
// //                     model: model.model,
// //                   })
// //                 }
// //               }

// //               if (data.usage) {
// //                 totalTokens = data.usage.total_tokens
// //               }
// //             } catch (parseError) {
// //               console.error("Error parsing streaming data:", parseError)
// //             }
// //           }
// //         }
// //       })

// //       response.data.on("end", () => {
// //         if (onComplete) {
// //           onComplete({
// //             fullResponse,
// //             provider: provider.name,
// //             model: model.model,
// //             tokens_used: totalTokens || 1,
// //           })
// //         }
// //       })

// //       response.data.on("error", (error) => {
// //         console.error("Stream error:", error)
// //         if (onError) onError(error)
// //       })
// //     } catch (error) {
// //       console.error("OpenAI streaming error:", error.response?.data || error.message)
// //       if (onError) onError(error)
// //       throw new Error(`OpenAI streaming error: ${error.response?.data?.error?.message || error.message}`)
// //     }
// //   }

// //   // DeepSeek implementation
// //   async callDeepSeek(provider, model, prompt, systemPrompt) {
// //     try {
// //       const response = await axios.post(
// //         `${provider.base_url}/chat/completions`,
// //         {
// //           model: model.model,
// //           messages: [
// //             { role: "system", content: systemPrompt },
// //             { role: "user", content: prompt },
// //           ],
// //           max_tokens: provider.max_tokens,
// //           temperature: 0.7,
// //         },
// //         {
// //           headers: {
// //             Authorization: `Bearer ${provider.api_key}`,
// //             "Content-Type": "application/json",
// //           },
// //         },
// //       )

// //       return {
// //         text: response.data.choices[0].message.content,
// //         tokens_used: response.data.usage?.total_tokens || 1,
// //       }
// //     } catch (error) {
// //       console.error("DeepSeek API error:", error.response?.data || error.message)
// //       throw new Error(`DeepSeek API error: ${error.response?.data?.error?.message || error.message}`)
// //     }
// //   }

// //   async callDeepSeekStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError) {
// //     // Similar implementation to OpenAI streaming but for DeepSeek
// //     // Implementation would be similar to callOpenAIStreaming
// //     try {
// //       const response = await axios.post(
// //         `${provider.base_url}/chat/completions`,
// //         {
// //           model: model.model,
// //           messages: [
// //             { role: "system", content: systemPrompt },
// //             { role: "user", content: prompt },
// //           ],
// //           max_tokens: provider.max_tokens,
// //           temperature: 0.7,
// //           stream: true,
// //         },
// //         {
// //           headers: {
// //             Authorization: `Bearer ${provider.api_key}`,
// //             "Content-Type": "application/json",
// //           },
// //           responseType: "stream",
// //         },
// //       )

// //       let fullResponse = ""
// //       let totalTokens = 0

// //       response.data.on("data", (chunk) => {
// //         const lines = chunk
// //           .toString()
// //           .split("\n")
// //           .filter((line) => line.trim() !== "")

// //         for (const line of lines) {
// //           if (line.includes("[DONE]")) {
// //             if (onComplete) {
// //               onComplete({
// //                 fullResponse,
// //                 provider: provider.name,
// //                 model: model.model,
// //                 tokens_used: totalTokens || 1,
// //               })
// //             }
// //             return
// //           }

// //           if (line.startsWith("data: ")) {
// //             try {
// //               const data = JSON.parse(line.slice(6))

// //               if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
// //                 const content = data.choices[0].delta.content
// //                 fullResponse += content

// //                 if (onChunk) {
// //                   onChunk({
// //                     content,
// //                     fullResponse,
// //                     provider: provider.name,
// //                     model: model.model,
// //                   })
// //                 }
// //               }

// //               if (data.usage) {
// //                 totalTokens = data.usage.total_tokens
// //               }
// //             } catch (parseError) {
// //               console.error("Error parsing streaming data:", parseError)
// //             }
// //           }
// //         }
// //       })

// //       response.data.on("end", () => {
// //         if (onComplete) {
// //           onComplete({
// //             fullResponse,
// //             provider: provider.name,
// //             model: model.model,
// //             tokens_used: totalTokens || 1,
// //           })
// //         }
// //       })

// //       response.data.on("error", (error) => {
// //         console.error("Stream error:", error)
// //         if (onError) onError(error)
// //       })
// //     } catch (error) {
// //       console.error("DeepSeek streaming error:", error.response?.data || error.message)
// //       if (onError) onError(error)
// //       throw new Error(`DeepSeek streaming error: ${error.response?.data?.error?.message || error.message}`)
// //     }
// //   }

// //   // Placeholder implementations for other providers
// //   // ...existing code...
// // async callAnthropic(provider, model, prompt, systemPrompt) {
// //   try {
// //     const response = await axios.post(
// //       `${provider.base_url}/v1/messages`,
// //       {
// //         model: model.model,
// //         max_tokens: Math.min(provider.max_tokens, 4096), // or 1024 for safety
// //         temperature: 0.7,
// //         system: systemPrompt || "",
// //         messages: [
// //           { role: "user", content: prompt }
// //         ]
// //       },
// //       {
// //         headers: {
// //           "x-api-key": provider.api_key,
// //           "Content-Type": "application/json",
// //           "anthropic-version": "2023-06-01",
// //         },
// //       }
// //     );

// //     return {
// //       text: response.data.content?.[0]?.text || "",
// //       tokens_used: response.data.usage?.input_tokens + response.data.usage?.output_tokens || 1,
// //     };
// //   } catch (error) {
// //     console.error("Anthropic API error:", error.response?.data || error.message);
// //     throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`);
// //   }
// // }

// // async callAnthropicStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError) {
// //   try {
// //     const response = await axios.post(
// //       `${provider.base_url}/v1/messages`,
// //       {
// //         model: model.model,
// //         max_tokens: Math.min(provider.max_tokens, 4096), // or 1024 for safety
// //         temperature: 0.7,
// //         system: systemPrompt || "",
// //         messages: [
// //           { role: "user", content: prompt }
// //         ],
// //         stream: true,
// //       },
// //       {
// //         headers: {
// //           "x-api-key": provider.api_key,
// //           "Content-Type": "application/json",
// //           "anthropic-version": "2023-06-01",
// //         },
// //         responseType: "stream",
// //       }
// //     );

// //     let fullResponse = "";
// //     let totalTokens = 0;
// //     let buffer = "";

// //     response.data.on("data", (chunk) => {
// //       buffer += chunk.toString();
// //       let lines = buffer.split("\n");
// //       buffer = lines.pop(); // Save incomplete line for next chunk

// //       for (const line of lines) {
// //         if (line.trim() === "" || !line.startsWith("data: ")) continue;
// //         const dataStr = line.slice(6);
// //         if (dataStr === "[DONE]") {
// //           if (onComplete) {
// //             onComplete({
// //               fullResponse,
// //               provider: provider.name,
// //               model: model.model,
// //               tokens_used: totalTokens || 1,
// //             });
// //           }
// //           return;
// //         }
// //         try {
// //           const data = JSON.parse(dataStr);

// //           if (data.type === "content_block_delta" && data.delta?.text) {
// //             const content = data.delta.text;
// //             fullResponse += content;

// //             if (onChunk) {
// //               onChunk({
// //                 content,
// //                 fullResponse,
// //                 provider: provider.name,
// //                 model: model.model,
// //               });
// //             }
// //           }

// //           if (data.usage) {
// //             totalTokens = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
// //           }
// //         } catch (parseError) {
// //           if (dataStr.trim().endsWith("}")) {
// //             console.error("Error parsing streaming data:", parseError);
// //           }
// //         }
// //       }
// //     });

// //     response.data.on("end", () => {
// //       if (onComplete) {
// //         onComplete({
// //           fullResponse,
// //           provider: provider.name,
// //           model: model.model,
// //           tokens_used: totalTokens || 1,
// //         });
// //       }
// //     });

// //     response.data.on("error", (error) => {
// //       console.error("Stream error:", error);
// //       if (onError) onError(error);
// //     });
// //   } catch (error) {
// //     console.error("Anthropic streaming error:", error.response?.data || error.message);
// //     if (onError) onError(error);
// //     throw new Error(`Anthropic streaming error: ${error.response?.data?.error?.message || error.message}`);
// //   }
// // }
// // // ...existing code...

// //   async callPerplexity(provider, model, prompt, systemPrompt) {
// //     try {
// //       const response = await axios.post(
// //         `${provider.base_url}/chat/completions`,
// //         {
// //           model: model.model,
// //           messages: [
// //             { role: "system", content: systemPrompt },
// //             { role: "user", content: prompt },
// //           ],
// //           max_tokens: provider.max_tokens,
// //           temperature: 0.7,
// //         },
// //         {
// //           headers: {
// //             Authorization: `Bearer ${provider.api_key}`,
// //             "Content-Type": "application/json",
// //           },
// //         },
// //       );

// //       return {
// //         text: response.data.choices[0].message.content,
// //         tokens_used: response.data.usage?.total_tokens || 1,
// //       };
// //     } catch (error) {
// //       console.error("Perplexity API error:", error.response?.data || error.message);
// //       throw new Error(`Perplexity API error: ${error.response?.data?.error?.message || error.message}`);
// //     }
// //   }

// //   async callPerplexityStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError) {
// //     try {
// //       const response = await axios.post(
// //         `${provider.base_url}/chat/completions`,
// //         {
// //           model: model.model,
// //           messages: [
// //             { role: "system", content: systemPrompt },
// //             { role: "user", content: prompt },
// //           ],
// //           max_tokens: provider.max_tokens,
// //           temperature: 0.7,
// //           stream: true,
// //         },
// //         {
// //           headers: {
// //             Authorization: `Bearer ${provider.api_key}`,
// //             "Content-Type": "application/json",
// //           },
// //           responseType: "stream",
// //         },
// //       );

// //       let fullResponse = "";
// //       let totalTokens = 0;
// //       let buffer = "";
// //       let wordCount = 0;
// //       const WORD_LIMIT = 1500;
// //       let limitReached = false;

// //       response.data.on("data", (chunk) => {
// //         if (limitReached) return; // Ignore further chunks after limit

// //         buffer += chunk.toString();
// //         let lines = buffer.split("\n");
// //         buffer = lines.pop(); // Save incomplete line for next chunk

// //         for (const line of lines) {
// //           if (line.trim() === "" || !line.startsWith("data: ")) continue;
// //           const dataStr = line.slice(6);
// //           if (dataStr === "[DONE]") {
// //             if (onComplete) {
// //               onComplete({
// //                 fullResponse,
// //                 provider: provider.name,
// //                 model: model.model,
// //                 tokens_used: totalTokens || 1,
// //               });
// //             }
// //             return;
// //           }
// //           try {
// //             const data = JSON.parse(dataStr);

// //             if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
// //               let content = data.choices[0].delta.content;

// //               // Count words if limit not reached
// //               if (!limitReached) {
// //                 // Combine with previous response to count total words
// //                 const combined = fullResponse + content;
// //                 const words = combined.trim().split(/\s+/);
// //                 if (words.length > WORD_LIMIT) {
// //                   // Only add up to the word limit
// //                   const allowedWords = words.slice(0, WORD_LIMIT);
// //                   fullResponse = allowedWords.join(" ");
// //                   limitReached = true;

// //                   if (onChunk) {
// //                     onChunk({
// //                       content: "", // No new content, just signal end
// //                       fullResponse,
// //                       provider: provider.name,
// //                       model: model.model,
// //                     });
// //                   }
// //                   if (onComplete) {
// //                     onComplete({
// //                       fullResponse,
// //                       provider: provider.name,
// //                       model: model.model,
// //                       tokens_used: totalTokens || 1,
// //                     });
// //                   }
// //                   // Optionally destroy the stream to stop further data
// //                   response.data.destroy();
// //                   return;
// //                 } else {
// //                   fullResponse = combined;
// //                   wordCount = words.length;
// //                   if (onChunk) {
// //                     onChunk({
// //                       content,
// //                       fullResponse,
// //                       provider: provider.name,
// //                       model: model.model,
// //                     });
// //                   }
// //                 }
// //               }
// //             }

// //             if (data.usage) {
// //               totalTokens = data.usage.total_tokens;
// //             }
// //           } catch (parseError) {
// //             if (dataStr.trim().endsWith("}")) {
// //               console.error("Error parsing streaming data:", parseError);
// //             }
// //           }
// //         }
// //       });

// //       response.data.on("end", () => {
// //         if (!limitReached && onComplete) {
// //           onComplete({
// //             fullResponse,
// //             provider: provider.name,
// //             model: model.model,
// //             tokens_used: totalTokens || 1,
// //           });
// //         }
// //       });

// //       response.data.on("error", (error) => {
// //         console.error("Stream error:", error);
// //         if (onError) onError(error);
// //       });
// //     } catch (error) {
// //       console.error("Perplexity streaming error:", error.response?.data || error.message);
// //       if (onError) onError(error);
// //       throw new Error(`Perplexity streaming error: ${error.response?.data?.error?.message || error.message}`);
// //     }
// //   }

// //   async callXAI(provider, model, prompt, systemPrompt) {
// //     // Implement xAI API call
// //     throw new Error("xAI implementation not yet available")
// //   }

// //   async callXAIStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError) {
// //     // Implement xAI streaming
// //     throw new Error("xAI streaming implementation not yet available")
// //   }

// //   async callGroq(provider, model, prompt, systemPrompt) {
// //     // Implement Groq API call
// //     throw new Error("Groq implementation not yet available")
// //   }

// //   async callGroqStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError) {
// //     // Implement Groq streaming
// //     throw new Error("Groq streaming implementation not yet available")
// //   }

// //   async callGoogle(provider, model, prompt, systemPrompt) {
// //     // Implement Google API call
// //     throw new Error("Google implementation not yet available")
// //   }

// //   async callGoogleStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError) {
// //     // Implement Google streaming
// //     throw new Error("Google streaming implementation not yet available")
// //   }

// //   async updateUsageStats(providerId, modelId, tokensUsed) {
// //     try {
// //       // Update provider stats
// //       await AIProvider.findByIdAndUpdate(providerId, {
// //         $inc: {
// //           "usage_stats.total_requests": 1,
// //           "usage_stats.total_tokens": tokensUsed,
// //         },
// //         "usage_stats.last_used": new Date(),
// //       })

// //       // Update model stats
// //       await AIModel.findByIdAndUpdate(modelId, {
// //         $inc: {
// //           "usage_stats.total_requests": 1,
// //           "usage_stats.total_tokens": tokensUsed,
// //         },
// //         "usage_stats.last_used": new Date(),
// //       })
// //     } catch (error) {
// //       console.error("Error updating usage stats:", error)
// //     }
// //   }

// //   async refreshProviders() {
// //     await this.loadProvidersAndModels()
// //   }
// // }

// // // Create singleton instance
// // const aiService = new AIService()

// // // Export both streaming and non-streaming functions
// // const generateAIResponse = async (prompt, systemPrompt, modelId) => {
// //   return await aiService.generateResponse(prompt, systemPrompt, modelId)
// // }

// // const generateStreamingAIResponse = async (prompt, systemPrompt, modelId, onChunk, onComplete, onError) => {
// //   return await aiService.generateStreamingResponse(prompt, systemPrompt, modelId, onChunk, onComplete, onError)
// // }

// // module.exports = {
// //   generateAIResponse,
// //   generateStreamingAIResponse,
// //   aiService,
// // }
// const axios = require("axios")
// const AIProvider = require("../models/AIProvider")
// const AIModel = require("../models/AIModel")
// const FormData = require("form-data")

// class AIService {
//   constructor() {
//     this.providers = new Map()
//     this.models = new Map()
//     this.loadProvidersAndModels()
//   }

//   async loadProvidersAndModels() {
//     try {
//       // Load providers
//       const providers = await AIProvider.find({ is_active: true }).select("+api_key")
//       providers.forEach((provider) => {
//         this.providers.set(provider.name, provider)
//       })

//       // Load models with their providers
//       const models = await AIModel.find({ is_active: true }).populate("ai_provider_id", "+api_key")

//       models.forEach((model) => {
//         if (model.ai_provider_id && model.ai_provider_id.is_active) {
//           const key = `${model.ai_provider_id.name}:${model.model}`
//           this.models.set(key, {
//             ...model.toObject(),
//             provider: model.ai_provider_id,
//           })
//         }
//       })
//     } catch (error) {
//       console.error("Error loading AI providers and models:", error)
//     }
//   }

//   // Get model by provider and model name
//   getModel(providerName, modelName) {
//     const key = `${providerName}:${modelName}`
//     return this.models.get(key)
//   }

//   // Get all models for a provider
//   getModelsByProvider(providerName) {
//     const models = []
//     for (const [key, model] of this.models.entries()) {
//       if (key.startsWith(`${providerName}:`)) {
//         models.push(model)
//       }
//     }
//     return models
//   }

//   // Get default model for a provider
//   getDefaultModel(providerName) {
//     const models = this.getModelsByProvider(providerName)
//     return models.length > 0 ? models[0] : null
//   }

//   // Original non-streaming method (updated to use models)
//   async generateResponse(prompt, systemPrompt, modelId, imageUrl = null) {
//     try {
//       let model = null

//       // If modelId is provided, try to find the specific model
//       if (modelId) {
//         model = await AIModel.findById(modelId).populate("ai_provider_id", "+api_key")
//         if (!model || !model.is_active || !model.ai_provider_id.is_active) {
//           model = null
//         }
//       }

//       // Fallback to any available model
//       if (!model) {
//         const availableModels = await AIModel.find({ is_active: true }).populate("ai_provider_id", "+api_key")

//         model = availableModels.find((m) => m.ai_provider_id && m.ai_provider_id.is_active)
//       }

//       if (!model) {
//         throw new Error("No active AI models available")
//       }

//       const response = await this.callProvider(model, prompt, systemPrompt, imageUrl)

//       await this.updateUsageStats(model.ai_provider_id._id, model._id, response.tokens_used)

//       return {
//         response: response.text,
//         provider: model.ai_provider_id.name,
//         model: model.model,
//         tokens_used: response.tokens_used,
//       }
//     } catch (error) {
//       console.error("AI generation error:", error)
//       throw error
//     }
//   }

//   // New streaming method (updated to use models)
//   async generateStreamingResponse(prompt, systemPrompt, modelId, onChunk, onComplete, onError, imageUrl = null) {
//     try {
//       let model = null

//       // If modelId is provided, try to find the specific model
//       if (modelId) {
//         model = await AIModel.findById(modelId).populate("ai_provider_id", "+api_key")
//         if (!model || !model.is_active || !model.ai_provider_id.is_active) {
//           model = null
//         }
//       }

//       // Fallback to any available model
//       if (!model) {
//         const availableModels = await AIModel.find({ is_active: true }).populate("ai_provider_id", "+api_key")

//         model = availableModels.find((m) => m.ai_provider_id && m.ai_provider_id.is_active)
//       }

//       if (!model) {
//         throw new Error("No active AI models available")
//       }

//       await this.callProviderStreaming(model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl)
//     } catch (error) {
//       console.error("AI streaming error:", error)
//       if (onError) onError(error)
//       throw error
//     }
//   }

//   async callProvider(model, prompt, systemPrompt, imageUrl = null) {
//     const provider = model.ai_provider_id

//     switch (provider.name) {
//       case "openai":
//         return await this.callOpenAI(provider, model, prompt, systemPrompt, imageUrl)
//       case "deepseek":
//         return await this.callDeepSeek(provider, model, prompt, systemPrompt, imageUrl)
//       case "anthropic":
//         return await this.callAnthropic(provider, model, prompt, systemPrompt, imageUrl)
//       case "perplexity":
//         return await this.callPerplexity(provider, model, prompt, systemPrompt, imageUrl)
//       case "xai":
//         return await this.callXAI(provider, model, prompt, systemPrompt, imageUrl)
//       case "groq":
//         return await this.callGroq(provider, model, prompt, systemPrompt, imageUrl)
//       case "google":
//         return await this.callGoogle(provider, model, prompt, systemPrompt, imageUrl)
//       default:
//         throw new Error(`Unsupported provider: ${provider.name}`)
//     }
//   }

//   async callProviderStreaming(model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl = null) {
//     const provider = model.ai_provider_id

//     switch (provider.name) {
//       case "openai":
//         return await this.callOpenAIStreaming(
//           provider,
//           model,
//           prompt,
//           systemPrompt,
//           onChunk,
//           onComplete,
//           onError,
//           imageUrl,
//         )
//       case "deepseek":
//         return await this.callDeepSeekStreaming(
//           provider,
//           model,
//           prompt,
//           systemPrompt,
//           onChunk,
//           onComplete,
//           onError,
//           imageUrl,
//         )
//       case "anthropic":
//         return await this.callAnthropicStreaming(
//           provider,
//           model,
//           prompt,
//           systemPrompt,
//           onChunk,
//           onComplete,
//           onError,
//           imageUrl,
//         )
//       case "perplexity":
//         return await this.callPerplexityStreaming(
//           provider,
//           model,
//           prompt,
//           systemPrompt,
//           onChunk,
//           onComplete,
//           onError,
//           imageUrl,
//         )
//       case "xai":
//         return await this.callXAIStreaming(
//           provider,
//           model,
//           prompt,
//           systemPrompt,
//           onChunk,
//           onComplete,
//           onError,
//           imageUrl,
//         )
//       case "groq":
//         return await this.callGroqStreaming(
//           provider,
//           model,
//           prompt,
//           systemPrompt,
//           onChunk,
//           onComplete,
//           onError,
//           imageUrl,
//         )
//       case "google":
//         return await this.callGoogleStreaming(
//           provider,
//           model,
//           prompt,
//           systemPrompt,
//           onChunk,
//           onComplete,
//           onError,
//           imageUrl,
//         )
//       default:
//         throw new Error(`Unsupported provider: ${provider.name}`)
//     }
//   }

//   async generateCoreImage(prompt, imageFile) {
//     try {
//       const formData = new FormData()
//       formData.append("prompt", prompt)
//       formData.append("output_format", "png")
//       formData.append("width", "512")
//       formData.append("height", "512")
//       formData.append("samples", "1")
//       if (imageFile) {
//         formData.append("image", imageFile.buffer, {
//           filename: imageFile.originalname,
//           contentType: imageFile.mimetype,
//         })
//       }
//       const response = await axios.post("https://api.stability.ai/v2beta/stable-image/generate/core", formData, {
//         headers: {
//           Authorization: `Bearer \${process.env.STABILITY_API_KEY}`,
//           Accept: "image/*",
//           "Content-Type": "multipart/form-data",
//         },
//         responseType: "arraybuffer",
//       })
//       console.log(response.data)
//       return response.data
//     } catch (error) {
//       console.error("Stability AI image generation error:", error.response?.data || error.message)
//       throw new Error(`Stability AI image generation error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   async generateUltraImage(prompt, imageFile) {
//     try {
//       const formData = new FormData()
//       formData.append("prompt", prompt)
//       formData.append("output_format", "png")
//       formData.append("width", "512")
//       formData.append("height", "512")
//       formData.append("samples", "1")
//       formData.append("strength", "0.35")
//       if (imageFile) {
//         formData.append("image", imageFile.buffer, {
//           filename: imageFile.originalname,
//           contentType: imageFile.mimetype,
//         })
//       }
//       const response = await axios.post("https://api.stability.ai/v2beta/stable-image/generate/ultra", formData, {
//         headers: {
//           Authorization: `Bearer \${process.env.STABILITY_API_KEY}`,
//           Accept: "image/*",
//           "Content-Type": "multipart/form-data",
//         },
//         responseType: "arraybuffer",
//       })
//       console.log(response.data)
//       return response.data
//     } catch (error) {
//       console.error("Stability AI image generation error:", error.response?.data || error.message)
//       throw new Error(`Stability AI image generation error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   // OpenAI implementation with image support
//   async callOpenAI(provider, model, prompt, systemPrompt, imageUrl = null) {
//     try {
//       const messages = [{ role: "system", content: systemPrompt }]

//       // Build user message with optional image
//       const userMessage = { role: "user", content: [] }

//       // Add text content
//       userMessage.content.push({
//         type: "text",
//         text: prompt,
//       })

//       // Add image if provided
//       if (imageUrl) {
//         userMessage.content.push({
//           type: "image_url",
//           image_url: {
//             url: imageUrl,
//           },
//         })
//       }

//       // If no image, use simple string format for backward compatibility
//       if (!imageUrl) {
//         userMessage.content = prompt
//       }

//       messages.push(userMessage)

//       const response = await axios.post(
//         `${provider.base_url}/chat/completions`,
//         {
//           model: model.model,
//           messages: messages,
//           max_tokens: provider.max_tokens,
//           temperature: 0.7,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${provider.api_key}`,
//             "Content-Type": "application/json",
//           },
//         },
//       )

//       return {
//         text: response.data.choices[0].message.content,
//         tokens_used: response.data.usage.total_tokens,
//       }
//     } catch (error) {
//       console.error("OpenAI API error:", error.response?.data || error.message)
//       throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   async callOpenAIStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl = null) {
//     try {
//       const messages = [{ role: "system", content: systemPrompt }]

//       // Build user message with optional image
//       const userMessage = { role: "user", content: [] }

//       // Add text content
//       userMessage.content.push({
//         type: "text",
//         text: prompt,
//       })

//       // Add image if provided
//       if (imageUrl) {
//         userMessage.content.push({
//           type: "image_url",
//           image_url: {
//             url: imageUrl,
//           },
//         })
//       }

//       // If no image, use simple string format for backward compatibility
//       if (!imageUrl) {
//         userMessage.content = prompt
//       }

//       messages.push(userMessage)

//       const response = await axios.post(
//         `${provider.base_url}/chat/completions`,
//         {
//           model: model.model,
//           messages: messages,
//           max_tokens: provider.max_tokens,
//           temperature: 0.7,
//           stream: true,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${provider.api_key}`,
//             "Content-Type": "application/json",
//           },
//           responseType: "stream",
//         },
//       )

//       let fullResponse = ""
//       let totalTokens = 0

//       response.data.on("data", (chunk) => {
//         const lines = chunk
//           .toString()
//           .split("\n")
//           .filter((line) => line.trim() !== "")

//         for (const line of lines) {
//           if (line.includes("[DONE]")) {
//             if (onComplete) {
//               onComplete({
//                 fullResponse,
//                 provider: provider.name,
//                 model: model.model,
//                 tokens_used: totalTokens || 1,
//               })
//             }
//             return
//           }

//           if (line.startsWith("data: ")) {
//             try {
//               const data = JSON.parse(line.slice(6))

//               if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
//                 const content = data.choices[0].delta.content
//                 fullResponse += content

//                 if (onChunk) {
//                   onChunk({
//                     content,
//                     fullResponse,
//                     provider: provider.name,
//                     model: model.model,
//                   })
//                 }
//               }

//               if (data.usage) {
//                 totalTokens = data.usage.total_tokens
//               }
//             } catch (parseError) {
//               console.error("Error parsing streaming data:", parseError)
//             }
//           }
//         }
//       })

//       response.data.on("end", () => {
//         if (onComplete) {
//           onComplete({
//             fullResponse,
//             provider: provider.name,
//             model: model.model,
//             tokens_used: totalTokens || 1,
//           })
//         }
//       })

//       response.data.on("error", (error) => {
//         console.error("Stream error:", error)
//         if (onError) onError(error)
//       })
//     } catch (error) {
//       console.error("OpenAI streaming error:", error.response?.data || error.message)
//       if (onError) onError(error)
//       throw new Error(`OpenAI streaming error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   // DeepSeek implementation with image support
//   async callDeepSeek(provider, model, prompt, systemPrompt, imageUrl = null) {
//     try {
//       const messages = [{ role: "system", content: systemPrompt }]

//       // Build user message with optional image
//       const userMessage = { role: "user", content: [] }

//       // Add text content
//       userMessage.content.push({
//         type: "text",
//         text: prompt,
//       })

//       // Add image if provided
//       if (imageUrl) {
//         userMessage.content.push({
//           type: "image_url",
//           image_url: {
//             url: imageUrl,
//           },
//         })
//       }

//       // If no image, use simple string format for backward compatibility
//       if (!imageUrl) {
//         userMessage.content = prompt
//       }

//       messages.push(userMessage)

//       const response = await axios.post(
//         `${provider.base_url}/chat/completions`,
//         {
//           model: model.model,
//           messages: messages,
//           max_tokens: provider.max_tokens,
//           temperature: 0.7,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${provider.api_key}`,
//             "Content-Type": "application/json",
//           },
//         },
//       )

//       return {
//         text: response.data.choices[0].message.content,
//         tokens_used: response.data.usage?.total_tokens || 1,
//       }
//     } catch (error) {
//       console.error("DeepSeek API error:", error.response?.data || error.message)
//       throw new Error(`DeepSeek API error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   async callDeepSeekStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl = null) {
//     try {
//       const messages = [{ role: "system", content: systemPrompt }]

//       // Build user message with optional image
//       const userMessage = { role: "user", content: [] }

//       // Add text content
//       userMessage.content.push({
//         type: "text",
//         text: prompt,
//       })

//       // Add image if provided
//       if (imageUrl) {
//         userMessage.content.push({
//           type: "image_url",
//           image_url: {
//             url: imageUrl,
//           },
//         })
//       }

//       // If no image, use simple string format for backward compatibility
//       if (!imageUrl) {
//         userMessage.content = prompt
//       }

//       messages.push(userMessage)

//       const response = await axios.post(
//         `${provider.base_url}/chat/completions`,
//         {
//           model: model.model,
//           messages: messages,
//           max_tokens: provider.max_tokens,
//           temperature: 0.7,
//           stream: true,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${provider.api_key}`,
//             "Content-Type": "application/json",
//           },
//           responseType: "stream",
//         },
//       )

//       let fullResponse = ""
//       let totalTokens = 0

//       response.data.on("data", (chunk) => {
//         const lines = chunk
//           .toString()
//           .split("\n")
//           .filter((line) => line.trim() !== "")

//         for (const line of lines) {
//           if (line.includes("[DONE]")) {
//             if (onComplete) {
//               onComplete({
//                 fullResponse,
//                 provider: provider.name,
//                 model: model.model,
//                 tokens_used: totalTokens || 1,
//               })
//             }
//             return
//           }

//           if (line.startsWith("data: ")) {
//             try {
//               const data = JSON.parse(line.slice(6))

//               if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
//                 const content = data.choices[0].delta.content
//                 fullResponse += content

//                 if (onChunk) {
//                   onChunk({
//                     content,
//                     fullResponse,
//                     provider: provider.name,
//                     model: model.model,
//                   })
//                 }
//               }

//               if (data.usage) {
//                 totalTokens = data.usage.total_tokens
//               }
//             } catch (parseError) {
//               console.error("Error parsing streaming data:", parseError)
//             }
//           }
//         }
//       })

//       response.data.on("end", () => {
//         if (onComplete) {
//           onComplete({
//             fullResponse,
//             provider: provider.name,
//             model: model.model,
//             tokens_used: totalTokens || 1,
//           })
//         }
//       })

//       response.data.on("error", (error) => {
//         console.error("Stream error:", error)
//         if (onError) onError(error)
//       })
//     } catch (error) {
//       console.error("DeepSeek streaming error:", error.response?.data || error.message)
//       if (onError) onError(error)
//       throw new Error(`DeepSeek streaming error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   // Anthropic implementation with image support
//   async callAnthropic(provider, model, prompt, systemPrompt, imageUrl = null) {
//     try {
//       const messages = []

//       // Build user message with optional image
//       const userMessage = { role: "user", content: [] }

//       // Add text content
//       userMessage.content.push({
//         type: "text",
//         text: prompt,
//       })

//       // Add image if provided
//       if (imageUrl) {
//         userMessage.content.push({
//           type: "image",
//           source: {
//             type: "url",
//             url: imageUrl,
//           },
//         })
//       }

//       // If no image, use simple string format for backward compatibility
//       if (!imageUrl) {
//         userMessage.content = prompt
//       }

//       messages.push(userMessage)

//       const response = await axios.post(
//         `${provider.base_url}/v1/messages`,
//         {
//           model: model.model,
//           max_tokens: Math.min(provider.max_tokens, 4096),
//           temperature: 0.7,
//           system: systemPrompt || "",
//           messages: messages,
//         },
//         {
//           headers: {
//             "x-api-key": provider.api_key,
//             "Content-Type": "application/json",
//             "anthropic-version": "2023-06-01",
//           },
//         },
//       )

//       return {
//         text: response.data.content?.[0]?.text || "",
//         tokens_used: response.data.usage?.input_tokens + response.data.usage?.output_tokens || 1,
//       }
//     } catch (error) {
//       console.error("Anthropic API error:", error.response?.data || error.message)
//       throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   async callAnthropicStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl = null) {
//     try {
//       const messages = []

//       // Build user message with optional image
//       const userMessage = { role: "user", content: [] }

//       // Add text content
//       userMessage.content.push({
//         type: "text",
//         text: prompt,
//       })

//       // Add image if provided
//       if (imageUrl) {
//         userMessage.content.push({
//           type: "image",
//           source: {
//             type: "url",
//             url: imageUrl,
//           },
//         })
//       }

//       // If no image, use simple string format for backward compatibility
//       if (!imageUrl) {
//         userMessage.content = prompt
//       }

//       messages.push(userMessage)

//       const response = await axios.post(
//         `${provider.base_url}/v1/messages`,
//         {
//           model: model.model,
//           max_tokens: Math.min(provider.max_tokens, 4096),
//           temperature: 0.7,
//           system: systemPrompt || "",
//           messages: messages,
//           stream: true,
//         },
//         {
//           headers: {
//             "x-api-key": provider.api_key,
//             "Content-Type": "application/json",
//             "anthropic-version": "2023-06-01",
//           },
//           responseType: "stream",
//         },
//       )

//       let fullResponse = ""
//       let totalTokens = 0
//       let buffer = ""

//       response.data.on("data", (chunk) => {
//         buffer += chunk.toString()
//         const lines = buffer.split("\n")
//         buffer = lines.pop()

//         for (const line of lines) {
//           if (line.trim() === "" || !line.startsWith("data: ")) continue
//           const dataStr = line.slice(6)
//           if (dataStr === "[DONE]") {
//             if (onComplete) {
//               onComplete({
//                 fullResponse,
//                 provider: provider.name,
//                 model: model.model,
//                 tokens_used: totalTokens || 1,
//               })
//             }
//             return
//           }
//           try {
//             const data = JSON.parse(dataStr)

//             if (data.type === "content_block_delta" && data.delta?.text) {
//               const content = data.delta.text
//               fullResponse += content

//               if (onChunk) {
//                 onChunk({
//                   content,
//                   fullResponse,
//                   provider: provider.name,
//                   model: model.model,
//                 })
//               }
//             }

//             if (data.usage) {
//               totalTokens = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
//             }
//           } catch (parseError) {
//             if (dataStr.trim().endsWith("}")) {
//               console.error("Error parsing streaming data:", parseError)
//             }
//           }
//         }
//       })

//       response.data.on("end", () => {
//         if (onComplete) {
//           onComplete({
//             fullResponse,
//             provider: provider.name,
//             model: model.model,
//             tokens_used: totalTokens || 1,
//           })
//         }
//       })

//       response.data.on("error", (error) => {
//         console.error("Stream error:", error)
//         if (onError) onError(error)
//       })
//     } catch (error) {
//       console.error("Anthropic streaming error:", error.response?.data || error.message)
//       if (onError) onError(error)
//       throw new Error(`Anthropic streaming error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   // Perplexity implementation (images not typically supported, but keeping structure consistent)
//   async callPerplexity(provider, model, prompt, systemPrompt, imageUrl = null) {
//     try {
//       const response = await axios.post(
//         `${provider.base_url}/chat/completions`,
//         {
//           model: model.model,
//           messages: [
//             { role: "system", content: systemPrompt },
//             { role: "user", content: prompt },
//           ],
//           max_tokens: provider.max_tokens,
//           temperature: 0.7,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${provider.api_key}`,
//             "Content-Type": "application/json",
//           },
//         },
//       )

//       return {
//         text: response.data.choices[0].message.content,
//         tokens_used: response.data.usage?.total_tokens || 1,
//       }
//     } catch (error) {
//       console.error("Perplexity API error:", error.response?.data || error.message)
//       throw new Error(`Perplexity API error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   // async callPerplexityStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl = null) {
//   //   try {
//   //     const response = await axios.post(
//   //       `${provider.base_url}/chat/completions`,
//   //       {
//   //         model: model.model,
//   //         messages: [
//   //           { role: "system", content: systemPrompt },
//   //           { role: "user", content: prompt },
//   //         ],
//   //         max_tokens: provider.max_tokens,
//   //         temperature: 0.7,
//   //         stream: true,
//   //       },
//   //       {
//   //         headers: {
//   //           Authorization: `Bearer ${provider.api_key}`,
//   //           "Content-Type": "application/json",
//   //         },
//   //         responseType: "stream",
//   //       },
//   //     )

//   //     let fullResponse = ""
//   //     let totalTokens = 0
//   //     let buffer = ""
//   //     let wordCount = 0
//   //     const WORD_LIMIT = 1500
//   //     let limitReached = false

//   //     response.data.on("data", (chunk) => {
//   //       if (limitReached) return

//   //       buffer += chunk.toString()
//   //       const lines = buffer.split("\n")
//   //       buffer = lines.pop()

//   //       for (const line of lines) {
//   //         if (line.trim() === "" || !line.startsWith("data: ")) continue
//   //         const dataStr = line.slice(6)
//   //         if (dataStr === "[DONE]") {
//   //           if (onComplete) {
//   //             onComplete({
//   //               fullResponse,
//   //               provider: provider.name,
//   //               model: model.model,
//   //               tokens_used: totalTokens || 1,
//   //             })
//   //           }
//   //           return
//   //         }
//   //         try {
//   //           const data = JSON.parse(dataStr)

//   //           if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
//   //             const content = data.choices[0].delta.content

//   //             if (!limitReached) {
//   //               const combined = fullResponse + content
//   //               const words = combined.trim().split(/\s+/)
//   //               if (words.length > WORD_LIMIT) {
//   //                 const allowedWords = words.slice(0, WORD_LIMIT)
//   //                 fullResponse = allowedWords.join(" ")
//   //                 limitReached = true

//   //                 if (onChunk) {
//   //                   onChunk({
//   //                     content: "",
//   //                     fullResponse,
//   //                     provider: provider.name,
//   //                     model: model.model,
//   //                   })
//   //                 }
//   //                 if (onComplete) {
//   //                   onComplete({
//   //                     fullResponse,
//   //                     provider: provider.name,
//   //                     model: model.model,
//   //                     tokens_used: totalTokens || 1,
//   //                   })
//   //                 }
//   //                 response.data.destroy()
//   //                 return
//   //               } else {
//   //                 fullResponse = combined
//   //                 wordCount = words.length
//   //                 if (onChunk) {
//   //                   onChunk({
//   //                     content,
//   //                     fullResponse,
//   //                     provider: provider.name,
//   //                     model: model.model,
//   //                   })
//   //                 }
//   //               }
//   //             }
//   //           }

//   //           if (data.usage) {
//   //             totalTokens = data.usage.total_tokens
//   //           }
//   //         } catch (parseError) {
//   //           if (dataStr.trim().endsWith("}")) {
//   //             console.error("Error parsing streaming data:", parseError)
//   //           }
//   //         }
//   //       }
//   //     })

//   //     response.data.on("end", () => {
//   //       if (!limitReached && onComplete) {
//   //         onComplete({
//   //           fullResponse,
//   //           provider: provider.name,
//   //           model: model.model,
//   //           tokens_used: totalTokens || 1,
//   //         })
//   //       }
//   //     })

//   //     response.data.on("error", (error) => {
//   //       console.error("Stream error:", error)
//   //       if (onError) onError(error)
//   //     })
//   //   } catch (error) {
//   //     console.error("Perplexity streaming error:", error.response?.data || error.message)
//   //     if (onError) onError(error)
//   //     throw new Error(`Perplexity streaming error: ${error.response?.data?.error?.message || error.message}`)
//   //   }
//   // }
//   async callPerplexityStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl = null) {
//     try {
//       const response = await axios.post(
//         `${provider.base_url}/chat/completions`,
//         {
//           model: model.model,
//           messages: [
//             { role: "system", content: systemPrompt },
//             { role: "user", content: prompt },
//           ],
//           max_tokens: provider.max_tokens,
//           temperature: 0.7,
//           stream: true,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${provider.api_key}`,
//             "Content-Type": "application/json",
//           },
//           responseType: "stream",
//         },
//       )

//       let fullResponse = ""
//       let totalTokens = 0
//       let buffer = ""
//       let searchResultsSent = false
//       let searchResults = null

//       response.data.on("data", (chunk) => {
//         buffer += chunk.toString()
//         const lines = buffer.split("\n")
//         buffer = lines.pop()

//         for (const line of lines) {
//           if (line.trim() === "" || !line.startsWith("data: ")) continue
//           const dataStr = line.slice(6)
//           if (dataStr === "[DONE]") {
//             if (onComplete) {
//               onComplete({
//                 fullResponse,
//                 provider: provider.name,
//                 model: model.model,
//                 tokens_used: totalTokens || 1,
//                 search_results: searchResults,
//               })
//             }
//             return
//           }
//           try {
//             const data = JSON.parse(dataStr)

//             // Extract search_results from the first chunk
//             if (!searchResultsSent && data.search_results) {
//               searchResults = data.search_results
//               searchResultsSent = true
//               // Optionally send as a separate event
//               if (onChunk) {
//                 onChunk({
//                   type: "search_results",
//                   search_results: searchResults,
//                 })
//               }
//             }

//             if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
//               const content = data.choices[0].delta.content
//               fullResponse += content

//               if (onChunk) {
//                 onChunk({
//                   content,
//                   fullResponse,
//                   provider: provider.name,
//                   model: model.model,
//                 })
//               }
//             }

//             if (data.usage) {
//               totalTokens = data.usage.total_tokens
//             }
//           } catch (parseError) {
//             if (dataStr.trim().endsWith("}")) {
//               console.error("Error parsing streaming data:", parseError)
//             }
//           }
//         }
//       })

//       response.data.on("end", () => {
//         if (onComplete) {
//           onComplete({
//             fullResponse,
//             provider: provider.name,
//             model: model.model,
//             tokens_used: totalTokens || 1,
//             search_results: searchResults,
//           })
//         }
//       })

//       response.data.on("error", (error) => {
//         console.error("Stream error:", error)
//         if (onError) onError(error)
//       })
//     } catch (error) {
//       console.error("Perplexity streaming error:", error.response?.data || error.message)
//       if (onError) onError(error)
//       throw new Error(`Perplexity streaming error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   // Placeholder implementations for other providers
//   async callXAI(provider, model, prompt, systemPrompt, imageUrl = null) {
//     try {
//       // Grok API expects a similar structure to OpenAI, but with its own endpoint and headers.
//       // See: https://developer.x.ai/docs/api-reference/chat-completions/create
//       const messages = [{ role: "system", content: systemPrompt }]
//       const userMessage = { role: "user", content: [] }

//       // Add text content
//       userMessage.content.push({
//         type: "text",
//         text: prompt,
//       })

//       // Add image if provided (Grok supports image_url type)
//       if (imageUrl) {
//         userMessage.content.push({
//           type: "image_url",
//           image_url: {
//             url: imageUrl,
//           },
//         })
//       }

//       // If no image, use simple string format for backward compatibility
//       if (!imageUrl) {
//         userMessage.content = prompt
//       }

//       messages.push(userMessage)

//       const response = await axios.post(
//         `${provider.base_url}/v1/chat/completions`,
//         {
//           model: model.model,
//           messages: messages,
//           max_tokens: provider.max_tokens,
//           temperature: 0.7,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${provider.api_key}`,
//             "Content-Type": "application/json",
//           },
//         },
//       )

//       return {
//         text: response.data.choices[0].message.content,
//         tokens_used: response.data.usage?.total_tokens || 1,
//       }
//     } catch (error) {
//       console.error("xAI (Grok) API error:", error.response?.data || error.message)
//       throw new Error(`xAI (Grok) API error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   async callXAIStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl = null) {
//     try {
//       const messages = [{ role: "system", content: systemPrompt }]
//       const userMessage = { role: "user", content: [] }

//       userMessage.content.push({
//         type: "text",
//         text: prompt,
//       })

//       if (imageUrl) {
//         userMessage.content.push({
//           type: "image_url",
//           image_url: {
//             url: imageUrl,
//           },
//         })
//       }

//       if (!imageUrl) {
//         userMessage.content = prompt
//       }

//       messages.push(userMessage)

//       const response = await axios.post(
//         `${provider.base_url}/v1/chat/completions`,
//         {
//           model: model.model,
//           messages: messages,
//           max_tokens: provider.max_tokens,
//           temperature: 0.7,
//           stream: true,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${provider.api_key}`,
//             "Content-Type": "application/json",
//           },
//           responseType: "stream",
//         },
//       )

//       let fullResponse = ""
//       let totalTokens = 0

//       response.data.on("data", (chunk) => {
//         const lines = chunk
//           .toString()
//           .split("\n")
//           .filter((line) => line.trim() !== "")

//         for (const line of lines) {
//           if (line.includes("[DONE]")) {
//             if (onComplete) {
//               onComplete({
//                 fullResponse,
//                 provider: provider.name,
//                 model: model.model,
//                 tokens_used: totalTokens || 1,
//               })
//             }
//             return
//           }

//           if (line.startsWith("data: ")) {
//             try {
//               const data = JSON.parse(line.slice(6))

//               if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
//                 const content = data.choices[0].delta.content
//                 fullResponse += content

//                 if (onChunk) {
//                   onChunk({
//                     content,
//                     fullResponse,
//                     provider: provider.name,
//                     model: model.model,
//                   })
//                 }
//               }

//               if (data.usage) {
//                 totalTokens = data.usage.total_tokens
//               }
//             } catch (parseError) {
//               console.error("Error parsing xAI streaming data:", parseError)
//             }
//           }
//         }
//       })

//       response.data.on("end", () => {
//         if (onComplete) {
//           onComplete({
//             fullResponse,
//             provider: provider.name,
//             model: model.model,
//             tokens_used: totalTokens || 1,
//           })
//         }
//       })

//       response.data.on("error", (error) => {
//         console.error("xAI Stream error:", error)
//         if (onError) onError(error)
//       })
//     } catch (error) {
//       console.error("xAI streaming error:", error.response?.data || error.message)
//       if (onError) onError(error)
//       throw new Error(`xAI streaming error: ${error.response?.data?.error?.message || error.message}`)
//     }
//   }

//   async callGroq(provider, model, prompt, systemPrompt, imageUrl = null) {
//     throw new Error("Groq implementation not yet available")
//   }

//   async callGroqStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl = null) {
//     throw new Error("Groq streaming implementation not yet available")
//   }

//   async callGoogle(provider, model, prompt, systemPrompt, imageUrl = null) {
//     throw new Error("Google implementation not yet available")
//   }

//   async callGoogleStreaming(provider, model, prompt, systemPrompt, onChunk, onComplete, onError, imageUrl = null) {
//     throw new Error("Google streaming implementation not yet available")
//   }

//   async updateUsageStats(providerId, modelId, tokensUsed) {
//     try {
//       // Update provider stats
//       await AIProvider.findByIdAndUpdate(providerId, {
//         $inc: {
//           "usage_stats.total_requests": 1,
//           "usage_stats.total_tokens": tokensUsed,
//         },
//         "usage_stats.last_used": new Date(),
//       })

//       // Update model stats
//       await AIModel.findByIdAndUpdate(modelId, {
//         $inc: {
//           "usage_stats.total_requests": 1,
//           "usage_stats.total_tokens": tokensUsed,
//         },
//         "usage_stats.last_used": new Date(),
//       })
//     } catch (error) {
//       console.error("Error updating usage stats:", error)
//     }
//   }

//   async refreshProviders() {
//     await this.loadProvidersAndModels()
//   }
// }

// // Create singleton instance
// const aiService = new AIService()

// // Export both streaming and non-streaming functions
// const generateAIResponse = async (prompt, systemPrompt, modelId, imageUrl = null) => {
//   return await aiService.generateResponse(prompt, systemPrompt, modelId, imageUrl)
// }

// const generateStreamingAIResponse = async (
//   prompt,
//   systemPrompt,
//   modelId,
//   onChunk,
//   onComplete,
//   onError,
//   imageUrl = null,
// ) => {
//   return await aiService.generateStreamingResponse(
//     prompt,
//     systemPrompt,
//     modelId,
//     onChunk,
//     onComplete,
//     onError,
//     imageUrl,
//   )
// }

// module.exports = {
//   generateAIResponse,
//   generateStreamingAIResponse,
//   aiService,
// }
const axios = require("axios");
const AIProvider = require("../models/AIProvider");
const AIModel = require("../models/AIModel");
const FormData = require("form-data");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const jwt = require("jsonwebtoken");
const { GoogleAuth } = require("google-auth-library");
const crypto = require("crypto");

/**
 * Creates an anonymized HMAC-SHA256 hashed user identifier (safeUserId).
 * Passed to AI provider API requests (OpenAI 'user', Claude 'metadata.user_id')
 * to isolate bad actors and prevent company API key bans.
 *
 * @param {string} userId The original database user ID.
 * @returns {string|null} The 64-character HMAC-SHA256 hash or null if no userId.
 */
function getSafeUserId(userId) {
  if (!userId) return null;
  const secret = process.env.SAFETY_SECRET || "onechat_safety_secret_key_2026";
  return crypto
    .createHmac("sha256", secret)
    .update(String(userId))
    .digest("hex");
}

const aiClientCache = {};
const sanitizeText = (text) =>
  text
    .replace(/```.*?```/gs, "")
    .replace(/[*_~`#]/g, "")
    .replace(/Okay,.*?query\./, "")
    .trim();

const parseFalError = (error) => {
  let errorMessage = error.message;
  let code = "api_error";
  const statusCode = error.response?.status || 500;

  if (error.response?.data) {
    const data = error.response.data;
    if (data.detail) {
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        errorMessage = data.detail
          .map((d) => d.msg || d.message || JSON.stringify(d))
          .join(", ");
        code = data.detail[0].type || data.detail[0].code || code;
      } else if (typeof data.detail === "object") {
        errorMessage =
          data.detail.msg || data.detail.message || JSON.stringify(data.detail);
        code = data.detail.type || data.detail.code || code;
      } else {
        errorMessage = String(data.detail);
      }
    } else if (data.message) {
      errorMessage = String(data.message);
      code = data.type || data.code || code;
    }
  }

  const customError = new Error(errorMessage);
  customError.statusCode = statusCode;
  customError.code = code;
  return customError;
};

class AIService {
  constructor() {
    this.providers = new Map();
    this.models = new Map();
    this.loadProvidersAndModels();
  }

  async loadProvidersAndModels() {
    try {
      // Load providers
      const providers = await AIProvider.find({ is_active: true }).select(
        "+api_key",
      );
      providers.forEach((provider) => {
        this.providers.set(provider.name, provider);
      });

      // Load models with their providers
      const models = await AIModel.find({ is_active: true }).populate(
        "ai_provider_id",
        "+api_key",
      );

      models.forEach((model) => {
        if (model.ai_provider_id && model.ai_provider_id.is_active) {
          const key = `${model.ai_provider_id.name}:${model.model}`;
          this.models.set(key, {
            ...model.toObject(),
            provider: model.ai_provider_id,
          });
        }
      });
    } catch (error) {
      console.error("Error loading AI providers and models:", error);
    }
  }

  // Get model by provider and model name
  getModel(providerName, modelName) {
    const key = `${providerName}:${modelName}`;
    return this.models.get(key);
  }

  // Get all models for a provider
  getModelsByProvider(providerName) {
    const models = [];
    for (const [key, model] of this.models.entries()) {
      if (key.startsWith(`${providerName}:`)) {
        models.push(model);
      }
    }
    return models;
  }

  // Get default model for a provider
  getDefaultModel(providerName) {
    const models = this.getModelsByProvider(providerName);
    return models.length > 0 ? models[0] : null;
  }

  // Original non-streaming method (updated to use models)
  async generateResponse(prompt, systemPrompt, modelId, imageUrl = null) {
    try {
      let model = null;

      // If modelId is provided, try to find the specific model
      // 1. Check for C1 (Thesys) via Env Variables (Bypass DB)
      if (modelId === "c1" || modelId === "thesys") {
        if (!process.env.C1_API_KEY || !process.env.C1_BASE_URL) {
          throw new Error(
            "C1_API_KEY or C1_BASE_URL not found in environment variables",
          );
        }
        model = {
          _id: "c1-env-virtual-id",
          model: process.env.C1_MODEL_NAME || "c1/openai/gpt-5/v-20250930",
          is_active: true,
          ai_provider_id: {
            name: "c1", // This triggers the switch case 'c1'
            api_key: process.env.C1_API_KEY,
            base_url: process.env.C1_BASE_URL,
            is_active: true,
            max_tokens: 4096,
          },
        };
      }
      // 2. If not C1, try to find in DB
      else if (modelId) {
        model = await AIModel.findById(modelId).populate(
          "ai_provider_id",
          "+api_key",
        );
        if (!model || !model.is_active || !model.ai_provider_id.is_active) {
          model = null;
        }
      }

      // Fallback to any available model
      if (!model) {
        const availableModels = await AIModel.find({
          is_active: true,
        }).populate("ai_provider_id", "+api_key");

        model = availableModels.find(
          (m) => m.ai_provider_id && m.ai_provider_id.is_active,
        );
      }

      if (!model) {
        throw new Error("No active AI models available");
      }

      const response = await this.callProvider(
        model,
        prompt,
        systemPrompt,
        imageUrl,
      );

      await this.updateUsageStats(
        model.ai_provider_id._id,
        model._id,
        response.tokens_used,
      );

      return {
        response: response.text,
        provider: model.ai_provider_id.name,
        model: model.model,
        tokens_used: response.tokens_used,
      };
    } catch (error) {
      console.error("AI generation error:", error);
      throw error;
    }
  }

  // New streaming method (updated to use models)
  async generateStreamingResponse(
    prompt,
    systemPrompt,
    modelId,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      let model = null;

      // If modelId is provided, try to find the specific model
      if (modelId === "c1" || modelId === "thesys") {
        if (!process.env.C1_API_KEY || !process.env.C1_BASE_URL) {
          if (onError)
            onError(
              new Error(
                "C1_API_KEY or C1_BASE_URL not found in environment variables",
              ),
            );
          return;
        }
        model = {
          _id: "c1-env-virtual-id",
          model: process.env.C1_MODEL_NAME || "c1/openai/gpt-5/v-20250930",
          is_active: true,
          ai_provider_id: {
            name: "c1", // This triggers the switch case 'c1'
            api_key: process.env.C1_API_KEY,
            base_url: process.env.C1_BASE_URL,
            is_active: true,
            max_tokens: 4096,
          },
        };
      }
      // 2. If not C1, try to find in DB
      else if (modelId) {
        model = await AIModel.findById(modelId).populate(
          "ai_provider_id",
          "+api_key",
        );
        if (!model || !model.is_active || !model.ai_provider_id.is_active) {
          model = null;
        }
      }
      // Fallback to any available model
      if (!model) {
        const availableModels = await AIModel.find({
          is_active: true,
        }).populate("ai_provider_id", "+api_key");

        model = availableModels.find(
          (m) => m.ai_provider_id && m.ai_provider_id.is_active,
        );
      }

      if (!model) {
        throw new Error("No active AI models available");
      }

      await this.callProviderStreaming(
        model,
        prompt,
        systemPrompt,
        onChunk,
        onComplete,
        onError,
        imageUrl,
        max_tokens,
      );
    } catch (error) {
      console.error("AI streaming error:", error);
      if (onError) onError(error);
      throw error;
    }
  }

  async callProvider(model, prompt, systemPrompt, imageUrl = null) {
    const provider = model.ai_provider_id;

    switch (provider.name) {
      case "openai":
        return await this.callOpenAI(
          provider,
          model,
          prompt,
          systemPrompt,
          imageUrl,
        );
      case "c1":
      case "thesys":
        // ✅ Fixed: Only one case for C1 here, calling the non-streaming method
        return await this.callC1(
          provider,
          model,
          prompt,
          systemPrompt,
          imageUrl,
        );
      case "deepseek":
        return await this.callDeepSeek(
          provider,
          model,
          prompt,
          systemPrompt,
          imageUrl,
        );
      case "anthropic":
        return await this.callAnthropic(
          provider,
          model,
          prompt,
          systemPrompt,
          imageUrl,
        );
      case "perplexity":
        return await this.callPerplexity(
          provider,
          model,
          prompt,
          systemPrompt,
          imageUrl,
        );
      case "xai":
        return await this.callXAI(
          provider,
          model,
          prompt,
          systemPrompt,
          imageUrl,
        );
      case "groq":
        return await this.callGroq(
          provider,
          model,
          prompt,
          systemPrompt,
          imageUrl,
        );
      case "google":
        return await this.callGoogle(
          provider,
          model,
          prompt,
          systemPrompt,
          imageUrl,
        );
      case "meta":
        return await this.callMeta(
          provider,
          model,
          prompt,
          systemPrompt,
          imageUrl,
        );
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
    }
  }

  async callProviderStreaming(
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    const provider = model.ai_provider_id;

    if (model.model === "gpt-5.2") {
      return await this.callGPT52Streaming(
        provider,
        model,
        prompt,
        systemPrompt,
        onChunk,
        onComplete,
        onError,
      );
    }

    switch (provider.name) {
      case "openai":
        return await this.callOpenAIStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "c1":
      case "thesys":
        // ✅ Added: C1 case for streaming
        return await this.callC1Streaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "deepseek":
        return await this.callDeepSeekStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "anthropic":
        return await this.callAnthropicStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "perplexity":
        return await this.callPerplexityStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "xai":
        return await this.callXAIStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "groq":
        return await this.callGroqStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "google":
        return await this.callGoogleStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "meta":
        return await this.callMetaStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "kimi":
        return await this.callKimiStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "mistral":
        return await this.callMistralStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "qwen":
        return await this.callQwenStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk, // ✅ Added
          onComplete, // ✅ Added
          onError, // ✅ Added
          imageUrl,
          max_tokens, // ✅ Added
        );
      case "minimax":
        return await this.callMiniMaxStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "mimo":
        return await this.callMimoStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "glm":
        return await this.callGlmStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "nemotron":
        return await this.callNemotronStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      case "muse":
        return await this.callMuseStreaming(
          provider,
          model,
          prompt,
          systemPrompt,
          onChunk,
          onComplete,
          onError,
          imageUrl,
          max_tokens,
        );
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
    }
  }

  // =================================================================
  // C1 (Thesys) IMPLEMENTATION
  // =================================================================

  async callC1(provider, model, prompt, systemPrompt, imageUrl = null) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];

      const userMessage = { role: "user", content: [] };
      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: provider.max_tokens,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        text: response.data.choices[0].message.content,
        tokens_used: response.data.usage.total_tokens,
      };
    } catch (error) {
      console.error(
        "C1 (Thesys) API error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `C1 API error: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  async callC1Streaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = "";

      response.data.on("data", (chunk) => {
        const lines = chunk
          .toString()
          .split("\n")
          .filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (buffer && onChunk) {
              onChunk({
                content: buffer,
                fullResponse,
                provider: provider.name,
                model: model.model,
              });
            }
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta?.content;

              if (delta) {
                fullResponse += delta;
                buffer += delta;

                if (/[.!?]\s/.test(buffer) || buffer.length > 30) {
                  if (onChunk) {
                    onChunk({
                      content: buffer,
                      fullResponse,
                      provider: provider.name,
                      model: model.model,
                    });
                  }
                  buffer = "";
                }
              }

              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (err) {
              console.error("Error parsing C1 streaming data:", err);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (buffer && onChunk) {
          onChunk({
            content: buffer,
            fullResponse,
            provider: provider.name,
            model: model.model,
          });
        }
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("C1 Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "C1 streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `C1 streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async getAIClient(providerName) {
    // Return cached client if exists
    if (aiClientCache[providerName]) {
      return aiClientCache[providerName];
    }

    // Fetch provider from DB
    const provider = await AIProvider.findOne({
      name: providerName,
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error(`${providerName} API key not found in DB`);
    }

    let client;

    switch (providerName) {
      case "openai":
        client = new OpenAI({
          apiKey: provider.api_key,
          baseURL: provider.base_url || "https://api.openai.com/v1",
        });
        break;

      case "google":
        client = new GoogleGenerativeAI(provider.api_key);
        break;

      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }

    // Cache client
    aiClientCache[providerName] = client;
    return client;
  }

  async generateOpenAIImage(model, prompt, imageFile = null, ratio = "1:1") {
    // ✅ UPDATE: Allow standard, mini, 1.5, 2, and 2.5 models
    const supportedModels = [
      "gpt-image-1-mini",
      "gpt-image-1.5",
      "gpt-image-2",
      "gpt-image-2.5-flare",
      "gpt-image-2.5-sunburst",
    ];

    if (!supportedModels.includes(model)) {
      throw new Error(`Model ${model} is not supported by OpenAI integration`);
    }

    const openai = await this.getAIClient("openai");

    const sizeMap = {
      "1:1": "1024x1024",
      "2:3": "1024x1536",
      "3:2": "1536x1024",
      "4:5": "1024x1536",
      "5:4": "1536x1024",
      "9:16": "1024x1536",
      "16:9": "1536x1024",
      "21:9": "1536x1024",
      "9:21": "1024x1536",
    };

    const size = sizeMap[ratio] || "1024x1024";

    // ✅ IMAGE-TO-IMAGE MODE: Use images.edit() when an imageFile is provided
    if (imageFile) {
      console.log(
        `🖼️ OpenAI Image Edit mode: using uploaded image as reference for ${model}`,
      );

      // Fix MIME type if it is octet-stream
      let mimeType = imageFile.mimetype;
      if (!mimeType || mimeType === "application/octet-stream") {
        const ext = (imageFile.originalname || "")
          .split(".")
          .pop()
          .toLowerCase();
        if (ext === "png") {
          mimeType = "image/png";
        } else if (ext === "webp") {
          mimeType = "image/webp";
        } else {
          mimeType = "image/jpeg";
        }
        imageFile.mimetype = mimeType;
      }

      // OpenAI images.edit requires a File-like object with a name attribute
      const { toFile } = require("openai");
      const imageFileObj = await toFile(
        imageFile.buffer,
        imageFile.originalname || "image.png",
        { type: imageFile.mimetype || "image/png" },
      );

      const editResult = await openai.images.edit({
        model: model,
        image: imageFileObj,
        prompt,
        size,
      });

      // Check for URL response
      if (editResult.data && editResult.data[0] && editResult.data[0].url) {
        const imageUrl = editResult.data[0].url;
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
        });
        return Buffer.from(response.data);
      }

      // Fallback: b64_json
      if (
        editResult.data &&
        editResult.data[0] &&
        editResult.data[0].b64_json
      ) {
        return Buffer.from(editResult.data[0].b64_json, "base64");
      }

      throw new Error("No image URL or data returned from OpenAI edit API");
    }

    // ✅ TEXT-TO-IMAGE MODE (default when no imageFile)
    // Locked Policy: Use explicit Medium quality per OneChat AI image matrix
    const result = await openai.images.generate({
      model: model,
      prompt,
      size,
      quality: "medium",
    });

    // 2. Check for URL response (Default behavior)
    if (result.data && result.data[0] && result.data[0].url) {
      const imageUrl = result.data[0].url;

      // 3. Fetch the image from the URL to convert to Buffer
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      return Buffer.from(response.data);
    }

    // Fallback: Check if it actually returned b64_json despite the error (unlikely but possible in some APIs)
    if (result.data && result.data[0] && result.data[0].b64_json) {
      return Buffer.from(result.data[0].b64_json, "base64");
    }

    throw new Error("No image URL or data returned from API");
  }

  async generateNanoBananaImage(model, prompt, imageFile, ratio = "1:1") {
    // ✅ UPDATE: Dynamically map the requested model to the correct Gemini model string
    let geminiModel = "gemini-2.5-flash-image"; // Default fallback (Nano Banana)

    if (model === "nano-pro") {
      geminiModel = "gemini-3-pro-image-preview";
    } else if (
      model === "gemini-3.1-flash-image-preview" ||
      model === "nanobanana-2"
    ) {
      geminiModel = "gemini-3.1-flash-image-preview";
    } else if (model === "nano-banana-2-lite") {
      geminiModel = "gemini-2.5-flash-image";
    }

    const genAI = await this.getAIClient("google");

    const imageModel = genAI.getGenerativeModel({
      model: geminiModel,
    });

    // Gemini does not accept aspect_ratio directly
    const finalPrompt = `Aspect ratio ${ratio}. ${prompt}`;

    const parts = [{ text: finalPrompt }];

    if (imageFile) {
      let mimeType = imageFile.mimetype;
      if (
        mimeType === "application/octet-stream" ||
        !mimeType?.startsWith("image/")
      ) {
        const ext = imageFile.originalname?.split(".").pop()?.toLowerCase();
        if (ext === "png") {
          mimeType = "image/png";
        } else if (ext === "webp") {
          mimeType = "image/webp";
        } else if (ext === "gif") {
          mimeType = "image/gif";
        } else {
          mimeType = "image/jpeg"; // Default fallback
        }
      }

      parts.push({
        inlineData: {
          data: imageFile.buffer.toString("base64"),
          mimeType: mimeType,
        },
      });
    }

    const result = await imageModel.generateContent({
      contents: [{ role: "user", parts }],
    });

    // const imagePart = result.response.candidates[0].content.parts.find(
    //   (p) => p.inlineData,
    // );

    // 🔴 ERROR HANDLING 1: Check if Google blocked the prompt completely
    if (
      !result.response ||
      !result.response.candidates ||
      result.response.candidates.length === 0
    ) {
      const feedback = result.response?.promptFeedback;
      if (feedback && feedback.blockReason) {
        throw new Error(
          `Google AI policy blocked this generation request. Reason: ${feedback.blockReason}`,
        );
      }
      throw new Error(
        "Google AI blocked this request or returned an empty response due to strict safety filters.",
      );
    }

    const firstCandidate = result.response.candidates[0];

    // 🔴 ERROR HANDLING 2: Check if Google stopped mid-generation (e.g., face protection filter)
    if (!firstCandidate.content) {
      throw new Error(
        `Google AI generation stopped. Reason: ${firstCandidate.finishReason || "Safety Filter Triggered"}`,
      );
    }

    // 🔴 ERROR HANDLING 3: Verify that an actual image part was returned safely
    const imagePart = firstCandidate.content?.parts?.find((p) => p.inlineData);

    if (!imagePart) {
      // Find the text Gemini returned instead of the image
      const textPart = firstCandidate.content?.parts?.find((p) => p.text);
      const aiReply = textPart ? textPart.text : "Unknown text response";

      // Throw the exact reason back to the frontend
      throw new Error(`Google AI refused the filter. AI said: "${aiReply}"`);
    }

    // if (!imagePart) {
    //   throw new Error("No image returned from Gemini");
    // }

    return Buffer.from(imagePart.inlineData.data, "base64");
  }

  async generateNanoBananaEdit(prompt, imageFile, imageFile2 = null) {
    console.log("=== Starting generateNanoBananaEdit (Native Google Gemini) ===");
    if (!imageFile) {
      throw new Error("An input image is required for editing.");
    }

    const genAI = await this.getAIClient("google");
    const imageModel = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-image-preview",
    });

    const parts = [{ text: prompt.trim() }];

    let mimeType = imageFile.mimetype || "image/jpeg";
    if (
      mimeType === "application/octet-stream" ||
      !mimeType?.startsWith("image/")
    ) {
      const ext = imageFile.originalname?.split(".").pop()?.toLowerCase();
      if (ext === "png") {
        mimeType = "image/png";
      } else if (ext === "webp") {
        mimeType = "image/webp";
      } else if (ext === "gif") {
        mimeType = "image/gif";
      } else {
        mimeType = "image/jpeg";
      }
    }

    parts.push({
      inlineData: {
        data: imageFile.buffer.toString("base64"),
        mimeType: mimeType,
      },
    });

    if (imageFile2) {
      let mimeType2 = imageFile2.mimetype || "image/jpeg";
      if (
        mimeType2 === "application/octet-stream" ||
        !mimeType2?.startsWith("image/")
      ) {
        const ext2 = imageFile2.originalname?.split(".").pop()?.toLowerCase();
        if (ext2 === "png") {
          mimeType2 = "image/png";
        } else if (ext2 === "webp") {
          mimeType2 = "image/webp";
        } else if (ext2 === "gif") {
          mimeType2 = "image/gif";
        } else {
          mimeType2 = "image/jpeg";
        }
      }

      parts.push({
        inlineData: {
          data: imageFile2.buffer.toString("base64"),
          mimeType: mimeType2,
        },
      });
    }

    const result = await imageModel.generateContent({
      contents: [{ role: "user", parts }],
    });

    if (
      !result.response ||
      !result.response.candidates ||
      result.response.candidates.length === 0
    ) {
      const feedback = result.response?.promptFeedback;
      if (feedback && feedback.blockReason) {
        throw new Error(
          `Google AI policy blocked this edit request. Reason: ${feedback.blockReason}`,
        );
      }
      throw new Error(
        "Google AI blocked this request or returned an empty response due to safety filters.",
      );
    }

    const firstCandidate = result.response.candidates[0];
    if (!firstCandidate.content) {
      throw new Error(
        `Google AI generation stopped. Reason: ${firstCandidate.finishReason || "Safety Filter Triggered"}`,
      );
    }

    const imagePart = firstCandidate.content?.parts?.find((p) => p.inlineData);
    if (!imagePart) {
      const textPart = firstCandidate.content?.parts?.find((p) => p.text);
      const aiReply = textPart ? textPart.text : "Unknown text response";
      throw new Error(`Google AI refused the edit request. AI said: "${aiReply}"`);
    }

    return Buffer.from(imagePart.inlineData.data, "base64");
  }

  async generateFluxImage(model, prompt, imageFile, ratio = "1:1") {
    // 1. All supported Flux models
    const supportedModels = ["flux-2-pro", "flux-2-flex", "flux-2-max"];

    if (!supportedModels.includes(model)) {
      throw new Error(`Model ${model} is not supported by Flux integration`);
    }

    // 2. Get provider from DB
    const provider = await AIProvider.findOne({
      name: "flux",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error("Flux provider not configured");
    }

    // 3. DYNAMIC URL CONSTRUCTION
    let baseUrl = provider.base_url; // This is now "https://api.bfl.ai/v1"

    // Safety check: Remove trailing slash if it exists
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // This perfectly creates: https://api.bfl.ai/v1/flux.2-pro (or whichever model is passed)
    const endpoint = `${baseUrl}/${model}`;

    console.log(`🚀 Requesting Flux image from: ${endpoint}`);

    try {
      // ✅ BUILD PAYLOAD — include image_prompt as base64 data URI when imageFile provided
      const payload = {
        prompt: prompt,
        aspect_ratio: ratio,
      };

      if (imageFile) {
        console.log(
          `🖼️ Flux image-to-image mode: attaching reference image for ${model}`,
        );

        let mimeType = imageFile.mimetype;
        if (!mimeType || mimeType === "application/octet-stream") {
          const ext = (imageFile.originalname || "")
            .split(".")
            .pop()
            .toLowerCase();
          if (ext === "png") {
            mimeType = "image/png";
          } else if (ext === "webp") {
            mimeType = "image/webp";
          } else {
            mimeType = "image/jpeg";
          }
          imageFile.mimetype = mimeType;
        }

        const base64Image = imageFile.buffer.toString("base64");
        // BFL API accepts image_prompt as a base64 data URI for reference/i2i
        payload.image_prompt = `data:${mimeType};base64,${base64Image}`;
        payload.image_prompt_strength = 0.7; // Higher strength to adhere closely to the uploaded image
      }

      const createRes = await axios.post(endpoint, payload, {
        headers: {
          "x-key": provider.api_key,
          accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const pollingUrl = createRes.data?.polling_url;

      if (!pollingUrl) {
        throw new Error("No polling URL returned from Flux API");
      }

      // 4. Polling for the result
      let imageUrl = null;

      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const resultRes = await axios.get(pollingUrl, {
          headers: {
            "x-key": provider.api_key,
            accept: "application/json",
          },
        });

        const status = resultRes.data?.status;

        if (status === "Ready") {
          imageUrl = resultRes.data?.result?.sample;
          break;
        }

        if (status === "Error" || status === "Failed") {
          throw new Error("Flux image generation failed");
        }
      }

      if (!imageUrl) {
        throw new Error("Image generation timeout");
      }

      // 5. Download and return the image buffer
      const imageRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      return Buffer.from(imageRes.data);
    } catch (error) {
      console.error(
        "🔥 Flux API Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          error.message,
      );
    }
  }
  async generateSeedreamImage(model, prompt, imageFile = null, ratio = "1:1") {
    console.log("🚀 Starting Seedream Image Generation...");
    console.log("📝 Prompt:", prompt);
    console.log(
      `🖼️ Image: ${imageFile ? "Yes (image-to-image mode)" : "No (text-to-image mode)"}`,
    );

    // 1️⃣ Get OpenRouter provider
    const provider = await AIProvider.findOne({
      name: "seedream",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error("OpenRouter provider not configured");
    }

    try {
      let openRouterModel = "bytedance-seed/seedream-4.5";
      if (model === "seedream-5-lite" || model === "seedream-lite" || model === "seedream-4.5") {
        openRouterModel = "bytedance-seed/seedream-4.5";
      } else if (model === "seedream-5-pro" || model === "seedream-pro") {
        openRouterModel = "bytedance-seed/seedream-4.5"; // OpenRouter active Seedream model is seedream-4.5
      } else if (model && model.includes("/")) {
        openRouterModel = model;
      }

      const baseUrl = provider.base_url || "https://openrouter.ai/api/v1";

      // ✅ IMAGE-TO-IMAGE MODE: Use OpenRouter /api/v1/images endpoint with input_references
      if (imageFile) {
        console.log(
          `🖼️ Seedream image-to-image mode: using /api/v1/images with input_references`,
        );

        let mimeType = imageFile.mimetype;
        if (!mimeType || mimeType === "application/octet-stream") {
          const ext = (imageFile.originalname || "")
            .split(".")
            .pop()
            .toLowerCase();
          if (ext === "png") {
            mimeType = "image/png";
          } else if (ext === "webp") {
            mimeType = "image/webp";
          } else {
            mimeType = "image/jpeg";
          }
          imageFile.mimetype = mimeType;
        }

        const base64Image = imageFile.buffer.toString("base64");
        const dataUri = `data:${mimeType};base64,${base64Image}`;

        const response = await axios.post(
          `${baseUrl}/images`,
          {
            model: openRouterModel,
            prompt: `Aspect Ratio ${ratio}. ${prompt}`,
            input_references: [
              {
                type: "image_url",
                image_url: {
                  url: dataUri,
                },
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${provider.api_key}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://your-app-domain.com",
              "X-Title": "AI SaaS",
            },
          },
        );

        // OpenRouter /api/v1/images returns data array with b64_json or url
        const imageResult = response.data?.data?.[0];
        if (imageResult?.b64_json) {
          return Buffer.from(imageResult.b64_json, "base64");
        }
        if (imageResult?.url) {
          const imageRes = await axios.get(imageResult.url, {
            responseType: "arraybuffer",
          });
          return Buffer.from(imageRes.data);
        }

        throw new Error("No image returned from Seedream image-to-image API");
      }

      // ✅ TEXT-TO-IMAGE MODE (default)
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model: openRouterModel,
          messages: [
            { role: "user", content: `Aspect Ratio ${ratio}. ${prompt}` },
          ],
          modalities: ["image"],
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
        },
      );

      const message = response.data.choices[0]?.message;

      if (message && message.images && message.images.length > 0) {
        let base64Url =
          message.images[0].image_url?.url || message.images[0].imageUrl?.url;

        // OpenRouter typically returns base64 data URIs
        if (base64Url.startsWith("data:image")) {
          const base64Data = base64Url.split(",")[1];
          return Buffer.from(base64Data, "base64");
        }

        // If it returns a standard https URL instead
        if (base64Url.startsWith("http")) {
          const imageRes = await axios.get(base64Url, {
            responseType: "arraybuffer",
          });
          return Buffer.from(imageRes.data);
        }
      }

      throw new Error("No image returned from Seedream API");
    } catch (error) {
      console.error(
        "🔥 Seedream API error:",
        error.response?.data || error.message,
      );
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }
  // =================================================================
  // SORA IMPLEMENTATION (OPENAI API)
  // =================================================================
  async generateSoraVideo(
    model,
    prompt,
    imageFile,
    durationStr,
    aspectRatio,
    resolution,
    wantsAudio,
  ) {
    console.log(`🚀 Starting Sora Generation for model: ${model}...`);
    console.log(
      `📝 Prompt: ${prompt} | 🖼️ Image: ${imageFile ? "Yes" : "No"} | ⏱️ Duration: ${durationStr} | 📐 Ratio: ${aspectRatio} | 🖥️ Res: ${resolution} | 🔊 Audio Req: ${wantsAudio}`,
    );

    const axios = require("axios");
    const FormData = require("form-data");
    const sharp = require("sharp");

    const provider = await AIProvider.findOne({
      name: "openai",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key)
      throw new Error("OpenAI provider not configured");

    const baseUrl = provider.base_url || "https://api.openai.com/v1";

    try {
      // 1. DYNAMIC RESOLUTION CALCULATED AS NUMBERS FOR SHARP
      let width = 1280;
      let height = 720;
      const isPortrait = aspectRatio === "9:16";

      if (model === "sora-2-pro" && resolution?.includes("1080")) {
        width = isPortrait ? 1080 : 1920;
        height = isPortrait ? 1920 : 1080;
      } else {
        width = isPortrait ? 720 : 1280;
        height = isPortrait ? 1280 : 720;
      }

      const sizeStr = `${width}x${height}`;

      // 2. EXACT DURATION MAPPING
      let secondsStr = "8";
      if (durationStr) {
        const durationNumber = parseInt(durationStr.replace("s", ""));
        if ([4, 8, 12].includes(durationNumber)) {
          secondsStr = durationNumber.toString();
        } else {
          secondsStr = "8";
        }
      }

      // 3. BUILD DYNAMIC PAYLOAD
      let payload;
      let headers = {
        Authorization: `Bearer ${provider.api_key.trim()}`,
      };

      if (imageFile) {
        console.log(
          "📸 Image detected! Resizing image to exactly match OpenAI size requirements...",
        );

        // ✅ FIX: Added .flatten() to prevent PNG transparency from crashing the AI
        const resizedImageBuffer = await sharp(imageFile.buffer)
          .flatten({ background: { r: 255, g: 255, b: 255 } }) // Replaces transparency with white
          .resize(width, height, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 90 })
          .toBuffer();

        payload = new FormData();
        payload.append("model", model);
        payload.append("prompt", prompt);
        payload.append("size", sizeStr);
        payload.append("seconds", secondsStr);

        payload.append("input_reference", resizedImageBuffer, {
          filename: "image.jpg",
          contentType: "image/jpeg",
        });

        headers = { ...headers, ...payload.getHeaders() };
      } else {
        console.log("✍️ No image detected. Building JSON payload...");

        payload = {
          model: model,
          prompt: prompt,
          size: sizeStr,
          seconds: secondsStr,
        };
        headers["Content-Type"] = "application/json";
      }

      console.log(`📤 Sending Sora Request payload with size: ${sizeStr}...`);

      // 4. Submit Request
      const createRes = await axios.post(`${baseUrl}/videos`, payload, {
        headers,
      });

      const videoId = createRes.data?.id;
      if (!videoId) {
        throw new Error("No video ID returned from OpenAI API");
      }

      let isReady = false;
      let status = "pending";
      const pollHeaders = {
        Authorization: `Bearer ${provider.api_key.trim()}`,
      };

      // 5. Poll for completion
      for (let i = 0; i < 60; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10000));

        const statusRes = await axios.get(`${baseUrl}/videos/${videoId}`, {
          headers: pollHeaders,
        });

        status = statusRes.data?.status;
        console.log(`📌 Sora Status: ${status}`);

        if (status === "completed" || status === "succeeded") {
          isReady = true;
          break;
        }

        // ✅ FIX: Capture the exact OpenAI error message so you know why it failed
        if (status === "failed" || status === "error") {
          const openAiErrorMsg =
            statusRes.data?.error?.message || "Unknown internal OpenAI failure";
          throw new Error(`OpenAI Rejected Render: ${openAiErrorMsg}`);
        }
      }

      if (!isReady) {
        throw new Error("Sora video generation timeout");
      }

      console.log("⬇️ Downloading Sora video content...");
      const videoRes = await axios.get(`${baseUrl}/videos/${videoId}/content`, {
        headers: pollHeaders,
        responseType: "arraybuffer",
      });
      console.log("✅ Video downloaded successfully");

      return Buffer.from(videoRes.data);
    } catch (error) {
      console.error(
        "🔥 Sora API Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.error?.message ||
          error.response?.data?.detail ||
          error.message,
      );
    }
  }
  // =================================================================
  // VEO IMPLEMENTATION (GOOGLE GEMINI API)
  // =================================================================
  async generateVeoVideo(
    model,
    prompt,
    imageFile = null,
    duration,
    aspectRatio,
    resolution,
    wantsAudio,
  ) {
    console.log(`🚀 Starting Veo Video Generation for model: ${model}...`);
    console.log(
      `📝 Prompt: ${prompt} | 🖼️ Image: ${imageFile ? "Yes" : "No"} | ⏱️ Duration: ${duration} | 🖥️ Res: ${resolution} | 🔊 Audio: ${wantsAudio}`,
    );

    const axios = require("axios");

    try {
      // 1. Fetch Google (Gemini) API key from your database
      let provider = await AIProvider.findOne({
        name: "google",
        is_active: true,
      }).select("+api_key");

      if (!provider) {
        provider = await AIProvider.findOne({
          name: "veo",
          is_active: true,
        }).select("+api_key");
      }

      if (!provider || !provider.api_key) {
        throw new Error(
          "❌ Google/Veo provider missing or API key not found in DB.",
        );
      }

      const apiKey = provider.api_key.trim();

      // 2. Use the exact model ID passed from the frontend
      const geminiModelId = model || "veo-3.1-generate-preview";
      console.log(`🧠 Using Veo model: ${geminiModelId}`);

      // 3. Prepare Inputs
      const instance = { prompt };

      if (imageFile) {
        instance.image = {
          mimeType: imageFile.mimetype || "image/jpeg",
          bytesBase64Encoded: imageFile.buffer.toString("base64"),
        };
      }

      let finalResolution = "720p"; // Default
      let finalDurationSeconds = 4; // Default

      // A. STRICT DURATION MAPPING BASED ON MODEL
      if (duration) {
        const parsed = parseInt(duration.replace("s", ""));

        if (geminiModelId === "veo-2.0-generate-001") {
          // Veo 2.0 supports strictly 5, 6, 8
          if ([5, 6, 8].includes(parsed)) {
            finalDurationSeconds = parsed;
          } else {
            finalDurationSeconds = 5; // Safe fallback for Veo 2.0
          }
        } else {
          // Veo 3.0 / 3.1 models support strictly 4, 6, 8
          if ([4, 6, 8].includes(parsed)) {
            finalDurationSeconds = parsed;
          } else {
            finalDurationSeconds = 4; // Safe fallback for Veo 3
          }
        }
      }

      // B. Parse requested resolution
      if (resolution === "1080p" || resolution === "1080") {
        finalResolution = "1080p";
      } else if (resolution === "4k" || resolution === "4K") {
        finalResolution = "4k";
      }

      // C. Image-to-Video strictly requires 8 seconds according to Google Docs
      if (imageFile) {
        finalDurationSeconds = 8;
      }

      // D. THE CRITICAL FIX: If duration is less than 8, Google FORCES resolution to be 720p.
      if (finalDurationSeconds < 8) {
        finalResolution = "720p";
        console.log(
          `⚠️ Duration is ${finalDurationSeconds}s. Forcing resolution to 720p to satisfy Google API rules.`,
        );
      }

      const body = {
        instances: [instance],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspectRatio || "16:9",
          durationSeconds: finalDurationSeconds,
          resolution: finalResolution,
        },
      };

      console.log("📤 Sending to Gemini API with parameters:", body.parameters);

      // 4. Send request to the standard Gemini API
      const baseUrl = "https://generativelanguage.googleapis.com/v1beta";
      const generateUrl = `${baseUrl}/models/${geminiModelId}:predictLongRunning`;

      const createRes = await axios.post(generateUrl, body, {
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
      });

      const operationName = createRes.data.name;
      if (!operationName)
        throw new Error("Failed to get operation name from Veo API");

      console.log(`🆔 Operation created: ${operationName}`);

      // 5. Poll for Completion (GET Request for Gemini API)
      const pollUrl = `${baseUrl}/${operationName}`;

      for (let i = 0; i < 60; i++) {
        console.log(`⏳ Polling ${i + 1}/60 for Veo task...`);
        await new Promise((r) => setTimeout(r, 10000));

        const statusRes = await axios.get(pollUrl, {
          headers: {
            "x-goog-api-key": apiKey,
          },
        });

        const op = statusRes.data;

        // Handle internal operation errors
        if (op.error) {
          console.error("❌ Veo Generation Error:", op.error);
          throw new Error(op.error.message || "Veo Generation Failed");
        }

        if (op.done) {
          console.log("✅ Veo generation completed on server.");

          const videoUri =
            op.response?.generateVideoResponse?.generatedSamples?.[0]?.video
              ?.uri;

          const videoBase64 =
            op.response?.generateVideoResponse?.generatedSamples?.[0]?.video
              ?.videoBytes ||
            op.response?.videos?.[0]?.videoBytes ||
            op.response?.generatedVideos?.[0]?.video?.bytesBase64Encoded;

          if (videoUri) {
            console.log(`⬇️ Downloading video from URI...`);
            const videoDownloadRes = await axios.get(videoUri, {
              headers: {
                "x-goog-api-key": apiKey,
              },
              responseType: "arraybuffer",
            });
            console.log("✅ Video downloaded successfully");
            return Buffer.from(videoDownloadRes.data);
          } else if (videoBase64) {
            console.log("✅ Extracted base64 video");
            return Buffer.from(videoBase64, "base64");
          } else {
            console.error(
              "❌ Invalid response structure:",
              JSON.stringify(op, null, 2),
            );
            throw new Error(
              "No video URI or bytes returned inside the response",
            );
          }
        }
      }

      throw new Error("⏰ Timeout: Veo video generation took too long.");
    } catch (error) {
      console.error("🔥 Veo Error:", error.response?.data || error.message);
      throw new Error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error.message,
      );
    }
  }

  // =================================================================
  // BERNINI-R EDIT VIDEO IMPLEMENTATION (FAL.AI)
  // =================================================================
  async generateBerniniVideo(prompt, videoFile) {
    console.log(`🚀 Starting Bernini-R Video Edit...`);
    const axios = require("axios");

    if (!videoFile) {
      throw new Error("A source video file is required for Bernini-R editing.");
    }
    if (!prompt) {
      throw new Error("An editing prompt is required for Bernini-R.");
    }

    // 1. Fetch the Fal.ai provider from DB (Assuming you have a provider named 'fal' or 'bernini')
    const provider = await AIProvider.findOne({
      name: { $in: ["fal", "bernini"] },
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error(
        "Fal.ai (Bernini) provider missing or not configured in DB",
      );
    }

    const apiKey = provider.api_key.trim();
    let baseUrl = provider.base_url || "https://queue.fal.run";
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

    const endpoint = `${baseUrl}/fal-ai/bernini-r/edit-video`;

    const headers = {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    };

    // Convert the uploaded video buffer to a base64 Data URI
    const base64Video = videoFile.buffer.toString("base64");
    const mimeType = videoFile.mimetype || "video/mp4";
    const videoUrl = `data:${mimeType};base64,${base64Video}`;

    const body = {
      prompt: prompt,
      video_url: videoUrl,
    };

    try {
      const createRes = await axios.post(endpoint, body, { headers });

      const requestId = createRes.data?.request_id;
      const statusUrl = createRes.data?.status_url;
      const responseUrl = createRes.data?.response_url;

      if (!requestId || !statusUrl) {
        throw new Error("No request ID or status URL returned from Fal API");
      }

      console.log(`✅ Bernini Job queued. Request ID: ${requestId}`);

      let isReady = false;
      let finalVideoUrl = null;

      // Video editing takes time. Poll every 5 seconds for up to 10 minutes (120 attempts)
      for (let i = 0; i < 120; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusRes = await axios.get(statusUrl, { headers });
        const status = statusRes.data?.status;
        console.log(`📌 Bernini Status: ${status}`);

        if (status === "COMPLETED") {
          isReady = true;
          const resultRes = await axios.get(responseUrl, { headers });
          // Fal returns the video payload inside a 'video' object
          finalVideoUrl = resultRes.data?.video?.url;
          break;
        }

        if (status === "ERROR" || status === "FAILED") {
          throw new Error(
            statusRes.data?.error || "Bernini Video generation failed",
          );
        }
      }

      if (!isReady || !finalVideoUrl) {
        throw new Error("Bernini Video generation timeout or no URL returned");
      }

      // Fetch the actual .mp4 file buffer to return to the frontend
      const videoRes = await axios.get(finalVideoUrl, {
        responseType: "arraybuffer",
      });
      return Buffer.from(videoRes.data);
    } catch (error) {
      let apiError =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message;
      console.error("🔥 Bernini Video error:", apiError);
      throw new Error(`Bernini Video error: ${apiError}`);
    }
  }
  // =================================================================
  // RUNWAY IMPLEMENTATION (FIXED COMPLIANT VERSION)
  // =================================================================
  async generateRunwayVideo(
    model,
    prompt,
    imageFile = null,
    durationStr,
    aspectRatio,
    resolution,
    wantsAudio,
  ) {
    console.log(`🚀 Starting Runway Video Generation for model: ${model}...`);
    console.log(
      `📝 Prompt: ${prompt} | 🖼️ Image: ${imageFile ? "Yes" : "No"} | ⏱️ Duration: ${durationStr} | 📐 Ratio: ${aspectRatio} | 🖥️ Res: ${resolution} | 🔊 Audio Req: ${wantsAudio}`,
    );

    const axios = require("axios");
    const provider = await AIProvider.findOne({
      name: "runway",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key)
      throw new Error("Runway provider not configured");

    const baseUrl = provider.base_url || "https://api.dev.runwayml.com/v1";
    const headers = {
      Authorization: `Bearer ${provider.api_key.trim()}`,
      "X-Runway-Version": "2024-11-06",
      "Content-Type": "application/json",
    };

    try {
      // Default to text_to_video endpoint
      let endpoint = `${baseUrl}/text_to_video`;

      const actualModel = model || "gen4.5";

      // Strict Duration Mapping
      let parsedDuration = 5;
      if (durationStr) {
        const rawDuration = parseInt(durationStr.replace("s", ""));
        if ([5, 10].includes(rawDuration)) {
          parsedDuration = rawDuration;
        }
      }

      // Strict Ratio Mapping
      const isGen3 = actualModel.includes("gen3");
      let mappedRatio = isGen3 ? "1280:768" : "1280:720";
      if (aspectRatio === "9:16") {
        mappedRatio = isGen3 ? "768:1280" : "720:1280";
      }

      // Enforce Runway prompt text length limits safely
      const safePromptText = prompt ? prompt.substring(0, 512) : "";

      // Base payload declaration conforming strictly to schema
      let payload = {
        model: actualModel,
        promptText: safePromptText,
        ratio: mappedRatio,
        duration: parsedDuration,
      };

      // Handle Image input conditions securely
      if (imageFile && imageFile.buffer) {
        endpoint = `${baseUrl}/image_to_video`;
        const base64Image = imageFile.buffer.toString("base64");

        // 🔥 FIX: Sanitize MIME type for Runway's strict ^data:image/ regex
        let mimeType = imageFile.mimetype;
        if (!mimeType || !mimeType.startsWith("image/")) {
          mimeType = "image/png";
        }

        payload.promptImage = `data:${mimeType};base64,${base64Image}`;
      }

      console.log(
        `📤 Sending Runway Request to ${endpoint} with payload:`,
        JSON.stringify(payload, null, 2),
      );

      const createRes = await axios.post(endpoint, payload, { headers });
      const taskId = createRes.data?.id;
      if (!taskId) {
        throw new Error("No task ID returned from Runway API");
      }

      console.log(`✅ Job created. Task ID: ${taskId}`);

      // Poll loop for completion tracking
      let isReady = false;
      let status = "PENDING";
      let videoUrls = [];

      for (let i = 0; i < 60; i++) {
        console.log(`⏳ Polling attempt ${i + 1} for Runway task...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));

        const statusRes = await axios.get(`${baseUrl}/tasks/${taskId}`, {
          headers,
        });

        status = statusRes.data?.status;
        console.log(`📌 Runway Status: ${status}`);

        if (status === "SUCCEEDED") {
          isReady = true;
          videoUrls = statusRes.data?.output || [];
          console.log("✅ Runway Generation Complete!");
          break;
        }

        if (status === "FAILED" || status === "CANCELLED") {
          console.error("❌ Runway Generation Failed:", statusRes.data);
          throw new Error(
            `Runway video generation failed: ${statusRes.data?.failure || status}`,
          );
        }
      }

      if (!isReady || videoUrls.length === 0) {
        throw new Error("Runway video generation timeout or no URL returned");
      }

      console.log("⬇️ Downloading Runway video content...");
      const videoRes = await axios.get(videoUrls[0], {
        responseType: "arraybuffer",
      });

      console.log("✅ Video downloaded successfully");
      return Buffer.from(videoRes.data);
    } catch (error) {
      console.error(
        "🔥 Runway API error:",
        error.response?.data || error.message,
      );
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  // =================================================================
  // KLING IMPLEMENTATION (FAL.AI)
  // =================================================================
  async generateKlingVideo(
    model,
    prompt,
    imageFile = null,
    durationStr,
    aspectRatio,
    resolution,
    wantsAudio, // ✅ Receives the boolean from your router
  ) {
    console.log(`🚀 Starting Kling Video Generation for model: ${model}...`);
    console.log(
      `📝 Prompt: ${prompt} | 🖼️ Image: ${imageFile ? "Yes" : "No"} | ⏱️ Duration: ${durationStr} | 📐 Ratio: ${aspectRatio} | 🖥️ Res: ${resolution} | 🔊 Audio: ${wantsAudio}`,
    );
    const axios = require("axios");

    // 1. Fetch provider details from DB
    const provider = await AIProvider.findOne({
      name: "kling",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error(
        "❌ Kling (Fal.ai) provider not configured or API key missing",
      );
    }

    // 2. Extract version from model string
    const actualKlingModel = model || "kling-v2-5-turbo";
    let versionPath = "v2.5-turbo/pro"; // Default fallback

    // Map your frontend models to the correct Fal AI endpoint paths
    if (
      actualKlingModel.includes("v3") ||
      actualKlingModel.includes("3.0") ||
      actualKlingModel === "kling-v3"
    ) {
      versionPath = "v3/pro";
    } else if (
      actualKlingModel.includes("v2-5") ||
      actualKlingModel.includes("2.5") ||
      actualKlingModel === "kling-v2-5-turbo"
    ) {
      versionPath = "v2.5-turbo/pro";
    }

    console.log(
      `🧠 Mapped ${actualKlingModel} to Fal.ai version: ${versionPath}`,
    );

    // 3. Construct Dynamic Endpoint for Fal.ai Queue
    let baseUrl = "https://queue.fal.run/fal-ai/kling-video";

    // fal.ai uses specific paths for text vs image
    const endpoint = imageFile
      ? `${baseUrl}/${versionPath}/image-to-video`
      : `${baseUrl}/${versionPath}/text-to-video`;

    console.log(`📤 Sending request to Fal AI Queue: ${endpoint}`);

    // 4. Headers (Using "Key" prefix for Fal.ai)
    const headers = {
      Authorization: `Key ${provider.api_key.trim()}`,
      "Content-Type": "application/json",
    };

    // 5. STRICT Duration Mapping (Kling usually accepts 5 or 10 on Fal)
    let parsedDuration = "5";
    if (durationStr) {
      const val = parseInt(durationStr.replace("s", ""));
      parsedDuration = val >= 10 ? "10" : "5"; // Sent as string enum for Fal AI
    }

    // 6. Prepare Payload
    const body = {
      prompt: prompt,
      aspect_ratio: aspectRatio || "16:9",
      duration: parsedDuration,
      generate_audio: wantsAudio, // ✅ Passed the audio flag to Fal.ai/Kling
    };

    if (imageFile) {
      const base64Image = imageFile.buffer.toString("base64");
      const mimeType = imageFile.mimetype || "image/png";
      // Fal AI expects a data URI for image payloads
      body.image_url = `data:${mimeType};base64,${base64Image}`;
    }

    try {
      // Step 1: Submit the request to Fal.ai Queue
      const createRes = await axios.post(endpoint, body, { headers });

      const requestId = createRes.data?.request_id;
      const statusUrl = createRes.data?.status_url;
      const responseUrl = createRes.data?.response_url;

      if (!requestId || !statusUrl) {
        throw new Error("No request ID or status URL returned from Fal/Kling");
      }

      console.log(`✅ Job queued. Request ID: ${requestId}`);

      let isReady = false;
      let videoUrl = null;

      // Step 2: Poll for completion
      for (let i = 0; i < 60; i++) {
        console.log(`⏳ Polling attempt ${i + 1} for Kling task...`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds

        const statusRes = await axios.get(statusUrl, { headers });
        const status = statusRes.data?.status;
        console.log(`📌 Status: ${status}`);

        if (status === "COMPLETED") {
          isReady = true;

          // Get the final result from the response_url
          const resultRes = await axios.get(responseUrl, { headers });

          // The result usually contains `video.url`
          videoUrl = resultRes.data?.video?.url || resultRes.data?.url;

          console.log("✅ Kling Generation Complete!");
          break;
        }

        if (status === "IN_QUEUE" || status === "IN_PROGRESS") {
          continue;
        }

        if (status === "ERROR" || status === "FAILED") {
          console.error("❌ Kling Generation Failed:", statusRes.data);
          throw new Error(statusRes.data?.error || "Kling generation failed");
        }
      }

      if (!isReady || !videoUrl) {
        throw new Error("Kling video generation timeout or no URL returned");
      }

      // Step 3: Download the final video
      console.log("⬇️ Downloading Kling video content...");
      const videoRes = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });
      console.log("✅ Video downloaded successfully");

      return Buffer.from(videoRes.data);
    } catch (error) {
      console.error(
        "🔥 Kling API error:",
        error.response?.data || error.message,
      );
      throw parseFalError(error);
    }
  }
  // =================================================================
  // PIKA IMPLEMENTATION (FAL.AI)
  // =================================================================
  async generatePikaVideo(
    model,
    prompt,
    imageFile = null,
    durationStr,
    aspectRatio,
    resolution,
    wantsAudio, // ✅ ADDED wantsAudio
  ) {
    console.log(`🚀 Starting Pika Video Generation for model: ${model}...`);
    console.log(
      `📝 Prompt: ${prompt} | 🖼️ Image: ${imageFile ? "Yes" : "No"} | ⏱️ Duration: ${durationStr} | 📐 Ratio: ${aspectRatio} | 🖥️ Res: ${resolution} | 🔊 Audio: ${wantsAudio}`,
    );
    const axios = require("axios");

    // 1. Fetch provider details from DB
    const provider = await AIProvider.findOne({
      name: "pika",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error(
        "❌ Pika/Fal.ai provider not configured or API key missing",
      );
    }

    // 2. Extract version from model string (e.g., "Pika v2.1" -> "v2.1", "Pika v2.2" -> "v2.2")
    const actualPikaModel = model || "Pika v2.1";
    let versionPath = "v2.1"; // Default fallback

    if (actualPikaModel.includes("2.2")) {
      versionPath = "v2.2";
    } else if (actualPikaModel.includes("2.1")) {
      versionPath = "v2.1";
    }
    console.log(
      `🧠 Mapped ${actualPikaModel} to Fal.ai version: ${versionPath}`,
    );

    // 3. Construct Dynamic Endpoint
    // If your DB has "https://fal.run/fal-ai/pika/v2.1", we clean it up so we can append the dynamic version
    let baseUrl = provider.base_url || "https://fal.run/fal-ai/pika";
    baseUrl = baseUrl.replace(/\/v2\.[0-9]+$/, ""); // Safely strips /v2.x if it exists in the DB

    // fal.ai uses specific paths for text vs image
    const endpoint = imageFile
      ? `${baseUrl}/${versionPath}/image-to-video`
      : `${baseUrl}/${versionPath}/text-to-video`;

    console.log(`📤 Sending request to: ${endpoint}`);

    // 4. Headers (Using "Key" prefix for Fal.ai)
    const headers = {
      Authorization: `Key ${provider.api_key.trim()}`,
      "Content-Type": "application/json",
    };

    // 5. STRICT Duration Mapping (Pika accepts 5 or 10)
    let parsedDuration = 5;
    if (durationStr) {
      const val = parseInt(durationStr.replace("s", ""));
      parsedDuration = val >= 10 ? 10 : 5;
    }

    // 6. Prepare Payload
    const body = {
      prompt: prompt,
      aspect_ratio: aspectRatio || "16:9",
      resolution: resolution || "720p", // Standard Fal payload expects "720p" or "1080p"
      duration: parsedDuration,
      // Audio note: Since Pika allows audio natively or via external add-ons,
      // we log wantsAudio but omit it from the strict payload to avoid Fal API 422 Errors unless directly supported
    };

    if (imageFile) {
      const base64Image = imageFile.buffer.toString("base64");
      const mimeType = imageFile.mimetype || "image/png";
      body.image_url = `data:${mimeType};base64,${base64Image}`;
    }

    try {
      // Step 1: Submit the request
      const createRes = await axios.post(endpoint, body, { headers });

      // Check if it returned a direct video (Synchronous "run" mode)
      if (createRes.data.video && createRes.data.video.url) {
        console.log("✅ Video generated immediately (Sync)");
        const videoUrl = createRes.data.video.url;
        const videoRes = await axios.get(videoUrl, {
          responseType: "arraybuffer",
        });
        return Buffer.from(videoRes.data);
      }

      // Step 2: Handle Queue/Async mode
      const requestId = createRes.data?.request_id;
      if (!requestId)
        throw new Error("No video URL or request ID returned from Fal/Pika");

      console.log(`✅ Job created. Request ID: ${requestId}`);

      let isReady = false;
      let videoUrl = null;

      // Step 3: Poll for completion
      for (let i = 0; i < 60; i++) {
        console.log(`⏳ Polling attempt ${i + 1} for Pika task...`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Pika is usually 30-60s

        // Fal requests polling endpoint doesn't need the version path
        const pollEndpoint =
          baseUrl.replace("/pika", "") + `/requests/${requestId}`;

        const statusRes = await axios.get(pollEndpoint, { headers });
        const status = statusRes.data?.status;
        console.log(`📌 Status: ${status}`);

        if (status === "COMPLETED") {
          isReady = true;
          videoUrl = statusRes.data?.video?.url || statusRes.data?.url;
          console.log("✅ Pika Generation Complete!");
          break;
        }

        if (status === "ERROR") {
          console.error("❌ Pika Generation Failed:", statusRes.data);
          throw new Error(statusRes.data?.error || "Pika generation failed");
        }
      }

      if (!isReady || !videoUrl) {
        throw new Error("Pika video generation timeout or no URL returned");
      }

      // Step 4: Download the final video
      console.log("⬇️ Downloading Pika video content...");
      const videoRes = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });
      console.log("✅ Video downloaded successfully");

      return Buffer.from(videoRes.data);
    } catch (error) {
      console.error(
        "🔥 Pika API error:",
        error.response?.data || error.message,
      );
      throw parseFalError(error);
    }
  }

  // =================================================================
  // SEEDANCE VIDEO IMPLEMENTATION
  // =================================================================
  async generateSeedanceVideo(
    model,
    prompt,
    imageFile,
    durationStr,
    aspectRatio,
    resolution,
    wantsAudio,
  ) {
    console.log(`🚀 Starting Seedance Video Generation for model: ${model}...`);
    const axios = require("axios");

    // 1. Fetch Seedance provider from DB dynamically
    const provider = await AIProvider.findOne({
      name: "seedance",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error(
        "❌ Seedance provider not configured or API key missing in DB",
      );
    }

    const apiKey = provider.api_key.trim();

    // 2. Determine suffix based on the model provided and input type
    let endpointSuffix = imageFile
      ? "/bytedance/seedance-2.0/image-to-video"
      : "/bytedance/seedance-2.0/text-to-video";
    if (model === "seedance-2.0-fast") {
      endpointSuffix = imageFile
        ? "/bytedance/seedance-2.0/fast/image-to-video"
        : "/bytedance/seedance-2.0/fast/text-to-video";
    }

    // 3. Clean and merge the DB base_url with the dynamic endpoint suffix
    let baseUrl = provider.base_url || "https://queue.fal.run";
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1); // Remove trailing slash if present
    }

    const endpoint = `${baseUrl}${endpointSuffix}`;
    console.log(`📤 Sending request to dynamic Seedance Queue: ${endpoint}`);

    // 4. Headers (Fal Queue requires 'Key' prefix)
    const headers = {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    };

    // 5. Duration Parsing (Strictly 4 to 15 seconds)
    let parsedDuration = 10; // Default fallback
    if (durationStr) {
      const val = parseInt(durationStr.replace("s", ""));
      // Ensure it stays within Fal.ai's allowed 4-15s bounds
      parsedDuration = val >= 4 && val <= 15 ? val : 10;
    }

    // 6. Resolution Mapping (Supports 480p, 720p, 1080p, 4k)
    let mappedResolution = "720p"; // Default fallback
    if (resolution) {
      const resString = resolution.toLowerCase();
      if (resString.includes("4k")) {
        mappedResolution = "4k";
      } else if (resString.includes("1080")) {
        mappedResolution = "1080p";
      } else if (resString.includes("480")) {
        mappedResolution = "480p";
      } else {
        mappedResolution = "720p";
      }
    }

    // 7. Prepare Payload
    const body = {
      prompt: prompt,
      aspect_ratio: aspectRatio || "16:9",
      duration: parsedDuration,
      resolution: mappedResolution,
      // Convert wantsAudio to boolean just in case it's passed as a string
      generate_audio:
        wantsAudio === true || wantsAudio === "yes" || wantsAudio === "true",
    };

    if (imageFile) {
      const base64Image = imageFile.buffer.toString("base64");
      const mimeType = imageFile.mimetype || "image/png";
      body.image_url = `data:${mimeType};base64,${base64Image}`;
    }

    try {
      // Step 1: Submit the request to Queue
      const createRes = await axios.post(endpoint, body, { headers });

      const requestId = createRes.data?.request_id;
      const statusUrl = createRes.data?.status_url;
      const responseUrl = createRes.data?.response_url;

      if (!requestId || !statusUrl) {
        throw new Error(
          "No request ID or status URL returned from Seedance API",
        );
      }

      console.log(`✅ Job queued. Request ID: ${requestId}`);

      let isReady = false;
      let videoUrl = null;

      // Step 2: Poll for completion
      for (let i = 0; i < 60; i++) {
        console.log(`⏳ Polling attempt ${i + 1} for Seedance task...`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds

        const statusRes = await axios.get(statusUrl, { headers });
        const status = statusRes.data?.status;
        console.log(`📌 Status: ${status}`);

        if (status === "COMPLETED") {
          isReady = true;
          const resultRes = await axios.get(responseUrl, { headers });
          videoUrl = resultRes.data?.video?.url || resultRes.data?.url;
          console.log("✅ Seedance Generation Complete!");
          break;
        }

        if (status === "IN_QUEUE" || status === "IN_PROGRESS") {
          continue; // Wait and try again
        }

        if (status === "ERROR" || status === "FAILED") {
          console.error("❌ Seedance Generation Failed:", statusRes.data);
          throw new Error(
            statusRes.data?.error || "Seedance generation failed",
          );
        }
      }

      if (!isReady || !videoUrl) {
        throw new Error("Seedance video generation timeout or no URL returned");
      }

      // Step 3: Download the final video binary
      console.log("⬇️ Downloading Seedance video content...");
      const videoRes = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });
      console.log("✅ Video downloaded successfully");

      return Buffer.from(videoRes.data);
    } catch (error) {
      console.error(
        "🔥 Seedance API error:",
        error.response?.data || error.message,
      );
      throw parseFalError(error);
    }
  }

  // =================================================================
  // MINIMAX HAILUO VIDEO IMPLEMENTATION (FAL.AI)
  // =================================================================
  async generateMiniMaxVideo(
    model,
    prompt,
    imageFile,
    durationStr,
    aspectRatio,
  ) {
    console.log(`🚀 Starting MiniMax Video Generation for model: ${model}...`);
    const axios = require("axios");

    // 1. Fetch MiniMax provider from DB dynamically
    const provider = await AIProvider.findOne({
      name: "minimax_image", // Make sure this provider is named 'minimax' in your DB
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error(
        "❌ MiniMax provider not configured or API key missing in DB",
      );
    }

    const apiKey = provider.api_key.trim();

    // 2. Determine Endpoint Suffix and Constraints based on the model and input type
    let endpointSuffix = "";
    let isPro = false;

    switch (model) {
      case "minimax-hailuo-02-standard":
        endpointSuffix = imageFile
          ? "/fal-ai/minimax/hailuo-02/standard/image-to-video"
          : "/fal-ai/minimax/hailuo-02/standard/text-to-video";
        break;
      case "minimax-hailuo-02-pro":
        endpointSuffix = imageFile
          ? "/fal-ai/minimax/hailuo-02/pro/image-to-video"
          : "/fal-ai/minimax/hailuo-02/pro/text-to-video";
        isPro = true;
        break;
      case "minimax-hailuo-2.3-standard":
        endpointSuffix = imageFile
          ? "/fal-ai/minimax/hailuo-2.3/standard/image-to-video"
          : "/fal-ai/minimax/hailuo-2.3/standard/text-to-video";
        break;
      case "minimax-hailuo-2.3-pro":
        endpointSuffix = imageFile
          ? "/fal-ai/minimax/hailuo-2.3/pro/image-to-video"
          : "/fal-ai/minimax/hailuo-2.3/pro/text-to-video";
        isPro = true;
        break;
      default:
        endpointSuffix = imageFile
          ? "/fal-ai/minimax/hailuo-02/standard/image-to-video"
          : "/fal-ai/minimax/hailuo-02/standard/text-to-video";
    }

    // 3. Clean and merge the DB base_url with the dynamic endpoint suffix
    let baseUrl = provider.base_url || "https://queue.fal.run";
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const endpoint = `${baseUrl}${endpointSuffix}`;
    console.log(`📤 Sending request to dynamic MiniMax Queue: ${endpoint}`);

    // 4. Headers
    const headers = {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    };

    // 5. Build Payload (Strictly NO aspect ratio, resolution or audio parameters)
    const body = {
      prompt: prompt,
    };

    if (imageFile) {
      const base64Image = imageFile.buffer.toString("base64");
      const mimeType = imageFile.mimetype || "image/png";
      body.image_url = `data:${mimeType};base64,${base64Image}`;
    }

    // 6. Handle Duration Constraints (Only Standard supports duration inputs)
    if (!isPro && durationStr) {
      const val = parseInt(durationStr.replace("s", ""));
      // Only attach duration if it matches Fal.ai's strict 6 or 10 support
      if (val === 6 || val === 10) {
        body.duration = val.toString();
      }
    }
    // *If it's Pro, duration is completely omitted based on your screenshot.*

    try {
      // Step 1: Submit the request to Queue
      const createRes = await axios.post(endpoint, body, { headers });

      const requestId = createRes.data?.request_id;
      const statusUrl = createRes.data?.status_url;
      const responseUrl = createRes.data?.response_url;

      if (!requestId || !statusUrl) {
        throw new Error(
          "No request ID or status URL returned from MiniMax API",
        );
      }

      console.log(`✅ Job queued. Request ID: ${requestId}`);

      let isReady = false;
      let videoUrl = null;

      // Step 2: Poll for completion
      for (let i = 0; i < 90; i++) {
        // MiniMax can take 4-8 mins, so we poll up to 90 times (7.5 mins max)
        console.log(`⏳ Polling attempt ${i + 1} for MiniMax task...`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds

        const statusRes = await axios.get(statusUrl, { headers });
        const status = statusRes.data?.status;
        console.log(`📌 Status: ${status}`);

        if (status === "COMPLETED") {
          isReady = true;
          const resultRes = await axios.get(responseUrl, { headers });
          videoUrl = resultRes.data?.video?.url || resultRes.data?.url;
          console.log("✅ MiniMax Generation Complete!");
          break;
        }

        if (status === "IN_QUEUE" || status === "IN_PROGRESS") {
          continue; // Wait and try again
        }

        if (status === "ERROR" || status === "FAILED") {
          console.error("❌ MiniMax Generation Failed:", statusRes.data);
          throw new Error(statusRes.data?.error || "MiniMax generation failed");
        }
      }

      if (!isReady || !videoUrl) {
        throw new Error("MiniMax video generation timeout or no URL returned");
      }

      // Step 3: Download the final video binary
      console.log("⬇️ Downloading MiniMax video content...");
      const videoRes = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });
      console.log("✅ Video downloaded successfully");

      return Buffer.from(videoRes.data);
    } catch (error) {
      console.error(
        "🔥 MiniMax API error:",
        error.response?.data || error.message,
      );
      throw parseFalError(error);
    }
  }

  // =================================================================
  // WAN VIDEO IMPLEMENTATION (FAL.AI)
  // =================================================================
  async generateWanVideo(
    model,
    prompt,
    imageFile,
    durationStr,
    aspectRatio,
    resolution,
    audioUrl,
  ) {
    console.log(`🚀 Starting Wan Video Generation for model: ${model}...`);
    const axios = require("axios");

    // 1. Fetch Wan provider from DB dynamically
    const provider = await AIProvider.findOne({
      name: "wan", // Make sure this provider is named 'wan' in your DB
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error(
        "❌ Wan provider not configured or API key missing in DB",
      );
    }

    const apiKey = provider.api_key.trim();

    // 2. Determine Endpoint Suffix based on the model
    let endpointSuffix = "";
    switch (model) {
      case "wan-2.7":
        endpointSuffix = "/fal-ai/wan/v2.7/text-to-video";
        break;
      case "wan-2.6":
        endpointSuffix = "/wan/v2.6/text-to-video";
        break;
      case "wan-2.5-preview":
        endpointSuffix = "/fal-ai/wan-25-preview/text-to-video";
        break;
      default:
        endpointSuffix = "/fal-ai/wan/v2.7/text-to-video";
    }

    // 3. Clean and merge the DB base_url
    let baseUrl = provider.base_url || "https://queue.fal.run";
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Check if imageFile is passed (if they eventually support image-to-video)
    if (imageFile) {
      endpointSuffix = endpointSuffix.replace(
        "text-to-video",
        "image-to-video",
      );
    }

    const endpoint = `${baseUrl}${endpointSuffix}`;
    console.log(`📤 Sending request to dynamic Wan Queue: ${endpoint}`);

    // 4. Headers
    const headers = {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    };

    // 5. Duration Parsing (Strictly 2 to 15 seconds)
    let parsedDuration = 5; // Default
    if (durationStr) {
      const val = parseInt(durationStr.replace("s", ""));
      parsedDuration = val >= 2 && val <= 15 ? val : 5;
    }

    // 6. Resolution Mapping
    let mappedResolution = "720p"; // Default
    if (resolution?.toLowerCase().includes("1080")) {
      mappedResolution = "1080p";
    }

    // 7. Build Payload
    const body = {
      prompt: prompt,
      aspect_ratio: aspectRatio || "16:9",
      duration: parsedDuration,
      resolution: mappedResolution,
    };

    // Wan specifically accepts an audio_url as shown in your screenshot
    if (audioUrl) {
      body.audio_url = audioUrl;
    }

    if (imageFile) {
      const base64Image = imageFile.buffer.toString("base64");
      const mimeType = imageFile.mimetype || "image/png";
      body.image_url = `data:${mimeType};base64,${base64Image}`;
    }

    try {
      // Step 1: Submit the request to Queue
      const createRes = await axios.post(endpoint, body, { headers });

      const requestId = createRes.data?.request_id;
      const statusUrl = createRes.data?.status_url;
      const responseUrl = createRes.data?.response_url;

      if (!requestId || !statusUrl) {
        throw new Error("No request ID or status URL returned from Wan API");
      }

      console.log(`✅ Job queued. Request ID: ${requestId}`);

      let isReady = false;
      let videoUrl = null;

      // Step 2: Poll for completion
      for (let i = 0; i < 90; i++) {
        // Polling up to 7.5 mins
        console.log(`⏳ Polling attempt ${i + 1} for Wan task...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusRes = await axios.get(statusUrl, { headers });
        const status = statusRes.data?.status;
        console.log(`📌 Status: ${status}`);

        if (status === "COMPLETED") {
          isReady = true;
          const resultRes = await axios.get(responseUrl, { headers });
          videoUrl = resultRes.data?.video?.url || resultRes.data?.url;
          console.log("✅ Wan Generation Complete!");
          break;
        }

        if (status === "IN_QUEUE" || status === "IN_PROGRESS") {
          continue;
        }

        if (status === "ERROR" || status === "FAILED") {
          console.error("❌ Wan Generation Failed:", statusRes.data);
          throw new Error(statusRes.data?.error || "Wan generation failed");
        }
      }

      if (!isReady || !videoUrl) {
        throw new Error("Wan video generation timeout or no URL returned");
      }

      // Step 3: Download the final video binary
      console.log("⬇️ Downloading Wan video content...");
      const videoRes = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });
      console.log("✅ Video downloaded successfully");

      return Buffer.from(videoRes.data);
    } catch (error) {
      console.error(
        "🔥 Wan API error:",
        JSON.stringify(error.response?.data || error.message),
      );
      throw parseFalError(error);
    }
  }

  // =================================================================
  // PIXVERSE VIDEO IMPLEMENTATION (FAL.AI)
  // =================================================================
  async generatePixVerseVideo(
    model,
    prompt,
    imageFile,
    durationStr,
    aspectRatio,
    resolution,
    wantsAudio,
  ) {
    console.log(`🚀 Starting PixVerse Video Generation for model: ${model}...`);
    const axios = require("axios");

    // 1. Fetch PixVerse provider from DB dynamically
    const provider = await AIProvider.findOne({
      name: "pixverse", // Ensure this provider is named 'pixverse' in your DB
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error(
        "❌ PixVerse provider not configured or API key missing in DB",
      );
    }

    const apiKey = provider.api_key.trim();

    // 2. Map Endpoint, Duration, and Audio constraints based on model
    let endpointSuffix = "";
    let durationOptions = [];
    let supportsAudio = false;

    switch (model) {
      case "pixverse-c1":
        endpointSuffix = "/fal-ai/pixverse/c1/text-to-video";
        durationOptions = Array.from({ length: 15 }, (_, i) => i + 1); // 1 to 15
        supportsAudio = true;
        break;
      case "pixverse-v4.5":
        endpointSuffix = "/fal-ai/pixverse/v4.5/text-to-video";
        durationOptions = [5, 8];
        supportsAudio = false;
        break;
      case "pixverse-v5":
        endpointSuffix = "/fal-ai/pixverse/v5/text-to-video";
        durationOptions = [5, 8];
        supportsAudio = false;
        break;
      case "pixverse-v5.5":
        endpointSuffix = "/fal-ai/pixverse/v5.5/text-to-video";
        durationOptions = [5, 8, 10];
        supportsAudio = true;
        break;
      case "pixverse-v5.6":
        endpointSuffix = "/fal-ai/pixverse/v5.6/text-to-video";
        durationOptions = [5, 8, 10];
        supportsAudio = true;
        break;
      case "pixverse-v6":
        endpointSuffix = "/fal-ai/pixverse/v6/text-to-video";
        durationOptions = Array.from({ length: 15 }, (_, i) => i + 1); // 1 to 15
        supportsAudio = true;
        break;
      default:
        endpointSuffix = "/fal-ai/pixverse/v6/text-to-video";
        durationOptions = Array.from({ length: 15 }, (_, i) => i + 1);
        supportsAudio = true;
    }

    if (imageFile) {
      endpointSuffix = endpointSuffix.replace(
        "text-to-video",
        "image-to-video",
      );
    }

    let baseUrl = provider.base_url || "https://queue.fal.run";
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    const endpoint = `${baseUrl}${endpointSuffix}`;

    console.log(`📤 Sending request to PixVerse Queue: ${endpoint}`);

    // 3. Headers
    const headers = {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    };

    // 4. Parse & Validate Duration
    let parsedDuration = 5; // Safe default
    if (durationStr) {
      const val = parseInt(durationStr.replace("s", ""));
      if (durationOptions.includes(val)) {
        parsedDuration = val;
      }
    }

    // 5. Parse & Validate Resolution
    let mappedResolution = "720p"; // Default
    if (resolution) {
      const resLower = resolution.toLowerCase();
      if (resLower.includes("1080")) mappedResolution = "1080p";
      else if (resLower.includes("720")) mappedResolution = "720p";
      else if (resLower.includes("540")) mappedResolution = "540p";
      else if (resLower.includes("360")) mappedResolution = "360p";
    }

    // 6. Build Payload
    const body = {
      prompt: prompt,
      aspect_ratio: aspectRatio || "16:9",
      duration: parsedDuration,
      resolution: mappedResolution,
    };

    // Safely apply audio boolean only if the model permits it
    if (supportsAudio) {
      body.generate_audio_switch = wantsAudio === true || wantsAudio === "yes";
    }

    if (imageFile) {
      const base64Image = imageFile.buffer.toString("base64");
      const mimeType = imageFile.mimetype || "image/png";
      body.image_url = `data:${mimeType};base64,${base64Image}`;
    }

    try {
      // Step 1: Submit the request to Queue
      const createRes = await axios.post(endpoint, body, { headers });

      const requestId = createRes.data?.request_id;
      const statusUrl = createRes.data?.status_url;
      const responseUrl = createRes.data?.response_url;

      if (!requestId || !statusUrl)
        throw new Error(
          "No request ID or status URL returned from PixVerse API",
        );

      console.log(`✅ Job queued. Request ID: ${requestId}`);

      let isReady = false;
      let videoUrl = null;

      // Step 2: Poll for completion
      for (let i = 0; i < 90; i++) {
        // Poll up to 7.5 mins
        console.log(`⏳ Polling attempt ${i + 1} for PixVerse task...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusRes = await axios.get(statusUrl, { headers });
        const status = statusRes.data?.status;
        console.log(`📌 Status: ${status}`);

        if (status === "COMPLETED") {
          isReady = true;
          const resultRes = await axios.get(responseUrl, { headers });
          videoUrl = resultRes.data?.video?.url || resultRes.data?.url;
          console.log("✅ PixVerse Generation Complete!");
          break;
        }

        if (status === "ERROR" || status === "FAILED") {
          throw new Error(
            statusRes.data?.error || "PixVerse generation failed",
          );
        }
      }

      if (!isReady || !videoUrl)
        throw new Error("PixVerse video generation timeout or no URL returned");

      // Step 3: Download the final video binary
      console.log("⬇️ Downloading PixVerse video content...");
      const videoRes = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });
      return Buffer.from(videoRes.data);
    } catch (error) {
      console.error(
        "🔥 PixVerse API error:",
        JSON.stringify(error.response?.data || error.message),
      );
      throw parseFalError(error);
    }
  }
  // =================================================================
  // IDEOGRAM IMPLEMENTATION
  // =================================================================
  async generateIdeogramImage(model, prompt, imageFile = null, ratio = "1:1") {
    console.log(`🚀 Starting Ideogram Generation for model: ${model}...`);
    console.log(
      `🖼️ Image: ${imageFile ? "Yes (remix/i2i mode)" : "No (text-to-image mode)"}`,
    );

    const provider = await AIProvider.findOne({
      name: "ideogram",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key)
      throw new Error("Ideogram provider missing");

    const apiKey = provider.api_key.trim();

    // 1. Create a safe base ratio (e.g., "16:9" becomes "16x9")
    let baseRatio = ratio.replace(":", "x");

    // Ensure it strictly matches Ideogram's allowed list, default to "1x1" if weird
    const validIdeogramRatios = [
      "1x3",
      "3x1",
      "1x2",
      "2x1",
      "9x16",
      "16x9",
      "10x16",
      "16x10",
      "2x3",
      "3x2",
      "3x4",
      "4x3",
      "4x5",
      "5x4",
      "1x1",
    ];
    if (!validIdeogramRatios.includes(baseRatio)) {
      baseRatio = "1x1";
    }

    // ✅ IMAGE-TO-IMAGE (REMIX) MODE: Use Ideogram remix endpoint when imageFile provided
    if (imageFile) {
      console.log(`🖼️ Ideogram remix mode: uploading image as reference...`);

      // Fix MIME type if it is octet-stream
      let mimeType = imageFile.mimetype;
      if (!mimeType || mimeType === "application/octet-stream") {
        const ext = (imageFile.originalname || "")
          .split(".")
          .pop()
          .toLowerCase();
        if (ext === "png") {
          mimeType = "image/png";
        } else if (ext === "webp") {
          mimeType = "image/webp";
        } else {
          mimeType = "image/jpeg";
        }
        imageFile.mimetype = mimeType;
      }

      // Ideogram remix uses multipart/form-data with image + prompt + image_weight
      const FormDataLib = require("form-data");
      const formData = new FormDataLib();

      // Attach the uploaded image using field name "image" (not "image_file"!)
      formData.append("image", imageFile.buffer, {
        filename: imageFile.originalname || "image.png",
        contentType: imageFile.mimetype || "image/png",
      });

      // Attach prompt, aspect_ratio, image_weight directly to form-data
      formData.append("prompt", prompt);
      formData.append("aspect_ratio", baseRatio);
      formData.append("image_weight", 50); // 1-100 (Default: 50)

      let endpoint = "https://api.ideogram.ai/v1/ideogram-v3/remix";

      if (model.startsWith("V_3")) {
        if (model.includes("TURBO")) {
          formData.append("rendering_speed", "TURBO");
        } else if (model.includes("QUALITY")) {
          formData.append("rendering_speed", "QUALITY");
        } else {
          formData.append("rendering_speed", "BALANCED");
        }
      }

      const response = await axios.post(endpoint, formData, {
        headers: {
          "Api-Key": apiKey,
          ...formData.getHeaders(),
        },
      });

      const imageUrl = response.data.data?.[0]?.url;
      if (!imageUrl) throw new Error("No image URL in Ideogram remix response");

      const imageRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      return Buffer.from(imageRes.data);
    }

    // ✅ TEXT-TO-IMAGE MODE (default when no imageFile)
    let endpoint = provider.base_url || "https://api.ideogram.ai/generate";
    let payload;

    // Map Ideogram model string to official API string
    let ideogramModel = model;
    if (model === "ideogram-v4" || model === "v4") {
      ideogramModel = "V_3"; // or V_3_TURBO / AUTO
    } else if (model === "v2" || model === "ideogram-v2") {
      ideogramModel = "V_2";
    } else if (model === "v2-turbo" || model === "ideogram-v2-turbo") {
      ideogramModel = "V_2_TURBO";
    }

    // 🔥 DYNAMIC V3 & V2 DETECTION 🔥
    if (ideogramModel.startsWith("V_3")) {
      console.log("⚡ V3 Model detected. Using V3 endpoint and '16x9' format.");

      endpoint = "https://api.ideogram.ai/v1/ideogram-v3/generate";

      // V3 Payload uses simple format: "16x9"
      payload = {
        prompt: prompt,
        aspect_ratio: baseRatio,
      };

      if (ideogramModel.includes("TURBO")) {
        payload.rendering_speed = "TURBO";
      } else if (ideogramModel.includes("QUALITY")) {
        payload.rendering_speed = "QUALITY";
      } else {
        payload.rendering_speed = "BALANCED";
      }
    } else {
      console.log(
        "⚡ V2 Model detected. Using legacy payload and 'ASPECT_16_9' format.",
      );

      // V2 Payload requires format: "ASPECT_16_9"
      const v2RatioFormat = `ASPECT_${baseRatio.replace("x", "_")}`;

      payload = {
        image_request: {
          prompt: prompt,
          model: ideogramModel,
          aspect_ratio: v2RatioFormat,
          magic_prompt_option: "AUTO",
        },
      };
    }

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          "Api-Key": apiKey,
          "Content-Type": "application/json",
        },
      });

      const imageUrl = response.data.data?.[0]?.url;

      if (!imageUrl) throw new Error("No image URL in response");

      const imageRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      return Buffer.from(imageRes.data);
    } catch (error) {
      console.error(
        "🔥 Ideogram API Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message,
      );
    }
  }
  // =================================================================
  // RECRAFT IMPLEMENTATION
  // =================================================================
  async generateRecraftImage(model, prompt, imageFile, ratio = "1:1") {
    console.log("======================================");
    console.log(`🚀 Starting Recraft Generation`);
    console.log(`Model: ${model}`);
    console.log(`Ratio: ${ratio}`);
    console.log(`Prompt: ${prompt}`);
    console.log("======================================");

    const provider = await AIProvider.findOne({
      name: "recraft",
      is_active: true,
    }).select("+api_key");

    if (!provider) {
      throw new Error("Recraft provider not found");
    }

    if (!provider.api_key) {
      throw new Error("Recraft API key missing");
    }

    const baseUrl =
      provider.base_url ||
      "https://external.api.recraft.ai/v1/images/generations";

    const apiKey = provider.api_key.trim();

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    const isPro = model.toLowerCase().includes("pro");

    let targetSize = "1024x1024";

    if (isPro) {
      switch (ratio) {
        case "16:9":
          targetSize = "2688x1536";
          break;
        case "9:16":
          targetSize = "1536x2688";
          break;
        default:
          targetSize = "2048x2048";
      }
    } else {
      switch (ratio) {
        case "16:9":
          targetSize = "1344x768";
          break;
        case "9:16":
          targetSize = "768x1344";
          break;
        default:
          targetSize = "1024x1024";
      }
    }

    // Determine the base URL and endpoint (generations vs imageToImage)
    // Map model ID to official Recraft API model
    let recraftModel = model;
    if (model === "recraftv4.1" || model === "recraftv4" || model === "recraftv4_pro") {
      recraftModel = "recraftv3"; // Official Recraft API currently supports "recraftv3" or "recraft20b"
    }

    let endpoint = baseUrl;
    const payload = {
      prompt,
      model: recraftModel,
    };

    if (imageFile) {
      console.log(`🖼️ Recraft image-to-image mode: attaching reference image`);

      // Fix MIME type
      let mimeType = imageFile.mimetype;
      if (!mimeType || mimeType === "application/octet-stream") {
        const ext = (imageFile.originalname || "")
          .split(".")
          .pop()
          .toLowerCase();
        if (ext === "png") {
          mimeType = "image/png";
        } else if (ext === "webp") {
          mimeType = "image/webp";
        } else {
          mimeType = "image/jpeg";
        }
        imageFile.mimetype = mimeType;
      }

      // Convert endpoint to imageToImage
      if (endpoint.endsWith("/generations")) {
        endpoint = endpoint.replace("/generations", "/imageToImage");
      } else if (!endpoint.endsWith("/imageToImage")) {
        endpoint = endpoint.endsWith("/")
          ? `${endpoint}imageToImage`
          : `${endpoint}/imageToImage`;
      }

      const base64Image = imageFile.buffer.toString("base64");
      payload.image_url = `data:${mimeType};base64,${base64Image}`;
      payload.strength = 0.5; // Similarity control
    } else {
      payload.size = targetSize;
    }

    console.log("📤 URL:", baseUrl);
    console.log("📤 Payload:", JSON.stringify(payload, null, 2));

    const start = Date.now();

    try {
      const response = await axios.post(baseUrl, payload, {
        headers,
        timeout: 180000, // 3 minutes
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      console.log("✅ Generation finished");
      console.log("Status:", response.status);
      console.log("Time:", Date.now() - start, "ms");

      console.log("Response:", JSON.stringify(response.data, null, 2));

      const imageUrl =
        response.data?.data?.[0]?.url ||
        response.data?.images?.[0]?.url ||
        response.data?.image?.url ||
        response.data?.url;

      if (!imageUrl) {
        console.error("❌ No image URL found");
        console.log(response.data);
        throw new Error("No image URL returned from Recraft");
      }

      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 180000,
        headers: {
          Connection: "close",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      console.log("✅ Image downloaded");
      const contentType = imageResponse.headers["content-type"] || "image/png";
      console.log("Downloaded Content-Type:", contentType);

      return {
        buffer: Buffer.from(imageResponse.data),
        contentType: contentType,
      };
    } catch (error) {
      console.log("======================================");
      console.error("❌ Recraft Error");
      console.error("Message:", error.message);
      console.error("Code:", error.code);

      if (error.response) {
        console.error("Status:", error.response.status);
        console.error(
          "Headers:",
          JSON.stringify(error.response.headers, null, 2),
        );
        console.error("Body:", JSON.stringify(error.response.data, null, 2));
      }

      console.error("Elapsed:", Date.now() - start, "ms");
      console.log("======================================");

      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message,
      );
    }
  }
  // =================================================================
  // KREA 2 IMPLEMENTATION
  // =================================================================
  async generateKreaImage(model, prompt, imageFile, ratio = "1:1") {
    console.log(`🚀 Starting Krea 2 Generation...`);
    const axios = require("axios");

    // 1. Fetch Krea provider from DB
    const provider = await AIProvider.findOne({
      name: "krea", // Make sure you name the provider 'krea' in your DB
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error("Krea provider missing or not configured in DB");
    }

    const apiKey = provider.api_key.trim();

    // 2. Fetch Endpoint dynamically from DB (with a safe fallback)
    const endpoint =
      provider.base_url || "https://fal.run/krea/v2/large/text-to-image";

    // 3. Prepare Payload
    const payload = {
      prompt: prompt,
      aspect_ratio: ratio,
    };

    // If image-to-image is supported/requested
    if (imageFile) {
      const base64Image = imageFile.buffer.toString("base64");
      const mimeType = imageFile.mimetype || "image/png";
      payload.image_url = `data:${mimeType};base64,${base64Image}`;
    }

    try {
      // 4. Send Request
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      // 5. Extract and Download Image
      const imageUrl = response.data.images?.[0]?.url;

      if (!imageUrl) throw new Error("No image URL in Krea response");

      const imageRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      return Buffer.from(imageRes.data);
    } catch (error) {
      console.error(
        "🔥 Krea API Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message,
      );
    }
  }
  async generateCoreImage(prompt, imageFile, ratio = "1:1", userId = null) {
    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("output_format", "png");
      formData.append("model", "sd3.5-medium"); // ✅ Using SD 3.5 Medium for "Core"

      if (imageFile) {
        // Fix MIME type
        let mimeType = imageFile.mimetype;
        if (!mimeType || mimeType === "application/octet-stream") {
          const ext = (imageFile.originalname || "")
            .split(".")
            .pop()
            .toLowerCase();
          if (ext === "png") {
            mimeType = "image/png";
          } else if (ext === "webp") {
            mimeType = "image/webp";
          } else {
            mimeType = "image/jpeg";
          }
          imageFile.mimetype = mimeType;
        }

        // Image-to-Image mode
        formData.append("image", imageFile.buffer, {
          filename: imageFile.originalname,
          contentType: imageFile.mimetype,
        });
        formData.append("mode", "image-to-image"); // ✅ Required for SD 3.5 Image-to-Image
        formData.append("strength", "0.5"); // Default strength (adjust if needed)
      } else {
        // Text-to-Image mode
        formData.append("aspect_ratio", ratio); // ✅ Aspect ratio is only for text-to-image
      }

      const headers = {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "image/*",
        ...formData.getHeaders(),
      };

      if (userId) {
        const safeId = getSafeUserId(userId);
        if (safeId) {
          headers["stability-client-user-id"] = safeId;
        }
      }

      const response = await axios.post(
        "https://api.stability.ai/v2beta/stable-image/generate/sd3", // ✅ Updated endpoint
        formData,
        {
          headers,
          responseType: "arraybuffer",
        },
      );

      return response.data; // raw PNG buffer
    } catch (error) {
      // Try to decode the buffer as JSON if available
      let apiError = null;

      if (error.response?.data) {
        try {
          const decoded = JSON.parse(
            Buffer.from(error.response.data).toString(),
          );
          apiError = decoded;
        } catch (e) {}
      }

      console.error("Stability Core (SD3.5) error:", apiError || error.message);

      throw new Error(
        `Stability Core error: ${apiError?.errors?.[0]?.message || apiError?.errors?.[0] || error.message}`,
      );
    }
  }

  async generateUltraImage(prompt, imageFile, ratio = "1:1", userId = null) {
    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("output_format", "png");
      formData.append("model", "sd3.5-large"); // ✅ Using SD 3.5 Large for "Ultra"

      if (imageFile) {
        // Fix MIME type
        let mimeType = imageFile.mimetype;
        if (!mimeType || mimeType === "application/octet-stream") {
          const ext = (imageFile.originalname || "")
            .split(".")
            .pop()
            .toLowerCase();
          if (ext === "png") {
            mimeType = "image/png";
          } else if (ext === "webp") {
            mimeType = "image/webp";
          } else {
            mimeType = "image/jpeg";
          }
          imageFile.mimetype = mimeType;
        }

        // Image-to-Image mode
        formData.append("image", imageFile.buffer, {
          filename: imageFile.originalname,
          contentType: imageFile.mimetype,
        });
        formData.append("mode", "image-to-image"); // ✅ Required for SD 3.5 Image-to-Image
        formData.append("strength", "0.35"); // Retaining your original strength preference
      } else {
        // Text-to-Image mode
        formData.append("aspect_ratio", ratio); // ✅ Aspect ratio is only for text-to-image
      }

      const headers = {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "image/*",
        ...formData.getHeaders(),
      };

      if (userId) {
        const safeId = getSafeUserId(userId);
        if (safeId) {
          headers["stability-client-user-id"] = safeId;
        }
      }

      const response = await axios.post(
        "https://api.stability.ai/v2beta/stable-image/generate/sd3", // ✅ Updated endpoint
        formData,
        {
          headers,
          responseType: "arraybuffer",
        },
      );

      return response.data; // raw PNG buffer
    } catch (error) {
      let apiError = null;

      if (error.response?.data) {
        try {
          const decoded = JSON.parse(
            Buffer.from(error.response.data).toString(),
          );
          apiError = decoded;
        } catch (e) {}
      }

      console.error(
        "Stability Ultra (SD3.5) error:",
        apiError || error.message,
      );

      throw new Error(
        `Stability Ultra error: ${apiError?.errors?.[0]?.message || apiError?.errors?.[0] || error.message}`,
      );
    }
  }

  // =================================================================
  // STABILITY AI: STABLE FAST 3D
  // =================================================================
  async generateStableFast3D(prompt, imageFile, userId = null) {
    try {
      if (!imageFile) {
        throw new Error("An image file is required for 3D generation.");
      }

      const formData = new FormData();
      formData.append("image", imageFile.buffer, {
        filename: imageFile.originalname,
        contentType: imageFile.mimetype,
      });

      // Extract optional parameters dynamically from the prompt string using Regex
      if (prompt) {
        const textureMatch = prompt.match(
          /(?:texture_resolution|texture resolution)\s*[:=]\s*(\d+)/i,
        );
        if (textureMatch && ["512", "1024", "2048"].includes(textureMatch[1])) {
          formData.append("texture_resolution", textureMatch[1]);
        }

        const fgMatch = prompt.match(
          /(?:foreground_ratio|foreground ratio)\s*[:=]\s*([0-9.]+)/i,
        );
        if (fgMatch) {
          formData.append("foreground_ratio", fgMatch[1]);
        }

        const remeshMatch = prompt.match(
          /remesh\s*[:=]\s*(none|quad|triangle)/i,
        );
        if (remeshMatch) {
          formData.append("remesh", remeshMatch[1].toLowerCase());
        }

        const vertexMatch = prompt.match(
          /(?:vertex_count|vertex count)\s*[:=]\s*(-?\d+)/i,
        );
        if (vertexMatch) {
          formData.append("vertex_count", vertexMatch[1]);
        }
      }

      const headers = {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        ...formData.getHeaders(),
      };

      if (userId) {
        const safeId = getSafeUserId(userId);
        if (safeId) {
          headers["stability-client-user-id"] = safeId;
        }
      }

      const response = await axios.post(
        "https://api.stability.ai/v2beta/3d/stable-fast-3d",
        formData,
        {
          headers,
          responseType: "arraybuffer", // To handle binary .glb data
        },
      );

      return response.data;
    } catch (error) {
      let apiError = null;
      if (error.response?.data) {
        try {
          apiError = JSON.parse(Buffer.from(error.response.data).toString());
        } catch (e) {}
      }
      console.error("Stability 3D error:", apiError || error.message);
      throw new Error(
        `Stability 3D error: ${apiError?.errors?.[0]?.message || error.message}`,
      );
    }
  }

  // =================================================================
  // STABILITY AI: SKETCH TO IMAGE
  // =================================================================
  async generateSketchToImage(prompt, imageFile, userId = null) {
    try {
      if (!imageFile) {
        throw new Error("A sketch image file is required for Sketch to Image.");
      }

      let cleanPrompt = prompt || "";
      const formData = new FormData();

      // Extract control_strength (Default: 0.7)
      const strengthMatch = cleanPrompt.match(
        /(?:control_strength|control strength)\s*[:=]\s*([0-9.]+)/i,
      );
      const controlStrength = strengthMatch ? strengthMatch[1] : "0.7";
      // Remove it from prompt
      cleanPrompt = cleanPrompt.replace(
        /,?\s*(?:control_strength|control strength)\s*[:=]\s*[0-9.]+/i,
        "",
      );

      // Extract output_format (Default: png)
      const formatMatch = cleanPrompt.match(
        /(?:output_format|output format)\s*[:=]\s*(png|jpeg|webp)/i,
      );
      const outputFormat = formatMatch ? formatMatch[1].toLowerCase() : "png";
      // Remove it from prompt
      cleanPrompt = cleanPrompt.replace(
        /,?\s*(?:output_format|output format)\s*[:=]\s*(png|jpeg|webp)/i,
        "",
      );

      cleanPrompt = cleanPrompt
        .replace(
          /,?\s*(?:aspect_ratio|aspect ratio|aspect-ratio)\s*[:=]\s*\d+\s*:\s*\d+/i,
          "",
        )
        .trim();

      // Clean up any double commas or stray trailing commas left over from removing parameters
      cleanPrompt = cleanPrompt
        .replace(/,\s*,/g, ",")
        .replace(/,\s*$/, "")
        .trim();

      formData.append("prompt", cleanPrompt);
      formData.append("output_format", outputFormat);
      formData.append("control_strength", controlStrength);
      formData.append("image", imageFile.buffer, {
        filename: imageFile.originalname,
        contentType: imageFile.mimetype,
      });

      const headers = {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "image/*",
        ...formData.getHeaders(),
      };

      if (userId) {
        const safeId = getSafeUserId(userId);
        if (safeId) {
          headers["stability-client-user-id"] = safeId;
        }
      }

      const response = await axios.post(
        "https://api.stability.ai/v2beta/stable-image/control/sketch",
        formData,
        {
          headers,
          responseType: "arraybuffer",
        },
      );

      return response.data;
    } catch (error) {
      let apiError = null;
      if (error.response?.data) {
        try {
          apiError = JSON.parse(Buffer.from(error.response.data).toString());
        } catch (e) {}
      }
      console.error("Stability Sketch error:", apiError || error.message);
      throw new Error(
        `Stability Sketch error: ${apiError?.errors?.[0]?.message || error.message}`,
      );
    }
  }

  // =================================================================
  // KLING IMAGE IMPLEMENTATION (FAL.AI)
  // =================================================================
  async generateKlingO1Image(prompt, imageFile, ratio = "auto", model = "kling-image-o1") {
    console.log(`🚀 Starting Kling Image Generation for ${model}...`);
    const axios = require("axios");

    // 1. Fetch Kling provider from DB
    const provider = await AIProvider.findOne({
      name: "kling",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      throw new Error("Kling provider missing or not configured in DB");
    }

    const apiKey = provider.api_key.trim();
    let baseUrl = provider.base_url || "https://queue.fal.run";

    if (baseUrl.includes("/fal-ai/")) {
      baseUrl = baseUrl.split("/fal-ai/")[0];
    }
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Map model endpoint
    let falPath = imageFile
      ? "fal-ai/kling-image/v3/image-to-image"
      : "fal-ai/kling-image/v3/text-to-image";

    if (model === "kling-image-v3" || model === "kling-image-o3" || model === "kling-image-o1") {
      falPath = imageFile
        ? "fal-ai/kling-image/v3/image-to-image"
        : "fal-ai/kling-image/v3/text-to-image";
    }
    const endpoint = `${baseUrl}/${falPath}`;
    console.log(`📤 Sending Kling request to: ${endpoint}`);

    const headers = {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    };

    let cleanPrompt = prompt || "";
    let resolution = "1K";
    const resMatch = cleanPrompt.match(/(?:resolution)\s*[:=]\s*(1K|2K)/i);
    if (resMatch) {
      resolution = resMatch[1].toUpperCase();
      cleanPrompt = cleanPrompt
        .replace(/,?\s*(?:resolution)\s*[:=]\s*(1K|2K)/i, "")
        .trim();
    }

    let mappedRatio = "auto";
    const validRatios = [
      "auto",
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "21:9",
    ];
    if (validRatios.includes(ratio)) {
      mappedRatio = ratio;
    }

    const body = {
      prompt: cleanPrompt,
      aspect_ratio: mappedRatio,
      resolution: resolution,
    };

    if (imageFile) {
      const base64Image = imageFile.buffer.toString("base64");
      const mimeType = imageFile.mimetype || "image/png";
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      body.image_url = dataUri;
      body.image_urls = [dataUri];
      if (!cleanPrompt.includes("@Image")) {
        body.prompt += " applied to @Image1";
      }
    }

    try {
      const createRes = await axios.post(endpoint, body, { headers });
      const requestId = createRes.data?.request_id;
      const statusUrl = createRes.data?.status_url;
      const responseUrl = createRes.data?.response_url;

      if (!requestId || !statusUrl) {
        throw new Error("No request ID or status URL returned from API");
      }

      console.log(`✅ Job queued. Request ID: ${requestId}`);

      let isReady = false;
      let imageUrl = null;

      for (let i = 0; i < 36; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const statusRes = await axios.get(statusUrl, { headers });
        const status = statusRes.data?.status;

        if (status === "COMPLETED") {
          isReady = true;
          const resultRes = await axios.get(responseUrl, { headers });
          imageUrl = resultRes.data?.images?.[0]?.url;
          break;
        }

        if (status === "ERROR" || status === "FAILED") {
          throw new Error(
            statusRes.data?.error || "Kling image generation failed",
          );
        }
      }

      if (!isReady || !imageUrl) {
        throw new Error("Kling image generation timeout or no URL returned");
      }

      const imageRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      return Buffer.from(imageRes.data);
    } catch (error) {
      let apiError =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message;
      if (typeof apiError === "object") apiError = JSON.stringify(apiError);
      console.error("🔥 Kling Image error:", apiError);
      throw new Error(`Kling Image error: ${apiError}`);
    }
  }

  // =================================================================
  // QWEN IMAGE IMPLEMENTATION (FAL.AI)
  // =================================================================
  async generateQwenImage(model, prompt, imageFile, ratio = "1:1") {
    console.log(`🚀 Starting Qwen Image Generation for ${model}...`);
    const axios = require("axios");

    // Fetch Fal / Qwen Image provider
    const provider =
      (await AIProvider.findOne({ name: "qwen_image", is_active: true }).select("+api_key")) ||
      (await AIProvider.findOne({ name: "kling", is_active: true }).select("+api_key")) ||
      (await AIProvider.findOne({ name: "flux", is_active: true }).select("+api_key")) ||
      (process.env.FAL_API_KEY ? { api_key: process.env.FAL_API_KEY, base_url: "https://queue.fal.run" } : null);

    if (!provider || !provider.api_key) {
      throw new Error("fal.ai / Qwen Image provider (qwen_image) not configured in DB");
    }

    const apiKey = provider.api_key.trim();
    console.log("apiKey", apiKey);
    let baseUrl = provider.base_url || "https://queue.fal.run";

    if (baseUrl.includes("/fal-ai/")) {
      baseUrl = baseUrl.split("/fal-ai/")[0];
    }
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    let falPath;
    if (model === "qwen-image-2-pro") {
      falPath = imageFile
        ? "fal-ai/qwen-image-2/pro/edit"
        : "fal-ai/qwen-image-2/pro/text-to-image";
    } else {
      falPath = imageFile
        ? "fal-ai/qwen-image-edit"
        : "fal-ai/qwen-image";
    }
    const endpoint = `${baseUrl}/${falPath}`;
    console.log(`📤 Sending Qwen request to: ${endpoint}`);

    const headers = {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    };

    let imageSize = "square_hd";
    if (ratio === "16:9") {
      imageSize = "landscape_16_9";
    } else if (ratio === "9:16") {
      imageSize = "portrait_16_9";
    } else if (ratio === "4:3") {
      imageSize = "landscape_4_3";
    } else if (ratio === "3:4") {
      imageSize = "portrait_4_3";
    } else if (ratio === "3:2") {
      imageSize = { width: 1200, height: 800 };
    } else if (ratio === "2:3") {
      imageSize = { width: 800, height: 1200 };
    } else {
      imageSize = "square_hd";
    }

    const body = {
      prompt: prompt,
      image_size: imageSize,
    };

    if (imageFile) {
      let uploadedUrl = null;
      try {
        const mimeType = imageFile.mimetype || "image/png";
        const fileName = `image_${Date.now()}.${mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png"}`;
        const initRes = await axios.post(
          "https://rest.alpha.fal.ai/storage/upload/initiate",
          {
            file_name: fileName,
            content_type: mimeType,
          },
          {
            headers: {
              Authorization: `Key ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (initRes.data?.upload_url) {
          await axios.put(initRes.data.upload_url, imageFile.buffer, {
            headers: {
              "Content-Type": mimeType,
            },
          });
          uploadedUrl = initRes.data.file_url;
        }
      } catch (uploadErr) {
        console.warn("⚠️ Fal storage upload failed, falling back to data URI:", uploadErr.message);
      }

      const finalImageUrl = uploadedUrl || `data:${imageFile.mimetype || "image/png"};base64,${imageFile.buffer.toString("base64")}`;
      body.image_url = finalImageUrl;
      body.image_urls = [finalImageUrl];
    }

    try {
      const createRes = await axios.post(endpoint, body, { headers });
      const requestId = createRes.data?.request_id;
      const statusUrl = createRes.data?.status_url;
      const responseUrl = createRes.data?.response_url;

      if (!requestId || !statusUrl) {
        // Synchronous fallback
        const syncImg = createRes.data?.images?.[0]?.url;
        if (syncImg) {
          const res = await axios.get(syncImg, { responseType: "arraybuffer" });
          return Buffer.from(res.data);
        }
        throw new Error("No request ID or image returned from Qwen API");
      }

      let isReady = false;
      let imageUrl = null;

      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const statusRes = await axios.get(statusUrl, { headers });
        const status = statusRes.data?.status;

        if (status === "COMPLETED") {
          isReady = true;
          const resultRes = await axios.get(responseUrl, { headers });
          imageUrl = resultRes.data?.images?.[0]?.url;
          break;
        }

        if (status === "ERROR" || status === "FAILED") {
          throw new Error(statusRes.data?.error || "Qwen image generation failed");
        }
      }

      if (!isReady || !imageUrl) {
        throw new Error("Qwen image generation timeout");
      }

      const imageRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
      return Buffer.from(imageRes.data);
    } catch (error) {
      let apiError = error.response?.data?.error || error.response?.data?.detail || error.message;
      if (typeof apiError === "object") apiError = JSON.stringify(apiError);
      console.error("🔥 Qwen Image error:", apiError);
      throw new Error(`Qwen Image error: ${apiError}`);
    }
  }

  async generateAiFilter(prompt, imageFile, strength) {
    console.log("=== Starting generateAiFilter (Native Google Gemini) ===");
    console.log("Prompt:", prompt);
    console.log("Strength:", strength);

    try {
      if (!imageFile) {
        console.error(
          "Validation Failed: No image file provided to generateAiFilter",
        );
        throw new Error("Image file is required for AI Filter.");
      }

      console.log(
        `Image received: ${imageFile.originalname} | Type: ${imageFile.mimetype} | Size: ${imageFile.buffer.length} bytes`,
      );

      const genAI = await this.getAIClient("google");
      const imageModel = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-image-preview",
      });

      let mimeType = imageFile.mimetype || "image/jpeg";
      if (
        mimeType === "application/octet-stream" ||
        !mimeType?.startsWith("image/")
      ) {
        const ext = imageFile.originalname?.split(".").pop()?.toLowerCase();
        if (ext === "png") {
          mimeType = "image/png";
        } else if (ext === "webp") {
          mimeType = "image/webp";
        } else if (ext === "gif") {
          mimeType = "image/gif";
        } else {
          mimeType = "image/jpeg";
        }
      }

      const parts = [
        { text: prompt ? prompt.trim() : "" },
        {
          inlineData: {
            data: imageFile.buffer.toString("base64"),
            mimeType: mimeType,
          },
        },
      ];

      const result = await imageModel.generateContent({
        contents: [{ role: "user", parts }],
      });

      if (
        !result.response ||
        !result.response.candidates ||
        result.response.candidates.length === 0
      ) {
        const feedback = result.response?.promptFeedback;
        if (feedback && feedback.blockReason) {
          throw new Error(
            `Google AI policy blocked this filter request. Reason: ${feedback.blockReason}`,
          );
        }
        throw new Error(
          "Google AI blocked this request or returned an empty response due to strict safety filters.",
        );
      }

      const firstCandidate = result.response.candidates[0];
      if (!firstCandidate.content) {
        throw new Error(
          `Google AI generation stopped. Reason: ${firstCandidate.finishReason || "Safety Filter Triggered"}`,
        );
      }

      const imagePart = firstCandidate.content?.parts?.find((p) => p.inlineData);
      if (!imagePart) {
        const textPart = firstCandidate.content?.parts?.find((p) => p.text);
        const aiReply = textPart ? textPart.text : "Unknown text response";
        throw new Error(`Google AI refused the filter. AI said: "${aiReply}"`);
      }

      console.log("✅ Success! Received response from native Google Gemini API.");
      console.log("=== Finished generateAiFilter ===");

      return Buffer.from(imagePart.inlineData.data, "base64");
    } catch (error) {
      console.error("❌ === Error in generateAiFilter ===");
      console.error("Error Message:", error.message);
      throw error;
    }
  }
  ensureMarkdownPrompt(prompt) {
    const markdownInstruction =
      "Give me the response in proper markdown format. Do not include any code block markers like ```markdown or ``` in your response. Only return pure markdown content.";
    // Avoid duplicate instruction if already present (case-insensitive, ignore whitespace)
    const normalizedPrompt = prompt
      ? prompt.replace(/\s+/g, "").toLowerCase()
      : "";
    const normalizedInstruction =
      "givemetheresponseinpropermarkdownformat.donotincludeanycodeblockmarkerslike```markdownor```inyourresponse.onlyreturnpuremarkdowncontent."
        .replace(/\s+/g, "")
        .toLowerCase();
    if (
      prompt &&
      !normalizedPrompt.includes("onlyreturnpuremarkdowncontent") &&
      !normalizedPrompt.includes(normalizedInstruction)
    ) {
      return `${prompt.trim()}\n\n${markdownInstruction}`;
    }
    return prompt;
  }

  // OpenAI implementation with image support
  async callOpenAI(provider, model, prompt, systemPrompt, imageUrl = null) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];

      // Build user message with optional image
      const userMessage = { role: "user", content: [] };

      // Add text content
      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      // Add image if provided
      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      }

      // If no image, use simple string format for backward compatibility
      if (!imageUrl) {
        userMessage.content = prompt;
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: provider.max_tokens,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        text: response.data.choices[0].message.content,
        tokens_used: response.data.usage.total_tokens,
      };
    } catch (error) {
      console.error("OpenAI API error:", error.response?.data || error.message);
      throw new Error(
        `OpenAI API error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  //fast response
  //   async callOpenAIStreaming(
  //     provider,
  //     model,
  //     prompt,
  //     systemPrompt,
  //     onChunk,
  //     onComplete,
  //     onError,
  //     imageUrl = null
  //   ) {
  //     try {
  //       const isModelQuestion =
  //         /\b(model|which model|what.*model|updated model)\b/i.test(prompt);

  //       // ✅ Override system prompt if it's a gpt-5 variant & user asks
  //       if (
  //         (model.model === "gpt-5-mini" ||
  //           model.model === "gpt-5-nano" ||
  //           model.model === "gpt-5") &&
  //         isModelQuestion
  //       ) {
  //         const formattedModel =
  //           model.model.charAt(0).toUpperCase() + model.model.slice(1);

  //         systemPrompt = `You are a helpful AI assistant. Provide clear, concise, and accurate answers based on the user's prompt. and if You are ChatGPT then Always identify yourself using the exact model string provided in the request payload.
  // In this case, the model is '${formattedModel}', so you must say:
  // "I am based on the '${formattedModel}' model."
  // Do not mention GPT-4. Do not hedge or disclaim.`;
  //       } else {
  //         // fallback default system prompt if none is passed
  //         systemPrompt =
  //           systemPrompt ||
  //           "You are a helpful AI assistant. Provide clear, concise, and accurate answers based on the user's prompt.";
  //       }

  //       const messages = [{ role: "system", content: systemPrompt }];

  //       // Build user message with optional image
  //       const userMessage = { role: "user", content: [] };

  //       // Add text content
  //       userMessage.content.push({
  //         type: "text",
  //         text: this.ensureMarkdownPrompt(prompt),
  //       });

  //       // Add image if provided
  //       if (imageUrl) {
  //         userMessage.content.push({
  //           type: "image_url",
  //           image_url: {
  //             url: imageUrl,
  //           },
  //         });
  //       }

  //       // If no image, use simple string format for backward compatibility
  //       if (!imageUrl) {
  //         userMessage.content = this.ensureMarkdownPrompt(prompt);
  //       }

  //       messages.push(userMessage);

  //       // 🔑 Build request payload conditionally
  //       let payload = {
  //         model: model.model,
  //         messages,
  //         stream: true,
  //       };

  //       if (
  //         model.model === "gpt-5-mini" ||
  //         model.model === "gpt-5-nano" ||
  //         model.model === "gpt-5"
  //       ) {
  //         payload.max_completion_tokens = provider.max_tokens;
  //         // no temperature
  //       } else {
  //         payload.max_tokens = provider.max_tokens;
  //         payload.temperature = 0.7;
  //       }

  //       const response = await axios.post(
  //         `${provider.base_url}/chat/completions`,
  //         payload,
  //         {
  //           headers: {
  //             Authorization: `Bearer ${provider.api_key}`,
  //             "Content-Type": "application/json",
  //           },
  //           responseType: "stream",
  //         }
  //       );

  //       let fullResponse = "";
  //       let totalTokens = 0;

  //       response.data.on("data", (chunk) => {
  //         const lines = chunk
  //           .toString()
  //           .split("\n")
  //           .filter((line) => line.trim() !== "");

  //         for (const line of lines) {
  //           if (line.includes("[DONE]")) {
  //             if (onComplete) {
  //               onComplete({
  //                 fullResponse,
  //                 provider: provider.name,
  //                 model: model.model,
  //                 tokens_used: totalTokens || 1,
  //               });
  //             }
  //             return;
  //           }

  //           if (line.startsWith("data: ")) {
  //             try {
  //               const data = JSON.parse(line.slice(6));

  //               if (
  //                 data.choices &&
  //                 data.choices[0] &&
  //                 data.choices[0].delta &&
  //                 data.choices[0].delta.content
  //               ) {
  //                 const content = data.choices[0].delta.content;
  //                 fullResponse += content;

  //                 if (onChunk) {
  //                   onChunk({
  //                     content,
  //                     fullResponse,
  //                     provider: provider.name,
  //                     model: model.model,
  //                   });
  //                 }
  //               }

  //               if (data.usage) {
  //                 totalTokens = data.usage.total_tokens;
  //               }
  //             } catch (parseError) {
  //               console.error("Error parsing streaming data:", parseError);
  //             }
  //           }
  //         }
  //       });

  //       response.data.on("end", () => {
  //         if (onComplete) {
  //           onComplete({
  //             fullResponse,
  //             provider: provider.name,
  //             model: model.model,
  //             tokens_used: totalTokens || 1,
  //           });
  //         }
  //       });

  //       response.data.on("error", (error) => {
  //         console.error("Stream error:", error);
  //         if (onError) onError(error);
  //       });
  //     } catch (error) {
  //       console.error(
  //         "OpenAI streaming error:",
  //         error.response?.data || error.message
  //       );
  //       if (onError) onError(error);
  //       throw new Error(
  //         `OpenAI streaming error: ${
  //           error.response?.data?.error?.message || error.message
  //         }`
  //       );
  //     }
  //   }

  // ✅ CUSTOM HANDLER: GPT-5.2 (Fixed 400 Error)
  async callGPT52Streaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
  ) {
    try {
      // 1. Prepare messages using "developer" role as per your working curl
      const messages = [
        {
          role: "developer", // Changed from 'system' to 'developer' to match your curl
          content: systemPrompt || "You are a helpful assistant.",
        },
        {
          role: "user",
          content: this.ensureMarkdownPrompt(prompt),
        },
      ];

      // 2. Minimal payload - removed temperature/max_tokens to avoid 400 Bad Request
      const payload = {
        model: "gpt-5.2", // Ensure this matches exactly what works in curl
        messages: messages,
        stream: true,
      };

      // 3. Call the standard endpoint
      const response = await axios.post(
        `${provider.base_url}/chat/completions`, // usually https://api.openai.com/v1/chat/completions
        payload,
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;

      // // 4. Handle standard SSE Streaming
      // response.data.on("data", (chunk) => {
      //   const lines = chunk
      //     .toString()
      //     .split("\n")
      //     .filter((line) => line.trim() !== "");

      let buffer = ""; // ✅ FIX: buffer prevents split-line corruption across TCP packets

      // 4. Handle standard SSE Streaming
      response.data.on("data", (chunk) => {
        buffer += chunk.toString(); // ✅ accumulate incoming data
        const lines = buffer.split("\n");
        buffer = lines.pop(); // ✅ keep incomplete last line for next chunk

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta?.content;

              if (delta) {
                fullResponse += delta;

                if (onChunk) {
                  onChunk({
                    content: delta,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }

              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (err) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "GPT 5.2 API error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `GPT 5.2 API error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  // ✅ FAST RESPONSE (No Buffering)
  //small response
  async callOpenAIStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      // Only check the current prompt (not old history) to see if user is asking what model is being used
      const latestUserPrompt = (prompt.split("{{historyData}}")[0] || prompt).trim();
      const isModelQuestion =
        /\b(which model|what model|what version|which ai model|who are you|what is your model)\b/i.test(latestUserPrompt);
      const defaultSystemPrompt =
        "You are a helpful AI assistant. Don't think too long, send 1 to 2 sentence very quick responses. You can send response up to 150 words only if necessary. You can send response above 150 words only if absolutely necessary. Always try to respond within 1 to 3 seconds if possible. Never think for more than 10 seconds, always think and respond within 10 seconds or less. The faster you respond, the better.";

      // Override system prompt only if user specifically asks about the model
      if (
        [
          "gpt-5-mini",
          "gpt-5-nano",
          "gpt-5",
          "gpt-5.2",
          "gpt-5.1",
          "gpt-5.4-nano",
          "gpt-5.4-mini",
          "gpt-5.4",
          "gpt-5.4-pro",
          "gpt-5.5",
          "gpt-5.5-pro",
          "gpt-5.6-luna",
          "gpt-5.6-terra",
        ].includes(model.model) &&
        isModelQuestion
      ) {
        const formattedModel =
          model.model.charAt(0).toUpperCase() + model.model.slice(1);

        systemPrompt = `You are a helpful AI assistant. If asked which model you are, state that you are based on the '${formattedModel}' model. Do not mention GPT-4. Do not hedge or disclaim.`;
      } else {
        systemPrompt = systemPrompt?.trim() || defaultSystemPrompt;
      }

      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: prompt,
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }

      if (!imageUrl) {
        userMessage.content = prompt;
      }

      messages.push(userMessage);

      const isResponsesApiModel = ["gpt-5.4-pro", "gpt-5.5-pro"].includes(
        model.model,
      );

      let payload;

      if (isResponsesApiModel) {
        payload = {
          model: model.model,
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: systemPrompt,
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt,
                },
              ],
            },
          ],
          stream: true,
          max_output_tokens: max_tokens || provider.max_tokens,
        };
      } else {
        payload = {
          model: model.model,
          messages,
          stream: true,
        };

        if (
          [
            "gpt-5-mini",
            "gpt-5-nano",
            "gpt-5",
            "gpt-5.1",
            "gpt-5.4-nano",
            "gpt-5.4-mini",
            "gpt-5.4",
            "gpt-5.5",
            "gpt-5.6-luna",
            "gpt-5.6-terra",
          ].includes(model.model)
        ) {
          payload.max_completion_tokens = max_tokens || provider.max_tokens;
        } else {
          payload.max_tokens = max_tokens || provider.max_tokens;
          payload.temperature = 0.7;
        }
      }

      const cleanBaseUrl = provider.base_url
        ? provider.base_url.replace(/\/+$/, "")
        : "";
      const endpoint = isResponsesApiModel ? "/responses" : "/chat/completions";

      const response = await axios.post(`${cleanBaseUrl}${endpoint}`, payload, {
        headers: {
          Authorization: `Bearer ${provider.api_key}`,
          "Content-Type": "application/json",
        },
        responseType: "stream",
      });

      let fullResponse = "";
      let totalTokens = 0;

      let buffer = ""; // ✅ FIX: buffer prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString(); // ✅ accumulate incoming data
        const lines = buffer.split("\n");
        buffer = lines.pop(); // ✅ keep incomplete last line for next chunk

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              let delta = "";

              if (isResponsesApiModel) {
                if (data.type === "response.output_text.delta") {
                  delta =
                    typeof data.delta === "string"
                      ? data.delta
                      : data.delta?.text || "";
                } else if (data.type === "response.completed") {
                  if (data.response?.usage) {
                    totalTokens =
                      data.response.usage.total_tokens ||
                      data.response.usage.output_tokens ||
                      totalTokens;
                  }
                }
              } else {
                delta = data.choices?.[0]?.delta?.content || "";
              }

              if (delta) {
                fullResponse += delta;

                // FIXED: Send chunk IMMEDIATELY. Do not wait for punctuation or length.
                if (onChunk) {
                  onChunk({
                    content: delta, // Send just the new piece immediately
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }

              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (err) {
              console.error("Error parsing OpenAI streaming data:", err);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "OpenAI streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `OpenAI streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }
  // DeepSeek implementation with image support
  async callDeepSeek(provider, model, prompt, systemPrompt, imageUrl = null) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];

      // Build user message with optional image
      const userMessage = { role: "user", content: [] };

      // Add text content
      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      // Add image if provided
      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      }

      // If no image, use simple string format for backward compatibility
      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: provider.max_tokens,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        text: response.data.choices[0].message.content,
        tokens_used: response.data.usage?.total_tokens || 1,
      };
    } catch (error) {
      console.error(
        "DeepSeek API error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `DeepSeek API error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callDeepSeekStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];

      // Build user message with optional image
      const userMessage = { role: "user", content: [] };

      // Add text content
      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      // Add image if provided
      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      }

      // If no image, use simple string format for backward compatibility
      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;

      // response.data.on("data", (chunk) => {
      //   const lines = chunk
      //     .toString()
      //     .split("\n")
      //     .filter((line) => line.trim() !== "");
      let buffer = ""; // ✅ FIX: buffer prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString(); // ✅ accumulate
        const lines = buffer.split("\n");
        buffer = lines.pop(); // ✅ keep incomplete last line

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }

              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error("Error parsing streaming data:", parseError);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "DeepSeek streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `DeepSeek streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  // Anthropic implementation with image support
  async callAnthropic(provider, model, prompt, systemPrompt, imageUrl = null) {
    try {
      const messages = [];

      // Build user message with optional image
      const userMessage = { role: "user", content: [] };

      // Add text content
      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      // Add image if provided
      if (imageUrl) {
        if (imageUrl.startsWith("data:")) {
          const parts = imageUrl.split(",");
          const mimeMatch = parts[0].match(/data:(.*?);base64/);
          const mediaType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          const data = parts[1] || "";
          userMessage.content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: data,
            },
          });
        } else {
          userMessage.content.push({
            type: "image",
            source: {
              type: "url",
              url: imageUrl,
            },
          });
        }
      }

      // If no image, use simple string format for backward compatibility
      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/v1/messages`,
        {
          model: model.model,
          max_tokens: Math.min(provider.max_tokens, 4096),
          temperature: 0.7,
          system: systemPrompt || "",
          messages: messages,
        },
        {
          headers: {
            "x-api-key": provider.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
        },
      );

      return {
        text: response.data.content?.[0]?.text || "",
        tokens_used:
          response.data.usage?.input_tokens +
            response.data.usage?.output_tokens || 1,
      };
    } catch (error) {
      console.error(
        "Anthropic API error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Anthropic API error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callAnthropicStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [];

      // Build user message with optional image
      const userMessage = { role: "user", content: [] };

      // Add text content
      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      // Add image if provided
      if (imageUrl) {
        if (imageUrl.startsWith("data:")) {
          const parts = imageUrl.split(",");
          const mimeMatch = parts[0].match(/data:(.*?);base64/);
          const mediaType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          const data = parts[1] || "";
          userMessage.content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: data,
            },
          });
        } else {
          userMessage.content.push({
            type: "image",
            source: {
              type: "url",
              url: imageUrl,
            },
          });
        }
      }

      // If no image, use simple string format for backward compatibility
      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const payload = {
        model: model.model,
        max_tokens: max_tokens || Math.min(provider.max_tokens, 4096),
        system: systemPrompt || "",
        messages: messages,
        stream: true,
      };

      // Conditionally add temperature only for models that support it
      if (!["claude-sonnet-5", "claude-opus-4-7", "claude-opus-4-8"].includes(model.model)) {
        payload.temperature = 0.7;
      }

      const response = await axios.post(
        `${provider.base_url}/v1/messages`,
        payload,
        {
          headers: {
            "x-api-key": provider.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = "";
      let actualModelUsed = null; // Track the actual model from API response

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim() === "" || !line.startsWith("data: ")) continue;
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                actualModel: actualModelUsed, // Add separate field for actual model
                requestedModel: model.model, // Also include what was requested
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }
          try {
            const data = JSON.parse(dataStr);

            // Capture the actual model used from the response
            if (data.model) {
              actualModelUsed = data.model;
              console.log(`Actual model used: ${actualModelUsed}`);
            }

            // Handle message_start event which contains model info
            if (data.type === "message_start" && data.message?.model) {
              actualModelUsed = data.message.model;
              console.log(`Model from message_start: ${actualModelUsed}`);
            }

            if (data.type === "content_block_delta" && data.delta?.text) {
              const content = data.delta.text;
              fullResponse += content;

              if (onChunk) {
                onChunk({
                  content,
                  fullResponse,
                  provider: provider.name,
                  model: model.model,
                  actualModel: actualModelUsed,
                  requestedModel: model.model,
                });
              }
            }

            if (data.usage) {
              totalTokens =
                (data.usage.input_tokens || 0) +
                (data.usage.output_tokens || 0);
            }
          } catch (parseError) {
            if (dataStr.trim().endsWith("}")) {
              console.error("Error parsing streaming data:", parseError);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            actualModel: actualModelUsed,
            requestedModel: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
  console.error("Status:", error.response?.status);

  if (error.response?.data?.on) {
    let body = "";

    error.response.data.on("data", (chunk) => {
      body += chunk.toString();
    });

    error.response.data.on("end", () => {
      console.error("Anthropic Error Body:", body);
    });
  } else {
    console.error(error.response?.data);
  }

  if (onError) onError(error);

  throw new Error(
    `Anthropic streaming error: ${
      error.response?.status || ""
    } ${error.message}`
  );
}
  }

  // Perplexity implementation (images not typically supported, but keeping structure consistent)
  async callPerplexity(provider, model, prompt, systemPrompt, imageUrl = null) {
    try {
      const response = await axios.post(
        `${provider.base_url}/chat/completions`,
        {
          model: model.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: this.ensureMarkdownPrompt(prompt) },
          ],
          max_tokens: provider.max_tokens,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        text: response.data.choices[0].message.content,
        tokens_used: response.data.usage?.total_tokens || 1,
      };
    } catch (error) {
      console.error(
        "Perplexity API error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Perplexity API error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callPerplexityStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const response = await axios.post(
        `${provider.base_url}/chat/completions`,
        {
          model: model.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: this.ensureMarkdownPrompt(prompt) },
          ],
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = "";
      let searchResultsSent = false;
      let searchResults = null;
      console.log("model.model", model.model);

      // ✅ FIX: Use startsWith("sonar") right here at the top!
      // This protects ALL perplexity models from `sanitizeText` destroying their markdown.
      const applySanitize = !model.model.startsWith("sonar");
      console.log("applySanitize", applySanitize);

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim() === "" || !line.startsWith("data: ")) continue;
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") {
            if (onComplete) {
              onComplete({
                fullResponse: applySanitize
                  ? sanitizeText(fullResponse)
                  : fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
                search_results: searchResults,
              });
            }
            return;
          }
          try {
            const data = JSON.parse(dataStr);

            if (!searchResultsSent && data.search_results) {
              searchResults = data.search_results;
              searchResultsSent = true;
              if (onChunk) {
                onChunk({
                  type: "search_results",
                  search_results: searchResults,
                });
              }
            }

            if (
              data.choices &&
              data.choices[0] &&
              data.choices[0].delta &&
              data.choices[0].delta.content
            ) {
              const content = data.choices[0].delta.content;
              fullResponse += content;

              if (onChunk) {
                onChunk({
                  content: content,
                  fullResponse: applySanitize
                    ? sanitizeText(fullResponse)
                    : fullResponse,
                  provider: provider.name,
                  model: model.model,
                });
              }
            }

            if (data.usage) {
              totalTokens = data.usage.total_tokens;
            }
          } catch (parseError) {
            if (dataStr.trim().endsWith("}")) {
              console.error("Error parsing streaming data:", parseError);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse: applySanitize
              ? sanitizeText(fullResponse)
              : fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
            search_results: searchResults,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "Perplexity streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `Perplexity streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }
  // xAI implementation
  async callXAI(provider, model, prompt, systemPrompt, imageUrl = null) {
    try {
      // Grok API expects a similar structure to OpenAI, but with its own endpoint and headers.
      // See: https://developer.x.ai/docs/api-reference/chat-completions/create
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      // Add text content
      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      // Add image if provided (Grok supports image_url type)
      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      }

      // If no image, use simple string format for backward compatibility
      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: provider.max_tokens,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        text: response.data.choices[0].message.content,
        tokens_used: response.data.usage?.total_tokens || 1,
      };
    } catch (error) {
      console.error(
        "xAI (Grok) API error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `xAI (Grok) API error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callXAIStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      }

      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;

      // response.data.on("data", (chunk) => {
      //   const lines = chunk
      //     .toString()
      //     .split("\n")
      //     .filter((line) => line.trim() !== "");
      let buffer = ""; // ✅ FIX: buffer prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString(); // ✅ accumulate
        const lines = buffer.split("\n");
        buffer = lines.pop(); // ✅ keep incomplete last line

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }

              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error("Error parsing xAI streaming data:", parseError);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("xAI Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "xAI streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `xAI streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callGroq(provider, model, prompt, systemPrompt, imageUrl = null) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      // Add text content
      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      // Add image if provided (Groq supports vision models)
      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      }

      // If no image, use simple string format for backward compatibility
      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/openai/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: provider.max_tokens,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        text: response.data.choices[0].message.content,
        tokens_used: response.data.usage?.total_tokens || 1,
      };
    } catch (error) {
      console.error("Groq API error:", error.response?.data || error.message);
      throw new Error(
        `Groq API error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callGroqStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      }

      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/openai/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;

      // response.data.on("data", (chunk) => {
      //   const lines = chunk
      //     .toString()
      //     .split("\n")
      //     .filter((line) => line.trim() !== "");
      let buffer = ""; // ✅ FIX: buffer prevents split-line corruption across TCP packets
      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }

              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error("Error parsing Groq streaming data:", parseError);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("Groq Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "Groq streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `Groq streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  // Google Gemini implementation with image support
  async callGoogle(provider, model, prompt, systemPrompt, imageUrl = null) {
    if (!provider.api_key) {
      throw new Error(
        "Google (Gemini) API key is missing in provider configuration.",
      );
    }

    // Initialize Google AI Client
    const genai = new GoogleGenerativeAI(provider.api_key);

    try {
      // Use systemInstruction for better adherence (supported in newer Gemini models)
      const modelConfig = {
        model: model.model,
        systemInstruction: systemPrompt,
      };

      const geminiModel = genai.getGenerativeModel(modelConfig);

      // Build the User Message Parts
      const userParts = [{ text: this.ensureMarkdownPrompt(prompt) }];

      // Handle Image Input (Inline Data)
      if (imageUrl) {
        let mimeType = "image/jpeg"; // Default fallback
        let data = imageUrl;

        // Extract mime/data if it's a data URL
        if (imageUrl.startsWith("data:")) {
          const parts = imageUrl.split(",");
          if (parts.length > 1) {
            const mimeTypeMatch = parts[0].match(/data:(.*?);base64/);
            if (mimeTypeMatch && mimeTypeMatch[1]) {
              mimeType = mimeTypeMatch[1];
            }
            data = parts[1];
          }
        }

        userParts.push({
          inlineData: {
            mimeType: mimeType,
            data: data,
          },
        });
      }

      // Generate Content
      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
          maxOutputTokens: model.max_tokens || 8192,
          temperature: 0.7,
        },
      });

      const response = result.response;
      const text = response.text();

      // Estimate token usage (Gemini response.usageMetadata might be available)
      let totalTokens = 0;
      if (response.usageMetadata) {
        totalTokens = response.usageMetadata.totalTokenCount;
      } else {
        // Fallback estimation
        totalTokens = text.length / 4;
      }

      return {
        text: text,
        tokens_used: totalTokens,
      };
    } catch (error) {
      console.error(
        "Google (Gemini) API error:",
        error.response?.data || error.message,
      );
      throw new Error(`Google (Gemini) API error: ${error.message}`);
    }
  }

  async callGoogleStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 8192,
  ) {
    if (!provider.api_key) {
      throw new Error(
        "Google (Gemini) API key is missing in provider configuration.",
      );
    }
    const genai = new GoogleGenerativeAI(provider.api_key);

    try {
      // Optimize System Prompt for Flash models (Speed)
      if (model.model.includes("flash")) {
        const defaultSystemPrompt =
          "You are a helpful AI assistant. Don't think too long, send 1 to 2 sentence very quick responses. You can send response up to 150 words only if necessary. Always try to respond within 1 to 3 seconds if possible.";
        systemPrompt = systemPrompt?.trim() || defaultSystemPrompt;
      }

      // Initialize Model with System Instruction
      const geminiModel = genai.getGenerativeModel({
        model: model.model,
        systemInstruction: systemPrompt,
      });

      // Build User Message
      const userParts = [{ text: this.ensureMarkdownPrompt(prompt) }];

      if (imageUrl) {
        let mimeType = "image/jpeg";
        let data = imageUrl;

        if (imageUrl.startsWith("data:")) {
          const parts = imageUrl.split(",");
          if (parts.length > 1) {
            const mimeTypeMatch = parts[0].match(/data:(.*?);base64/);
            if (mimeTypeMatch && mimeTypeMatch[1]) {
              mimeType = mimeTypeMatch[1];
            }
            data = parts[1];
          }
        }
        userParts.push({
          inlineData: {
            mimeType: mimeType,
            data: data,
          },
        });
      }

      // Start Stream
      const result = await geminiModel.generateContentStream({
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
          maxOutputTokens: max_tokens || model.max_tokens || 8192,
          temperature: 0.7,
        },
      });

      let fullResponse = "";

      // Iterate chunks
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        if (onChunk) {
          onChunk({
            content: chunkText,
            fullResponse,
            provider: provider.name,
            model: model.model,
          });
        }
      }

      // Calculate Tokens (Wait for full response aggregation)
      let totalTokens = 0;
      try {
        const response = await result.response;
        const usage = response.usageMetadata;
        if (usage) {
          totalTokens = usage.totalTokenCount;
        }
      } catch (countError) {
        console.error("Error getting usage stats for Gemini:", countError);
        totalTokens = fullResponse.length / 4; // Fallback
      }

      if (onComplete) {
        onComplete({
          fullResponse,
          provider: provider.name,
          model: model.model,
          tokens_used: totalTokens,
        });
      }
    } catch (error) {
      console.error("Google (Gemini) streaming error:", error.message);
      if (onError) onError(error);
      throw new Error(`Google (Gemini) streaming error: ${error.message}`);
    }
  }

  async callMeta(provider, model, prompt, systemPrompt, imageUrl = null) {
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: this.ensureMarkdownPrompt(prompt) },
      ];

      // OpenRouter supports images for some models, but for Llama/Meta, text only is typical.
      // If imageUrl is provided, you could add it as a string, but most Meta models do not support vision.
      if (imageUrl) {
        messages.push({ role: "user", content: `![image](${imageUrl})` });
      }

      const response = await axios.post(
        `${provider.base_url}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: provider.max_tokens,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com", // Optional, for OpenRouter compliance
            "X-Title": "AI SaaS", // Optional, for OpenRouter compliance
          },
        },
      );

      return {
        text: response.data.choices[0].message.content,
        tokens_used: response.data.usage?.total_tokens || 1,
      };
    } catch (error) {
      console.error(
        "Meta (OpenRouter) API error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Meta (OpenRouter) API error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callMetaStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      const isVisionSupported =
        model.model &&
        (model.model.includes("maverick") ||
          model.model.includes("vision") ||
          model.model.includes("multimodal") ||
          model.model.includes("llama-4"));

      if (imageUrl && isVisionSupported) {
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      } else {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;

      // response.data.on("data", (chunk) => {
      //   const lines = chunk
      //     .toString()
      //     .split("\n")
      //     .filter((line) => line.trim() !== "");

      let buffer = ""; // ✅ FIX: buffer prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString(); // ✅ accumulate
        const lines = buffer.split("\n");
        buffer = lines.pop(); // ✅ keep incomplete last line

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }
              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error("Error parsing Meta streaming data:", parseError);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("Meta Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "Meta (OpenRouter) streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `Meta (OpenRouter) streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callKimiStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: imageUrl
            ? [
                {
                  type: "text",
                  text: this.ensureMarkdownPrompt(prompt),
                },
                {
                  type: "image_url",
                  image_url: { url: imageUrl },
                },
              ]
            : this.ensureMarkdownPrompt(prompt),
        },
      ];

      const endpoint = provider.base_url.endsWith("/chat/completions")
        ? provider.base_url
        : provider.base_url.endsWith("/v1")
        ? `${provider.base_url}/chat/completions`
        : `${provider.base_url}/v1/chat/completions`;

      const response = await axios.post(
        endpoint,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.3,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
          responseType: "stream",
          timeout: 60000,
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = ""; // Prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (trimmedLine.startsWith("data:")) {
            try {
              const dataStr = trimmedLine.replace(/^data:\s*/, "");
              if (!dataStr.trim()) continue;

              const data = JSON.parse(dataStr);
              if (data.error) {
                console.error("Kimi stream error in data payload:", data.error);
                if (onError)
                  onError(
                    new Error(
                      data.error.message || JSON.stringify(data.error),
                    ),
                  );
                return;
              }

              const delta = data?.choices?.[0]?.delta;
              // Only extract real user-facing content (ignore internal thinking/reasoning steps)
              const content = delta?.content || "";

              if (content) {
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }

              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              // Ignore incomplete chunk parse errors
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("Kimi Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      if (onError) onError(error);

      let detailedMsg = error.message;
      if (error.response?.data) {
        try {
          if (typeof error.response.data === "string") {
            detailedMsg = error.response.data;
          } else if (error.response.data.error?.message) {
            detailedMsg = error.response.data.error.message;
          } else if (typeof error.response.data.read === "function") {
            const raw = error.response.data.read();
            if (raw) detailedMsg = raw.toString();
          }
        } catch (e) {}
      }

      console.error(
        "Kimi (OpenRouter) streaming error:",
        detailedMsg,
      );
      throw new Error(
        `Kimi (OpenRouter) streaming error: ${detailedMsg}`,
      );
    }
  }

  async callMistralStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }

      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = ""; // Prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const dataStr = line.slice(6);
              if (!dataStr.trim()) continue;

              const data = JSON.parse(dataStr);
              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }
              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error(
                "Error parsing Mistral streaming data:",
                parseError,
              );
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("Mistral Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "Mistral streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `Mistral streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callQwenStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const axios = require("axios");

      // ✅ Build messages properly
      const messages = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: imageUrl
            ? [
                {
                  type: "text",
                  text: this.ensureMarkdownPrompt(prompt),
                },
                {
                  type: "image_url",
                  image_url: { url: imageUrl },
                },
              ]
            : this.ensureMarkdownPrompt(prompt),
        },
      ];

      const response = await axios.post(
        `${provider.base_url}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
          responseType: "stream",
          timeout: 60000,
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = "";

      // ✅ STREAM HANDLER
      response.data.on("data", (chunk) => {
        const chunkString = chunk.toString();

        buffer += chunkString;
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (let line of lines) {
          line = line.trim();

          if (!line) continue;

          // ✅ End of stream
          if (line === "data: [DONE]") {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          // ✅ Only process valid SSE lines
          if (!line.startsWith("data:")) continue;

          const dataStr = line.replace(/^data:\s*/, "");

          try {
            const data = JSON.parse(dataStr);
            const delta = data?.choices?.[0]?.delta;

            // ✅ Only extract real user-facing content (ignore internal thinking steps)
            const chunkText = delta?.content || "";

            // ✅ Append and emit if we captured any text
            if (chunkText) {
              fullResponse += chunkText;

              if (onChunk) {
                onChunk({
                  content: chunkText,
                  fullResponse,
                  provider: provider.name,
                  model: model.model,
                });
              }
            }

            if (data.usage) {
              totalTokens = data.usage.total_tokens;
            }
          } catch (err) {
            // ✅ Ignore broken JSON chunks silently
            // console.error("JSON Parse Error on chunk:", err.message); // Uncomment to debug parse errors
          }
        }
      });

      // ✅ Stream end fallback
      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      // ✅ Stream error
      response.data.on("error", (error) => {
        if (onError) onError(error);
      });
    } catch (error) {
      if (onError) onError(error);

      let detailedMsg = error.message;
      if (error.response?.data) {
        try {
          if (typeof error.response.data === "string") {
            detailedMsg = error.response.data;
          } else if (error.response.data.error?.message) {
            detailedMsg = error.response.data.error.message;
          } else if (typeof error.response.data.read === "function") {
            const raw = error.response.data.read();
            if (raw) detailedMsg = raw.toString();
          }
        } catch (e) {}
      }

      console.error("🔴 Qwen Streaming Error Details:", detailedMsg);

      throw new Error(`Qwen streaming error: ${detailedMsg}`);
    }
  }

  async callMiniMaxStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }

      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = ""; // Prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line for next chunk

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const dataStr = line.slice(6);
              if (!dataStr.trim()) continue;

              const data = JSON.parse(dataStr);
              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }
              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error(
                "Error parsing MiniMax streaming data:",
                parseError,
              );
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("MiniMax Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "MiniMax (OpenRouter) streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `MiniMax streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }
  async callMimoStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }

      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = ""; // Prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line for next chunk

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const dataStr = line.slice(6);
              if (!dataStr.trim()) continue;

              const data = JSON.parse(dataStr);
              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }
              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error("Error parsing MiMo streaming data:", parseError);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("MiMo Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "MiMo (OpenRouter) streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `MiMo streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callGlmStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }

      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = ""; // Prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line for next chunk

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const dataStr = line.slice(6);
              if (!dataStr.trim()) continue;

              const data = JSON.parse(dataStr);
              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }
              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error("Error parsing GLM streaming data:", parseError);
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("GLM Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "GLM (OpenRouter) streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `GLM streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async callNemotronStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }

      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = ""; // Prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line for next chunk

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const dataStr = line.slice(6);
              if (!dataStr.trim()) continue;

              const data = JSON.parse(dataStr);
              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }
              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error(
                "Error parsing Nemotron streaming data:",
                parseError,
              );
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("Nemotron Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "Nemotron (OpenRouter) streaming error:",
        error.response?.data || error.message,
      );
      let errorMsg = error.response?.data?.error?.message || error.message;
      if (imageUrl && (error.response?.status === 404 || error.response?.status === 400 || (error.message || "").includes("404") || (errorMsg || "").includes("support image"))) {
        errorMsg = "This model does not support image analysis. Please try a vision-supported model like ChatGPT, Gemini, Claude, or Grok.";
      }
      const err = new Error(`Nemotron streaming error: ${errorMsg}`);
      if (onError) onError(err);
      throw err;
    }
  }

  async callMuseStreaming(
    provider,
    model,
    prompt,
    systemPrompt,
    onChunk,
    onComplete,
    onError,
    imageUrl = null,
    max_tokens = 4000,
  ) {
    try {
      const messages = [{ role: "system", content: systemPrompt }];
      const userMessage = { role: "user", content: [] };

      userMessage.content.push({
        type: "text",
        text: this.ensureMarkdownPrompt(prompt),
      });

      if (imageUrl) {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: imageUrl },
        });
      }

      if (!imageUrl) {
        userMessage.content = this.ensureMarkdownPrompt(prompt);
      }

      messages.push(userMessage);

      const response = await axios.post(
        `${provider.base_url || "https://openrouter.ai/api"}/v1/chat/completions`,
        {
          model: model.model,
          messages: messages,
          max_tokens: max_tokens || provider.max_tokens,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${provider.api_key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app-domain.com",
            "X-Title": "AI SaaS",
          },
          responseType: "stream",
        },
      );

      let fullResponse = "";
      let totalTokens = 0;
      let buffer = ""; // Prevents split-line corruption across TCP packets

      response.data.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line for next chunk

        for (const line of lines) {
          if (line.includes("[DONE]")) {
            if (onComplete) {
              onComplete({
                fullResponse,
                provider: provider.name,
                model: model.model,
                tokens_used: totalTokens || 1,
              });
            }
            return;
          }

          if (line.startsWith("data: ")) {
            try {
              const dataStr = line.slice(6);
              if (!dataStr.trim()) continue;

              const data = JSON.parse(dataStr);
              if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].delta &&
                data.choices[0].delta.content
              ) {
                const content = data.choices[0].delta.content;
                fullResponse += content;

                if (onChunk) {
                  onChunk({
                    content,
                    fullResponse,
                    provider: provider.name,
                    model: model.model,
                  });
                }
              }
              if (data.usage) {
                totalTokens = data.usage.total_tokens;
              }
            } catch (parseError) {
              console.error(
                "Error parsing Muse streaming data:",
                parseError,
              );
            }
          }
        }
      });

      response.data.on("end", () => {
        if (onComplete) {
          onComplete({
            fullResponse,
            provider: provider.name,
            model: model.model,
            tokens_used: totalTokens || 1,
          });
        }
      });

      response.data.on("error", (error) => {
        console.error("Muse Stream error:", error);
        if (onError) onError(error);
      });
    } catch (error) {
      console.error(
        "Muse (OpenRouter) streaming error:",
        error.response?.data || error.message,
      );
      if (onError) onError(error);
      throw new Error(
        `Muse streaming error: ${
          error.response?.data?.error?.message || error.message
        }`,
      );
    }
  }

  async updateUsageStats(providerId, modelId, tokensUsed) {
    try {
      // Update provider stats
      await AIProvider.findByIdAndUpdate(providerId, {
        $inc: {
          "usage_stats.total_requests": 1,
          "usage_stats.total_tokens": tokensUsed,
        },
        "usage_stats.last_used": new Date(),
      });

      // Update model stats
      await AIModel.findByIdAndUpdate(modelId, {
        $inc: {
          "usage_stats.total_requests": 1,
          "usage_stats.total_tokens": tokensUsed,
        },
        "usage_stats.last_used": new Date(),
      });
    } catch (error) {
      console.error("Error updating usage stats:", error);
    }
  }

  async refreshProviders() {
    await this.loadProvidersAndModels();
  }
}

// Create singleton instance
const aiService = new AIService();

// Export both streaming and non-streaming functions
const generateAIResponse = async (
  prompt,
  systemPrompt,
  modelId,
  imageUrl = null,
) => {
  return await aiService.generateResponse(
    prompt,
    systemPrompt,
    modelId,
    imageUrl,
  );
};

const generateStreamingAIResponse = async (
  prompt,
  systemPrompt,
  modelId,
  onChunk,
  onComplete,
  onError,
  imageUrl = null,
  max_tokens = 4000,
) => {
  return await aiService.generateStreamingResponse(
    prompt,
    systemPrompt,
    modelId,
    onChunk,
    onComplete,
    onError,
    imageUrl,
    max_tokens,
  );
};

module.exports = {
  generateAIResponse,
  generateStreamingAIResponse,
  getSafeUserId,
  aiService,
};

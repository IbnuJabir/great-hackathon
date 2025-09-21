import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// AWS Configuration
const REGION = process.env.AWS_REGION || process.env.AW_REGION || "us-east-1";

// Configure Bedrock client with environment-appropriate credentials
const createBedrockClient = () => {
  const config: any = {
    region: REGION,
  };

  // In production or when explicit credentials are provided, use them
  if (process.env.AW_ACCESS_KEY_ID && process.env.AW_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AW_ACCESS_KEY_ID,
      secretAccessKey: process.env.AW_SECRET_ACCESS_KEY,
    };
    console.log(`Bedrock service using explicit AWS credentials for region: ${REGION}`);
  } else if (process.env.AW_PROFILE) {
    // Local development with AWS SSO profile
    console.log(`Bedrock service using AWS SSO profile: ${process.env.AW_PROFILE} for region: ${REGION}`);
  } else {
    console.log(`Bedrock service using default AWS credential chain for region: ${REGION}`);
  }

  return new BedrockRuntimeClient(config);
};

const bedrock = createBedrockClient();

export async function generateEmbedding(text: string): Promise<number[]> {
  const modelId = process.env.BEDROCK_EMBEDDING_MODEL || "amazon.titan-embed-text-v2:0";

  const payload = {
    inputText: text.slice(0, 8000), // Titan has 8k token limit
  };

  try {
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(payload),
      contentType: "application/json",
      accept: "application/json",
    });

    const response = await bedrock.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    return result.embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

export async function generateAnswer(question: string, context: string): Promise<string> {
  const modelId = process.env.BEDROCK_LLM_MODEL || "amazon.nova-lite-v1:0";

  try {
    // Check if using Nova model
    if (modelId.includes("amazon.nova")) {
      const payload = {
        messages: [
          {
            role: "user",
            content: [
              {
                text: `You are a helpful assistant for manufacturing technicians. Answer the question based on the provided context from technical manuals. If you cannot answer from the context, say so clearly.

Context:
${context}

Question: ${question}

Please provide a clear, accurate answer with specific references to the source material when possible.`
              }
            ]
          }
        ],
        inferenceConfig: {
          max_new_tokens: 1000,
          temperature: 0.1
        }
      };

      const command = new InvokeModelCommand({
        modelId,
        body: JSON.stringify(payload),
        contentType: "application/json",
        accept: "application/json",
      });

      const response = await bedrock.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));

      return result.output?.message?.content?.[0]?.text || "";
    } else {
      // Fallback for Mistral models
      const prompt = `<s>[INST] You are a helpful assistant for manufacturing technicians. Answer the question based on the provided context from technical manuals. If you cannot answer from the context, say so clearly.

Context:
${context}

Question: ${question}

Please provide a clear, accurate answer with specific references to the source material when possible. [/INST]`;

      const payload = {
        prompt,
        max_tokens: 1000,
        temperature: 0.1,
        top_p: 0.9,
        top_k: 50
      };

      const command = new InvokeModelCommand({
        modelId,
        body: JSON.stringify(payload),
        contentType: "application/json",
        accept: "application/json",
      });

      const response = await bedrock.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));

      if (result.outputs && result.outputs.length > 0) {
        return result.outputs[0].text || "";
      }

      return result.completion || result.generated_text || "";
    }
  } catch (error) {
    console.error("Error generating answer:", error);
    throw new Error("Failed to generate answer");
  }
}

export async function generateDocumentSummary(text: string, title?: string): Promise<string> {
  const modelId = "amazon.nova-lite-v1:0";

  try {
    const payload = {
      messages: [
        {
          role: "user",
          content: [
            {
              text: `Please create a concise summary of this document${title ? ` titled "${title}"` : ""}. Focus on the main topics, key procedures, and important information that would be useful for technicians.

Document content:
${text.slice(0, 10000)} ${text.length > 10000 ? "..." : ""}

Provide a summary in 2-3 paragraphs.`
            }
          ]
        }
      ],
      inferenceConfig: {
        max_new_tokens: 500,
        temperature: 0.1
      }
    };

    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(payload),
      contentType: "application/json",
      accept: "application/json",
    });

    const response = await bedrock.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    return result.output?.message?.content?.[0]?.text || "Summary generation failed";
  } catch (error) {
    console.error("Error generating document summary:", error);
    return "Unable to generate summary";
  }
}
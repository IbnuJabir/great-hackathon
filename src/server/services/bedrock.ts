import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Configure AWS SDK v3 for Bedrock
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  } : undefined, // Use default credential chain if not provided
});

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
  const modelId = process.env.BEDROCK_LLM_MODEL || "mistral.mistral-7b-instruct-v0:2";

  const prompt = `<s>[INST] You are a helpful assistant for manufacturing technicians. Answer the question based on the provided context from technical manuals. If you cannot answer from the context, say so clearly.

Context:
${context}

Question: ${question}

Please provide a clear, accurate answer with specific references to the source material when possible. [/INST]`;

  try {
    // Mistral models use a different payload structure
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

    // Mistral returns the response in 'outputs' array
    if (result.outputs && result.outputs.length > 0) {
      return result.outputs[0].text || "";
    }

    return result.completion || result.generated_text || "";
  } catch (error) {
    console.error("Error generating answer:", error);
    throw new Error("Failed to generate answer");
  }
}
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Configure AWS SDK v3 for Bedrock
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  } : undefined,
});

export async function extractTextWithBedrock(buffer: Buffer, filename: string): Promise<string> {
  try {
    console.log(`Starting Bedrock document analysis for ${filename} using Nova Pro`);

    // Convert buffer to base64 for Bedrock
    const base64Document = buffer.toString('base64');

    // Use Nova Pro for vision and document processing
    const modelId = process.env.BEDROCK_VISION_MODEL || "amazon.nova-pro-v1:0";

    const payload = {
      messages: [
        {
          role: "user",
          content: [
            {
              text: "Please extract all text content from this document. Focus on the main content and preserve the structure. Ignore headers, footers, and page numbers unless they contain important information. Return only the extracted text content without any commentary or analysis."
            },
            {
              document: {
                format: "pdf",
                name: filename,
                source: {
                  bytes: base64Document
                }
              }
            }
          ]
        }
      ],
      inferenceConfig: {
        max_new_tokens: 4000,
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

    if (!result.output || !result.output.message || !result.output.message.content || !result.output.message.content[0] || !result.output.message.content[0].text) {
      throw new Error("No text content returned from Nova analysis");
    }

    const extractedText = result.output.message.content[0].text.trim();

    if (!extractedText || extractedText.length < 10) {
      throw new Error("Insufficient text content extracted from document");
    }

    console.log(`Nova Pro extracted ${extractedText.length} characters from ${filename}`);
    return extractedText;

  } catch (error) {
    console.error("Nova document analysis failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("ValidationException") || error.message.includes("ThrottlingException")) {
        throw new Error(`Bedrock API error: ${error.message}`);
      }
      if (error.message.includes("AccessDeniedException")) {
        throw new Error("Bedrock access denied - check AWS permissions for Nova models");
      }
      if (error.message.includes("ServiceUnavailableException")) {
        throw new Error("Bedrock service temporarily unavailable - please try again later");
      }
    }

    throw new Error(`Nova document analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function analyzeDocumentStructure(buffer: Buffer, filename: string): Promise<{
  text: string;
  metadata: {
    hasImages: boolean;
    hasTables: boolean;
    pageCount?: number;
    sections: string[];
  };
}> {
  try {
    console.log(`Analyzing document structure for ${filename} using Nova Pro`);

    const base64Document = buffer.toString('base64');
    const modelId = process.env.BEDROCK_VISION_MODEL || "amazon.nova-pro-v1:0";

    const payload = {
      messages: [
        {
          role: "user",
          content: [
            {
              text: `Analyze this document and provide:
1. Extract all text content preserving structure
2. Identify if the document contains images or diagrams
3. Identify if the document contains tables
4. List the main sections/headings found
5. Estimate page count if possible

Format your response as JSON:
{
  "text": "extracted text content",
  "hasImages": boolean,
  "hasTables": boolean,
  "pageCount": number or null,
  "sections": ["section1", "section2", ...]
}`
            },
            {
              document: {
                format: "pdf",
                name: filename,
                source: {
                  bytes: base64Document
                }
              }
            }
          ]
        }
      ],
      inferenceConfig: {
        max_new_tokens: 4000,
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

    if (!result.output || !result.output.message || !result.output.message.content || !result.output.message.content[0] || !result.output.message.content[0].text) {
      throw new Error("No analysis result returned from Nova");
    }

    try {
      const analysis = JSON.parse(result.output.message.content[0].text);

      return {
        text: analysis.text || "",
        metadata: {
          hasImages: analysis.hasImages || false,
          hasTables: analysis.hasTables || false,
          pageCount: analysis.pageCount || null,
          sections: analysis.sections || []
        }
      };
    } catch (parseError) {
      // Fallback to simple text extraction if JSON parsing fails
      console.warn("Failed to parse structured analysis, falling back to text extraction:", parseError);
      const text = await extractTextWithBedrock(buffer, filename);

      return {
        text,
        metadata: {
          hasImages: false,
          hasTables: false,
          sections: []
        }
      };
    }

  } catch (error) {
    console.error("Document structure analysis failed:", error);
    throw error;
  }
}
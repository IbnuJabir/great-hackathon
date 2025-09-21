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
    console.log(`Bedrock document service using explicit AWS credentials for region: ${REGION}`);
  } else if (process.env.AW_PROFILE) {
    // Local development with AWS SSO profile
    console.log(`Bedrock document service using AWS SSO profile: ${process.env.AW_PROFILE} for region: ${REGION}`);
  } else {
    console.log(`Bedrock document service using default AWS credential chain for region: ${REGION}`);
  }

  return new BedrockRuntimeClient(config);
};

const bedrock = createBedrockClient();

// Define size limits for different processing methods
const SMALL_PDF_LIMIT = 3 * 1024 * 1024; // 3MB - Safe for Nova Pro
const MEDIUM_PDF_LIMIT = 10 * 1024 * 1024; // 10MB - Textract sync limit

export async function extractTextWithBedrock(buffer: Buffer, filename: string): Promise<string> {
  const fileSize = buffer.length;
  const sizeMB = Math.round(fileSize / 1024 / 1024 * 100) / 100;
  console.log(`Starting document analysis for ${filename} (${sizeMB}MB)`);

  // For small files (≤3MB), use Nova Pro directly
  if (fileSize <= SMALL_PDF_LIMIT) {
    console.log(`✓ Using Nova Pro for small file (${sizeMB}MB ≤ 3MB)`);
    return await extractTextWithNovaPro(buffer, filename);
  }

  // For larger files, try Nova Pro first, then use chunking if needed
  console.log(`📄 Large file detected (${sizeMB}MB > 3MB), trying Nova Pro first`);
  try {
    return await extractTextWithNovaPro(buffer, filename);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Input is too long")) {
      console.log(`✓ Nova Pro input too long, using chunked processing for large file`);
      return await extractTextWithChunkedNova(buffer, filename);
    }
    throw error;
  }
}

async function extractTextWithNovaPro(buffer: Buffer, filename: string): Promise<string> {
  try {
    console.log(`Processing with Nova Pro: ${filename}`);

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
      if (error.message.includes("Input is too long")) {
        throw new Error("Input is too long");
      }
    }

    throw new Error(`Nova document analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function extractTextWithChunkedNova(buffer: Buffer, filename: string): Promise<string> {
  try {
    console.log(`Processing large PDF with chunked Nova Pro: ${filename}`);

    // Import pdf-lib for PDF manipulation
    const { PDFDocument } = await import("pdf-lib");

    // Load the PDF
    const pdfDoc = await PDFDocument.load(buffer);
    const totalPages = pdfDoc.getPageCount();

    console.log(`PDF has ${totalPages} pages, processing in chunks`);

    // Process in chunks of 50 pages
    const CHUNK_SIZE = 50;
    const chunks: string[] = [];

    for (let startPage = 0; startPage < totalPages; startPage += CHUNK_SIZE) {
      const endPage = Math.min(startPage + CHUNK_SIZE, totalPages);
      console.log(`Processing pages ${startPage + 1}-${endPage} of ${totalPages}`);

      try {
        // Create a new PDF with just this chunk of pages
        const chunkDoc = await PDFDocument.create();
        const pageIndices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
        const copiedPages = await chunkDoc.copyPages(pdfDoc, pageIndices);

        copiedPages.forEach((page) => {
          chunkDoc.addPage(page);
        });

        // Convert chunk to buffer
        const chunkBuffer = Buffer.from(await chunkDoc.save());

        // Process this chunk with Nova Pro
        const chunkText = await extractTextWithNovaPro(chunkBuffer, `${filename}_chunk_${startPage + 1}-${endPage}`);

        if (chunkText.trim()) {
          chunks.push(chunkText);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (chunkError) {
        console.error(`Failed to process chunk ${startPage + 1}-${endPage}:`, chunkError);
        // Continue with other chunks
      }
    }

    if (chunks.length === 0) {
      throw new Error("No text could be extracted from any PDF chunks");
    }

    const combinedText = chunks.join("\n\n");
    console.log(`Chunked processing complete: extracted ${combinedText.length} characters from ${chunks.length} chunks`);

    return combinedText;

  } catch (error) {
    console.error("Chunked Nova processing failed:", error);
    throw new Error(`Chunked PDF processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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
  const fileSize = buffer.length;
  console.log(`Analyzing document structure for ${filename} (${Math.round(fileSize / 1024 / 1024 * 100) / 100}MB)`);

  // For large files, skip complex analysis and use simple text extraction
  if (fileSize > MEDIUM_PDF_LIMIT) {
    console.log("Large file detected, using simple text extraction");
    const text = await extractTextWithBedrock(buffer, filename);

    return {
      text,
      metadata: {
        hasImages: false,
        hasTables: false,
        pageCount: undefined,
        sections: []
      }
    };
  }

  // For smaller files, try the enhanced analysis
  try {
    console.log(`Performing enhanced analysis with Nova Pro: ${filename}`);

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

    // If analysis fails due to size, fallback to simple extraction
    if (error instanceof Error && error.message.includes("Input is too long")) {
      console.log("Analysis too complex, falling back to simple text extraction");
      const text = await extractTextWithBedrock(buffer, filename);

      return {
        text,
        metadata: {
          hasImages: false,
          hasTables: false,
          pageCount: undefined,
          sections: []
        }
      };
    }

    throw error;
  }
}
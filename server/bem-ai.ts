const BEM_API_BASE = "https://api.bem.ai";
const FUNCTION_NAME = "fridge-grocery-extractor";
const WORKFLOW_NAME = "fridge-scanner";

function getApiKey(): string {
  const key = process.env.BEM_AI_API_KEY;
  if (!key) throw new Error("BEM_AI_API_KEY is not configured");
  return key;
}

async function bemFetchRaw(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BEM_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
      ...(options.headers || {}),
    },
  });
}

async function bemFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await bemFetchRaw(path, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BEM API error (${res.status}): ${text}`);
  }
  return res.json();
}

async function ensureFunctionExists(): Promise<void> {
  const checkRes = await bemFetchRaw(`/v2/functions/${FUNCTION_NAME}`);
  if (checkRes.ok) return;

  const createRes = await bemFetchRaw("/v2/functions", {
    method: "POST",
    body: JSON.stringify({
      functionName: FUNCTION_NAME,
      type: "transform",
      displayName: "Fridge Grocery Extractor",
      outputSchemaName: "FridgeContents",
      outputSchema: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            description: "All grocery/food items identified in the fridge or pantry image",
            items: {
              type: "object",
              required: ["name", "category", "quantity"],
              properties: {
                name: {
                  type: "string",
                  description: "Specific name of the food item (e.g. 'Greek Yogurt', 'Wild Salmon', 'Spinach'). Be as specific as possible.",
                },
                category: {
                  type: "string",
                  enum: ["protein", "vegetable", "fruit", "grain", "fat", "spice", "beverage", "dairy", "other"],
                  description: "Food category",
                },
                quantity: {
                  type: "string",
                  description: "Estimated quantity visible (e.g. '1 bag', '3 pieces', '1 bottle', '~500g')",
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!createRes.ok && createRes.status !== 409) {
    const text = await createRes.text();
    throw new Error(`Failed to create BEM function (${createRes.status}): ${text}`);
  }
}

async function ensureWorkflowExists(): Promise<void> {
  const checkRes = await bemFetchRaw(`/v2/workflows/${WORKFLOW_NAME}`);
  if (checkRes.ok) return;

  const createRes = await bemFetchRaw("/v2/workflows", {
    method: "POST",
    body: JSON.stringify({
      name: WORKFLOW_NAME,
      displayName: "Fridge Scanner Workflow",
      tags: ["fridge", "grocery", "pcos"],
      mainFunction: {
        name: FUNCTION_NAME,
      },
    }),
  });

  if (!createRes.ok && createRes.status !== 409) {
    const text = await createRes.text();
    throw new Error(`Failed to create BEM workflow (${createRes.status}): ${text}`);
  }
}

let setupDone = false;

async function ensureSetup(): Promise<void> {
  if (setupDone) return;
  await ensureFunctionExists();
  await ensureWorkflowExists();
  setupDone = true;
}

export interface BemGroceryItem {
  name: string;
  category: string;
  quantity: string;
}

export async function scanFridgeWithBem(
  imageBuffer: Buffer,
  mimeType: string
): Promise<BemGroceryItem[]> {
  await ensureSetup();

  const base64Content = imageBuffer.toString("base64");

  let inputType = "jpeg";
  if (mimeType.includes("png")) inputType = "png";
  else if (mimeType.includes("webp")) inputType = "webp";
  else if (mimeType.includes("heic")) inputType = "heic";
  else if (mimeType.includes("heif")) inputType = "heif";

  const callResponse = await bemFetch("/v2/calls", {
    method: "POST",
    body: JSON.stringify({
      calls: [
        {
          workflowName: WORKFLOW_NAME,
          callReferenceID: `fridge-${Date.now()}`,
          input: {
            singleFile: {
              inputType,
              inputContent: base64Content,
            },
          },
        },
      ],
    }),
  });

  const callId = callResponse.calls?.[0]?.callID;
  if (!callId) {
    throw new Error("Failed to create BEM.ai processing call");
  }

  const maxAttempts = 30;
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const statusResponse = await bemFetch(`/v2/calls/${callId}`);
    const call = statusResponse.call;

    if (!call) {
      console.error("BEM.ai: unexpected response shape, missing 'call'", JSON.stringify(statusResponse).slice(0, 500));
      continue;
    }

    if (call.status === "completed") {
      const functionCall = call.functionCalls?.[0];
      if (functionCall?.transformedContent?.items && Array.isArray(functionCall.transformedContent.items)) {
        return functionCall.transformedContent.items.map((item: any) => ({
          name: String(item.name || "Unknown Item"),
          category: String(item.category || "other"),
          quantity: String(item.quantity || "1"),
        }));
      }
      console.warn("BEM.ai: completed but no items in transformedContent", JSON.stringify(call.functionCalls || []).slice(0, 500));
      return [];
    }

    if (call.status === "failed" || call.status === "error") {
      const errMsg = call.error || call.message || "Unknown error";
      throw new Error(`BEM.ai processing failed: ${errMsg}`);
    }
  }

  throw new Error("BEM.ai processing timed out after 60 seconds");
}

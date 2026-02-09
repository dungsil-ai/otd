import { parseOpenApi } from "../src/parser/openapi-parser";
import type { OpenAPIV3 } from "openapi-types";

const doc = await parseOpenApi("tests/fixtures/edge-cases.yaml") as OpenAPIV3.Document;

// Check what the allOf endpoint looks like after dereferencing
const allOfSchema = (doc.paths?.["/complex/all-of"]?.post?.requestBody as any)?.content?.["application/json"]?.schema;
console.log("AllOf schema after deref:");
console.log(JSON.stringify(allOfSchema, null, 2));

console.log("\n---");

// Check what the deep-nested endpoint looks like 
const deepSchema = (doc.paths?.["/complex/deep-nested"]?.post?.requestBody as any)?.content?.["application/json"]?.schema;
console.log("DeepNested schema after deref:");
console.log(JSON.stringify(deepSchema, null, 2));

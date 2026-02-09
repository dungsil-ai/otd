import { parseOpenApi } from "../src/parser/openapi-parser";
import { extractEndpoints } from "../src/transformer/endpoint-extractor";
import type { OpenAPIV3 } from "openapi-types";

const doc = await parseOpenApi("tests/fixtures/edge-cases.yaml") as OpenAPIV3.Document;
const result = extractEndpoints(doc);

// Check allOf endpoint
const allOfEp = result.endpoints.find(e => e.path === "/complex/all-of" && e.method === "POST");
console.log("allOf request body properties:", JSON.stringify(allOfEp?.requestBodies[0]?.properties, null, 2));

// Check oneOf endpoint
const oneOfEp = result.endpoints.find(e => e.path === "/complex/one-of" && e.method === "POST");
console.log("\noneOf request body properties:", JSON.stringify(oneOfEp?.requestBodies[0]?.properties, null, 2));

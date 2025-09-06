import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const origin = process.env.MCP_SERVER_URL || process.argv[2];
if (!origin) {
  console.error('MCP_SERVER_URL environment variable or command line argument required');
  process.exit(1);
}

async function main() {
  const transport = new SSEClientTransport(new URL(`${origin}/api/mcp/sse?sessionId=test-session`));

  const client = new Client(
    {
      name: "example-client",
      version: "1.0.0",
    },
    {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {},
      },
    }
  );

  console.log("Connecting to", origin);
  await client.connect(transport);

  console.log("Connected", client.getServerCapabilities());

  const result = await client.listTools();
  console.log(result);
  client.close();
}

main();

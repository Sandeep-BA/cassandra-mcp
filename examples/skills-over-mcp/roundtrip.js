// Author: Sandeep Belgavi. Publish this repository's skills/ folder over MCP and print what a host sees.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { skillsServer, connectInMemory, inventory } from './catalog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.SKILLS_ROOT || path.join(here, '..', '..', 'skills');
const { server } = await skillsServer(root);
const { client, skills, close } = await connectInMemory(server);
console.log('server extensions:', JSON.stringify(client.getServerCapabilities().extensions));
for (const row of await inventory(skills)) console.log(JSON.stringify(row));
await close();

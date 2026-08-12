import fs from 'node:fs';
import path from 'node:path';

const openapiPath = path.resolve('openapi.yaml');
const document = fs.readFileSync(openapiPath, 'utf8');

const requiredSnippets = [
  'openapi: 3.0.3',
  'paths:',
  'components:',
  'securitySchemes:',
  'schemas:',
  '/api/health:',
  '/api/auth/register:',
  '/api/auth/login:',
  '/api/auth/logout:',
  '/api/auth/me:',
  '/api/idfm/nearby-stations:',
  '/api/idfm/places:',
  '/api/idfm/journeys:',
  'HealthResponse:',
  'AuthCredentials:',
  'UserResponse:',
  'NearbyStationsResponse:',
  'PlacesResponse:',
  'JourneysResponse:',
  'ErrorResponse:',
];

const missingSnippets = requiredSnippets.filter(
  (snippet) => !document.includes(snippet)
);

if (missingSnippets.length > 0) {
  console.error('OpenAPI contract is missing required entries:');
  missingSnippets.forEach((snippet) => console.error(`- ${snippet}`));
  process.exit(1);
}

if (/\t/.test(document)) {
  console.error('OpenAPI contract must use spaces, not tabs.');
  process.exit(1);
}

console.log('OpenAPI contract looks consistent.');

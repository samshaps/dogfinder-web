/**
 * API documentation generator and utilities
 * Provides comprehensive API documentation and OpenAPI spec generation
 */

import { ApiVersion, formatVersion, getVersionInfo } from './versioning';
import { ERROR_CODES, HTTP_STATUS } from './response';

export interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  deprecated?: boolean;
  version?: ApiVersion;
}

export interface ApiParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  type: string;
  description?: string;
  example?: any;
}

export interface ApiRequestBody {
  required: boolean;
  contentType: string;
  schema: any;
  description?: string;
}

export interface ApiResponse {
  statusCode: number;
  description: string;
  schema?: any;
  example?: any;
}

export interface ApiTag {
  name: string;
  description: string;
  version?: ApiVersion;
}

// API Documentation
export const API_DOCS: ApiEndpoint[] = [
  // Health Check
  {
    path: '/api/health',
    method: 'GET',
    summary: 'Health Check',
    description: 'Check if the API is running and healthy',
    tags: ['System'],
    responses: [
      {
        statusCode: 200,
        description: 'API is healthy',
        example: { status: 'ok', timestamp: '2024-01-01T00:00:00.000Z' }
      }
    ]
  },
  
  // Email Alerts
  {
    path: '/api/email-alerts',
    method: 'GET',
    summary: 'Get Email Alert Settings',
    description: 'Retrieve user email alert preferences',
    tags: ['Email Alerts'],
    parameters: [
      {
        name: 'user_id',
        in: 'header',
        required: true,
        type: 'string',
        description: 'User ID for authentication'
      }
    ],
    responses: [
      {
        statusCode: 200,
        description: 'Email alert settings retrieved successfully',
        example: {
          success: true,
          data: {
            enabled: true,
            frequency: 'daily',
            zipCodes: ['10001', '10002'],
            radiusMi: 25
          }
        }
      },
      {
        statusCode: 401,
        description: 'Unauthorized',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        }
      }
    ]
  },
  
  {
    path: '/api/email-alerts',
    method: 'POST',
    summary: 'Update Email Alert Settings',
    description: 'Update user email alert preferences',
    tags: ['Email Alerts'],
    parameters: [
      {
        name: 'user_id',
        in: 'header',
        required: true,
        type: 'string',
        description: 'User ID for authentication'
      }
    ],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          frequency: { type: 'string', enum: ['daily', 'weekly'] },
          zipCodes: { type: 'array', items: { type: 'string' } },
          radiusMi: { type: 'number', minimum: 1, maximum: 500 }
        },
        required: ['enabled', 'frequency', 'zipCodes', 'radiusMi']
      }
    },
    responses: [
      {
        statusCode: 200,
        description: 'Email alert settings updated successfully'
      },
      {
        statusCode: 400,
        description: 'Validation error',
        example: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: {
              validationErrors: [
                { field: 'zipCodes', message: 'At least one zip code is required' }
              ]
            }
          }
        }
      }
    ]
  },
  
  // Unsubscribe
  {
    path: '/api/unsubscribe',
    method: 'POST',
    summary: 'Unsubscribe from Email Alerts',
    description: 'Unsubscribe from email alerts using a secure token',
    tags: ['Email Alerts'],
    parameters: [
      {
        name: 'token',
        in: 'query',
        required: true,
        type: 'string',
        description: 'Secure unsubscribe token'
      }
    ],
    responses: [
      {
        statusCode: 200,
        description: 'Successfully unsubscribed',
        example: {
          success: true,
          data: {
            message: 'Successfully unsubscribed from email alerts',
            subscriptionCancelled: true
          }
        }
      },
      {
        statusCode: 400,
        description: 'Invalid token',
        example: {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired unsubscribe token'
          }
        }
      }
    ]
  },
  
  // Cron Jobs
  {
    path: '/api/cron/email-alerts',
    method: 'POST',
    summary: 'Email Alerts Cron Job',
    description: 'Trigger email alerts cron job (internal use)',
    tags: ['Cron Jobs'],
    parameters: [
      {
        name: 'Authorization',
        in: 'header',
        required: true,
        type: 'string',
        description: 'Bearer token for cron authentication'
      }
    ],
    responses: [
      {
        statusCode: 200,
        description: 'Cron job executed successfully',
        example: {
          success: true,
          data: {
            processed: 10,
            sent: 8,
            errors: 0,
            details: []
          }
        }
      },
      {
        statusCode: 401,
        description: 'Unauthorized',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid cron authentication'
          }
        }
      }
    ]
  },
  
  // Stripe Webhooks
  {
    path: '/api/stripe/webhook',
    method: 'POST',
    summary: 'Stripe Webhook Handler',
    description: 'Handle Stripe webhook events for subscription management',
    tags: ['Webhooks'],
    parameters: [
      {
        name: 'stripe-signature',
        in: 'header',
        required: true,
        type: 'string',
        description: 'Stripe webhook signature for verification'
      }
    ],
    responses: [
      {
        statusCode: 200,
        description: 'Webhook processed successfully',
        example: {
          received: true,
          processed: true,
          requestId: 'req_1234567890_abc123'
        }
      },
      {
        statusCode: 400,
        description: 'Invalid signature or malformed request',
        example: {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature'
          }
        }
      }
    ]
  },
  
  // Admin Endpoints
  {
    path: '/api/admin/sync-plans',
    method: 'POST',
    summary: 'Sync Plans with Stripe',
    description: 'Synchronize user plans with Stripe subscriptions (admin only)',
    tags: ['Admin'],
    parameters: [
      {
        name: 'Authorization',
        in: 'header',
        required: true,
        type: 'string',
        description: 'Bearer token for admin authentication'
      }
    ],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['sync', 'find-mismatches', 'validate'],
            description: 'Action to perform'
          }
        },
        required: ['action']
      }
    },
    responses: [
      {
        statusCode: 200,
        description: 'Operation completed successfully',
        example: {
          success: true,
          action: 'sync',
          result: {
            synced: 5,
            errors: 0,
            details: []
          }
        }
      },
      {
        statusCode: 401,
        description: 'Unauthorized',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Admin authentication required'
          }
        }
      }
    ]
  }
];

export const API_TAGS: ApiTag[] = [
  {
    name: 'System',
    description: 'System health and status endpoints'
  },
  {
    name: 'Email Alerts',
    description: 'Email alert management and preferences'
  },
  {
    name: 'Cron Jobs',
    description: 'Scheduled job endpoints (internal use)'
  },
  {
    name: 'Webhooks',
    description: 'Webhook handlers for external services'
  },
  {
    name: 'Admin',
    description: 'Administrative endpoints (admin only)'
  }
];

/**
 * Generate OpenAPI 3.0 specification
 */
export function generateOpenAPISpec(version: ApiVersion = { major: 1, minor: 0, patch: 0 }) {
  const versionInfo = getVersionInfo();
  
  return {
    openapi: '3.0.0',
    info: {
      title: 'DogYenta API',
      description: 'API for DogYenta - Find your perfect dog match',
      version: formatVersion(version),
      contact: {
        name: 'DogYenta Support',
        email: 'support@dogyenta.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://staging.dogyenta.com',
        description: 'Staging environment'
      },
      {
        url: 'https://dogyenta.com',
        description: 'Production environment'
      }
    ],
    tags: API_TAGS.map(tag => ({
      name: tag.name,
      description: tag.description
    })),
    paths: generatePaths(),
    components: {
      schemas: generateSchemas(),
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    },
    security: [
      { BearerAuth: [] }
    ],
    externalDocs: {
      description: 'Find more info about DogYenta',
      url: 'https://dogyenta.com/about'
    }
  };
}

/**
 * Generate API paths from documentation
 */
function generatePaths() {
  const paths: Record<string, any> = {};
  
  API_DOCS.forEach(endpoint => {
    if (!paths[endpoint.path]) {
      paths[endpoint.path] = {};
    }
    
    paths[endpoint.path][endpoint.method.toLowerCase()] = {
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags,
      parameters: endpoint.parameters?.map(param => ({
        name: param.name,
        in: param.in,
        required: param.required,
        schema: { type: param.type },
        description: param.description,
        example: param.example
      })),
      requestBody: endpoint.requestBody ? {
        required: endpoint.requestBody.required,
        content: {
          [endpoint.requestBody.contentType]: {
            schema: endpoint.requestBody.schema
          }
        },
        description: endpoint.requestBody.description
      } : undefined,
      responses: endpoint.responses.reduce((acc, response) => {
        acc[response.statusCode] = {
          description: response.description,
          content: response.schema ? {
            'application/json': {
              schema: response.schema,
              example: response.example
            }
          } : undefined
        };
        return acc;
      }, {} as Record<number, any>),
      deprecated: endpoint.deprecated
    };
  });
  
  return paths;
}

/**
 * Generate common schemas
 */
function generateSchemas() {
  return {
    ApiResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' }
          }
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
            version: { type: 'string' }
          }
        }
      }
    },
    ErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', enum: Object.values(ERROR_CODES) },
            message: { type: 'string' },
            details: { type: 'object' }
          }
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' }
          }
        }
      }
    },
    PaginatedResponse: {
      allOf: [
        { $ref: '#/components/schemas/ApiResponse' },
        {
          type: 'object',
          properties: {
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' }
              }
            }
          }
        }
      ]
    }
  };
}

/**
 * Generate API documentation HTML
 */
export function generateApiDocsHTML(version: ApiVersion = { major: 1, minor: 0, patch: 0 }) {
  const versionInfo = getVersionInfo();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DogYenta API Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 3px; font-weight: bold; margin-right: 10px; }
        .get { background: #28a745; color: white; }
        .post { background: #007bff; color: white; }
        .put { background: #ffc107; color: black; }
        .delete { background: #dc3545; color: white; }
        .path { font-family: monospace; font-size: 16px; }
        .description { margin: 10px 0; color: #666; }
        .parameters, .responses { margin: 15px 0; }
        .parameter, .response { margin: 5px 0; padding: 5px; background: white; border-radius: 3px; }
        .required { color: #dc3545; font-weight: bold; }
        .code { background: #f1f1f1; padding: 10px; border-radius: 3px; font-family: monospace; font-size: 14px; overflow-x: auto; }
        .version-info { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐕 DogYenta API Documentation</h1>
        
        <div class="version-info">
            <h3>Version Information</h3>
            <p><strong>Current Version:</strong> ${versionInfo.current}</p>
            <p><strong>Supported Versions:</strong> ${versionInfo.supported.join(', ')}</p>
            ${versionInfo.deprecated.length > 0 ? `<p><strong>Deprecated Versions:</strong> ${versionInfo.deprecated.join(', ')}</p>` : ''}
        </div>
        
        <h2>Endpoints</h2>
        
        ${API_DOCS.map(endpoint => `
            <div class="endpoint">
                <div>
                    <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                    <span class="path">${endpoint.path}</span>
                </div>
                <div class="description">
                    <strong>${endpoint.summary}</strong>
                    ${endpoint.description ? `<br>${endpoint.description}` : ''}
                </div>
                
                ${endpoint.parameters && endpoint.parameters.length > 0 ? `
                    <div class="parameters">
                        <h4>Parameters</h4>
                        ${endpoint.parameters.map(param => `
                            <div class="parameter">
                                <strong>${param.name}</strong> (${param.in}) ${param.required ? '<span class="required">*required</span>' : ''}
                                <br>Type: ${param.type}
                                ${param.description ? `<br>${param.description}` : ''}
                                ${param.example ? `<br>Example: <code>${param.example}</code>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="responses">
                    <h4>Responses</h4>
                    ${endpoint.responses.map(response => `
                        <div class="response">
                            <strong>${response.statusCode}</strong> - ${response.description}
                            ${response.example ? `
                                <div class="code">${JSON.stringify(response.example, null, 2)}</div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
        
        <h2>Error Codes</h2>
        <div class="code">
${Object.entries(ERROR_CODES).map(([key, value]) => `${key}: ${value}`).join('\n')}
        </div>
        
        <h2>Rate Limiting</h2>
        <p>API requests are rate limited to prevent abuse. Rate limit information is included in response headers:</p>
        <ul>
            <li><code>X-RateLimit-Limit</code> - Maximum requests per window</li>
            <li><code>X-RateLimit-Remaining</code> - Remaining requests in current window</li>
            <li><code>X-RateLimit-Reset</code> - Time when the rate limit resets</li>
        </ul>
        
        <h2>Authentication</h2>
        <p>Most endpoints require authentication via Bearer token in the Authorization header:</p>
        <div class="code">Authorization: Bearer your-token-here</div>
        
        <h2>Support</h2>
        <p>For API support, contact us at <a href="mailto:support@dogyenta.com">support@dogyenta.com</a></p>
    </div>
</body>
</html>
  `;
}

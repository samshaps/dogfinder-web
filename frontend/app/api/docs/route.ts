/**
 * API Documentation Endpoint
 * Serves comprehensive API documentation and OpenAPI specs
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateOpenAPISpec, generateApiDocsHTML } from '@/lib/api/docs';
import { extractApiVersion } from '@/lib/api/versioning';
import { createSuccessResponse } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'html';
    const version = extractApiVersion(request) || { major: 1, minor: 0, patch: 0 };
    
    switch (format) {
      case 'json':
      case 'openapi':
        const openApiSpec = generateOpenAPISpec(version);
        return NextResponse.json(openApiSpec);
        
      case 'html':
      default:
        const html = generateApiDocsHTML(version);
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
          },
        });
    }
  } catch (error) {
    console.error('Error generating API docs:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}

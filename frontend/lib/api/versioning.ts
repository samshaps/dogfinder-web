/**
 * API versioning utilities and middleware
 * Provides backward compatibility and version management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createApiError, getRequestId } from './response';

export interface ApiVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface VersionConfig {
  current: ApiVersion;
  supported: ApiVersion[];
  deprecated: ApiVersion[];
  sunset: ApiVersion[];
}

// Current API version
export const CURRENT_VERSION: ApiVersion = { major: 1, minor: 0, patch: 0 };

// Supported versions (backward compatibility)
export const SUPPORTED_VERSIONS: ApiVersion[] = [
  { major: 1, minor: 0, patch: 0 },
];

// Deprecated versions (still supported but will be removed)
export const DEPRECATED_VERSIONS: ApiVersion[] = [];

// Sunset versions (no longer supported)
export const SUNSET_VERSIONS: ApiVersion[] = [];

export const VERSION_CONFIG: VersionConfig = {
  current: CURRENT_VERSION,
  supported: SUPPORTED_VERSIONS,
  deprecated: DEPRECATED_VERSIONS,
  sunset: SUNSET_VERSIONS,
};

/**
 * Parse version string to ApiVersion object
 */
export function parseVersion(versionString: string): ApiVersion | null {
  const match = versionString.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Format ApiVersion to string
 */
export function formatVersion(version: ApiVersion): string {
  return `v${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: ApiVersion, v2: ApiVersion): number {
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
}

/**
 * Check if a version is supported
 */
export function isVersionSupported(version: ApiVersion): boolean {
  return VERSION_CONFIG.supported.some(supported => 
    compareVersions(version, supported) === 0
  );
}

/**
 * Check if a version is deprecated
 */
export function isVersionDeprecated(version: ApiVersion): boolean {
  return VERSION_CONFIG.deprecated.some(deprecated => 
    compareVersions(version, deprecated) === 0
  );
}

/**
 * Check if a version is sunset
 */
export function isVersionSunset(version: ApiVersion): boolean {
  return VERSION_CONFIG.sunset.some(sunset => 
    compareVersions(version, sunset) === 0
  );
}

/**
 * Extract API version from request
 */
export function extractApiVersion(request: NextRequest): ApiVersion | null {
  // Check URL path for version (e.g., /api/v1/endpoint)
  const pathMatch = request.url.match(/\/api\/v(\d+)\.(\d+)\.(\d+)\//);
  if (pathMatch) {
    return {
      major: parseInt(pathMatch[1], 10),
      minor: parseInt(pathMatch[2], 10),
      patch: parseInt(pathMatch[3], 10),
    };
  }
  
  // Check Accept header for version
  const acceptHeader = request.headers.get('accept');
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/version=(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      return parseVersion(versionMatch[1]);
    }
  }
  
  // Check custom header
  const versionHeader = request.headers.get('x-api-version');
  if (versionHeader) {
    return parseVersion(versionHeader);
  }
  
  // Default to current version
  return CURRENT_VERSION;
}

/**
 * Validate API version and return appropriate response
 */
export function validateApiVersion(request: NextRequest): NextResponse | null {
  const version = extractApiVersion(request);
  if (!version) {
    const requestId = getRequestId(request);
    const error = createApiError(
      'INVALID_VERSION' as any,
      'Invalid API version format',
      400
    );
    
    return NextResponse.json(
      createErrorResponse(error, { requestId }),
      { status: 400 }
    );
  }
  
  // Check if version is sunset
  if (isVersionSunset(version)) {
    const requestId = getRequestId(request);
    const error = createApiError(
      'VERSION_SUNSET' as any,
      `API version ${formatVersion(version)} is no longer supported`,
      410
    );
    
    return NextResponse.json(
      createErrorResponse(error, { requestId }),
      { status: 410 }
    );
  }
  
  // Check if version is deprecated
  if (isVersionDeprecated(version)) {
    const requestId = getRequestId(request);
    const response = NextResponse.json(
      createErrorResponse(
        createApiError(
          'VERSION_DEPRECATED' as any,
          `API version ${formatVersion(version)} is deprecated. Please upgrade to ${formatVersion(CURRENT_VERSION)}`,
          200 // Still return 200 but with warning
        ),
        { requestId }
      )
    );
    
    response.headers.set('X-API-Version-Deprecated', 'true');
    response.headers.set('X-API-Version-Current', formatVersion(CURRENT_VERSION));
    
    return response;
  }
  
  // Check if version is supported
  if (!isVersionSupported(version)) {
    const requestId = getRequestId(request);
    const error = createApiError(
      'VERSION_NOT_SUPPORTED' as any,
      `API version ${formatVersion(version)} is not supported. Supported versions: ${VERSION_CONFIG.supported.map(formatVersion).join(', ')}`,
      400
    );
    
    return NextResponse.json(
      createErrorResponse(error, { requestId }),
      { status: 400 }
    );
  }
  
  return null; // Version is valid
}

/**
 * Add version headers to response
 */
export function addVersionHeaders(response: NextResponse, version: ApiVersion): NextResponse {
  response.headers.set('X-API-Version', formatVersion(version));
  response.headers.set('X-API-Version-Current', formatVersion(CURRENT_VERSION));
  
  if (isVersionDeprecated(version)) {
    response.headers.set('X-API-Version-Deprecated', 'true');
  }
  
  return response;
}

/**
 * Version-aware middleware factory
 */
export function createVersionedHandler<T extends any[]>(
  handler: (version: ApiVersion, ...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    
    // Validate version
    const versionResponse = validateApiVersion(request);
    if (versionResponse) {
      return versionResponse;
    }
    
    const version = extractApiVersion(request)!;
    
    // Call the versioned handler
    const response = await handler(version, ...args);
    
    // Add version headers
    return addVersionHeaders(response, version);
  };
}

/**
 * Get version info for API documentation
 */
export function getVersionInfo() {
  return {
    current: formatVersion(CURRENT_VERSION),
    supported: VERSION_CONFIG.supported.map(formatVersion),
    deprecated: VERSION_CONFIG.deprecated.map(formatVersion),
    sunset: VERSION_CONFIG.sunset.map(formatVersion),
  };
}

/**
 * Check if a feature is available in a specific version
 */
export function isFeatureAvailable(feature: string, version: ApiVersion): boolean {
  // Feature availability matrix
  const featureMatrix: Record<string, ApiVersion> = {
    'email-alerts': { major: 1, minor: 0, patch: 0 },
    'plan-sync': { major: 1, minor: 0, patch: 0 },
    'rate-limiting': { major: 1, minor: 0, patch: 0 },
    'webhook-v2': { major: 1, minor: 0, patch: 0 },
  };
  
  const requiredVersion = featureMatrix[feature];
  if (!requiredVersion) return false;
  
  return compareVersions(version, requiredVersion) >= 0;
}

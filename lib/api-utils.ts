// Global API error handler utility
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'Internal server error',
  defaultStatus: number = 500
) {
  let statusCode = defaultStatus;
  let message = defaultMessage;
  let code = 'INTERNAL_ERROR';
  let details;

  if (error instanceof APIError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'API_ERROR';
  } else if (error instanceof Error) {
    message = error.message;
    // Add specific error handling for common MongoDB errors
    if (error.message.includes('MongoServerError')) {
      code = 'DATABASE_ERROR';
      message = 'Database operation failed';
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      code = 'TIMEOUT_ERROR';
      message = 'Request timeout';
      statusCode = 408;
    } else if (error.message.includes('connection')) {
      code = 'CONNECTION_ERROR';
      message = 'Service temporarily unavailable';
      statusCode = 503;
    } else if (error.message.includes('validation')) {
      code = 'VALIDATION_ERROR';
      message = 'Invalid input data';
      statusCode = 400;
    }
  }

  // Include details only in development
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    details = error.stack;
  }

  const errorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  };

  return Response.json(errorResponse, { 
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Code': code,
    }
  });
}

export function validateRequest(req: Request, requiredFields: string[] = []) {
  const contentType = req.headers.get('content-type');
  
  if (req.method !== 'GET' && !contentType?.includes('application/json')) {
    throw new APIError(415, 'Content-Type must be application/json');
  }

  return true;
}

export async function parseRequestBody(req: Request) {
  try {
    const body = await req.json();
    return body;
  } catch (error) {
    throw new APIError(400, 'Invalid JSON in request body');
  }
}

export function validateObjectId(id: string, fieldName: string = 'ID') {
  if (!id || typeof id !== 'string') {
    throw new APIError(400, `${fieldName} is required`);
  }
  
  // Simple ObjectId validation (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new APIError(400, `Invalid ${fieldName} format`);
  }
  
  return true;
}
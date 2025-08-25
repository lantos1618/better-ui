import { z } from 'zod';
import aui from '../index';

// Server-side tool for database operations
export const databaseTool = aui
  .tool('database-operation')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional(),
    id: z.string().optional(),
    filters: z.record(z.any()).optional()
  }))
  .execute(async ({ input, ctx }) => {
    // This runs on the server only
    // Access to database, environment variables, etc.
    
    switch (input.operation) {
      case 'create':
        // await db.insert(input.table, input.data);
        return { success: true, id: `new-${Date.now()}`, operation: 'created' };
        
      case 'read':
        // const records = await db.select(input.table, input.filters);
        return { 
          success: true, 
          data: [{ id: '1', name: 'Sample' }],
          count: 1 
        };
        
      case 'update':
        // await db.update(input.table, input.id, input.data);
        return { success: true, id: input.id, operation: 'updated' };
        
      case 'delete':
        // await db.delete(input.table, input.id);
        return { success: true, id: input.id, operation: 'deleted' };
    }
  });

// Email sending tool (server-only)
export const emailTool = aui
  .tool('send-email')
  .input(z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
    template: z.enum(['welcome', 'reset', 'notification']).optional(),
    attachments: z.array(z.object({
      filename: z.string(),
      content: z.string()
    })).optional()
  }))
  .execute(async ({ input, ctx }) => {
    // Server-side email sending
    // const result = await sendgrid.send({...});
    
    console.log('Sending email:', {
      to: input.to,
      subject: input.subject,
      template: input.template
    });
    
    return {
      sent: true,
      messageId: `msg-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  });

// Authentication tool
export const authTool = aui
  .tool('authenticate')
  .input(z.object({
    action: z.enum(['login', 'logout', 'refresh', 'verify']),
    credentials: z.object({
      email: z.string().email().optional(),
      password: z.string().optional(),
      token: z.string().optional(),
      code: z.string().optional()
    }).optional()
  }))
  .middleware(async ({ input, ctx, next }) => {
    // Rate limiting for auth attempts
    const ip = (ctx?.headers as any)?.['x-forwarded-for'] || 'unknown';
    const attempts = ctx?.cache.get(`auth-attempts-${ip}`) as number || 0;
    if (attempts > 5) {
      throw new Error('Too many authentication attempts');
    }
    
    return next();
  })
  .execute(async ({ input, ctx }) => {
    switch (input.action) {
      case 'login':
        // Verify credentials
        // const user = await verifyCredentials(input.credentials);
        return {
          success: true,
          user: { id: '123', email: input.credentials?.email },
          token: `jwt-${Date.now()}`,
          expiresIn: 3600
        };
        
      case 'logout':
        // Clear session
        return { success: true, message: 'Logged out' };
        
      case 'refresh':
        // Refresh token
        return {
          success: true,
          token: `refreshed-${Date.now()}`,
          expiresIn: 3600
        };
        
      case 'verify':
        // Verify 2FA code
        return {
          success: true,
          verified: true
        };
    }
  });

// File processing tool (server-side heavy computation)
export const processTool = aui
  .tool('process-file')
  .input(z.object({
    fileUrl: z.string().url(),
    operation: z.enum(['resize', 'compress', 'convert', 'analyze']),
    options: z.object({
      width: z.number().optional(),
      height: z.number().optional(),
      quality: z.number().min(1).max(100).optional(),
      format: z.string().optional()
    }).optional()
  }))
  .execute(async ({ input }) => {
    // Heavy server-side processing
    // const file = await fetch(input.fileUrl);
    // const processed = await processFile(file, input.operation, input.options);
    
    return {
      processed: true,
      originalUrl: input.fileUrl,
      processedUrl: `/processed/${Date.now()}.${input.options?.format || 'jpg'}`,
      operation: input.operation,
      size: { before: 1024000, after: 512000 },
      savings: '50%'
    };
  });

// API Gateway tool
export const apiGatewayTool = aui
  .tool('api-gateway')
  .input(z.object({
    service: z.enum(['stripe', 'openai', 'twilio', 'aws']),
    action: z.string(),
    params: z.record(z.any())
  }))
  .execute(async ({ input, ctx }) => {
    // Server-side API calls with secrets
    const apiKeys = {
      stripe: process.env.STRIPE_SECRET_KEY,
      openai: process.env.OPENAI_API_KEY,
      twilio: process.env.TWILIO_AUTH_TOKEN,
      aws: process.env.AWS_SECRET_ACCESS_KEY
    };
    
    // if (!apiKeys[input.service]) {
    //   throw new Error(`API key not configured for ${input.service}`);
    // }
    
    // Make authenticated API call
    // const result = await callService(input.service, input.action, input.params);
    
    return {
      service: input.service,
      action: input.action,
      result: { success: true, data: 'API response' },
      timestamp: new Date().toISOString()
    };
  });

// Background job tool
export const jobTool = aui
  .tool('background-job')
  .input(z.object({
    type: z.enum(['schedule', 'queue', 'cancel', 'status']),
    jobName: z.string(),
    schedule: z.string().optional(), // cron expression
    payload: z.any().optional(),
    jobId: z.string().optional()
  }))
  .execute(async ({ input }) => {
    switch (input.type) {
      case 'schedule':
        // Schedule a job
        return {
          scheduled: true,
          jobId: `job-${Date.now()}`,
          nextRun: new Date(Date.now() + 60000).toISOString()
        };
        
      case 'queue':
        // Add to queue
        return {
          queued: true,
          jobId: `queue-${Date.now()}`,
          position: Math.floor(Math.random() * 10)
        };
        
      case 'cancel':
        // Cancel job
        return {
          cancelled: true,
          jobId: input.jobId
        };
        
      case 'status':
        // Get job status
        return {
          jobId: input.jobId,
          status: 'running',
          progress: 67,
          eta: new Date(Date.now() + 30000).toISOString()
        };
    }
  });

// Cache management tool
export const cacheTool = aui
  .tool('cache-manager')
  .input(z.object({
    action: z.enum(['get', 'set', 'delete', 'clear', 'stats']),
    key: z.string().optional(),
    value: z.any().optional(),
    ttl: z.number().optional(), // seconds
    pattern: z.string().optional()
  }))
  .execute(async ({ input, ctx }) => {
    const cache = ctx?.cache || new Map();
    
    switch (input.action) {
      case 'get':
        const value = cache.get(input.key!);
        return { found: !!value, value, key: input.key };
        
      case 'set':
        cache.set(input.key!, input.value);
        // If TTL, schedule deletion
        if (input.ttl) {
          setTimeout(() => cache.delete(input.key!), input.ttl * 1000);
        }
        return { set: true, key: input.key, ttl: input.ttl };
        
      case 'delete':
        const deleted = cache.delete(input.key!);
        return { deleted, key: input.key };
        
      case 'clear':
        cache.clear();
        return { cleared: true };
        
      case 'stats':
        return {
          size: cache.size,
          keys: Array.from(cache.keys())
        };
    }
  });

// Export all server tools
export const serverTools = {
  database: databaseTool,
  email: emailTool,
  auth: authTool,
  process: processTool,
  apiGateway: apiGatewayTool,
  job: jobTool,
  cache: cacheTool
};

export default serverTools;
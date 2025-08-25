import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Simulated database (in real app, use Prisma/Drizzle/etc.)
const db = {
  users: new Map<string, any>(),
  posts: new Map<string, any>(),
  comments: new Map<string, any>(),
  
  async findUser(id: string) {
    // Simulate async DB call
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.users.get(id) || null;
  },
  
  async createUser(data: any) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const user = { id: Math.random().toString(36).substr(2, 9), ...data, createdAt: new Date() };
    this.users.set(user.id, user);
    return user;
  },
  
  async searchPosts(query: string, limit: number) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const posts = Array.from(this.posts.values())
      .filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || 
                   p.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
    return posts;
  },
  
  async createPost(data: any) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const post = { 
      id: Math.random().toString(36).substr(2, 9), 
      ...data, 
      createdAt: new Date(),
      views: 0,
      likes: 0
    };
    this.posts.set(post.id, post);
    return post;
  },
  
  async updatePost(id: string, data: any) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const post = this.posts.get(id);
    if (!post) throw new Error('Post not found');
    const updated = { ...post, ...data, updatedAt: new Date() };
    this.posts.set(id, updated);
    return updated;
  }
};

// User management tool
export const userTool = aui
  .tool('user-management')
  .input(z.object({
    action: z.enum(['create', 'find', 'update', 'delete']),
    id: z.string().optional(),
    data: z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(['user', 'admin', 'moderator']).optional()
    }).optional()
  }))
  .execute(async ({ input, ctx }) => {
    switch (input.action) {
      case 'create':
        if (!input.data?.name || !input.data?.email) {
          throw new Error('Name and email required for user creation');
        }
        return await db.createUser(input.data);
        
      case 'find':
        if (!input.id) throw new Error('User ID required');
        const user = await db.findUser(input.id);
        if (!user) throw new Error('User not found');
        return user;
        
      case 'update':
        if (!input.id) throw new Error('User ID required');
        const existing = await db.findUser(input.id);
        if (!existing) throw new Error('User not found');
        const updated = { ...existing, ...input.data };
        db.users.set(input.id, updated);
        return updated;
        
      case 'delete':
        if (!input.id) throw new Error('User ID required');
        const deleted = db.users.get(input.id);
        if (!deleted) throw new Error('User not found');
        db.users.delete(input.id);
        return { success: true, deleted };
        
      default:
        throw new Error('Invalid action');
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side optimistic updates
    if (input.action === 'find' && input.id) {
      const cached = ctx.cache.get(`user:${input.id}`);
      if (cached && Date.now() - cached.timestamp < 30000) {
        return cached.data;
      }
    }
    
    const response = await ctx.fetch('/api/tools/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const result = await response.json();
    
    if (input.action === 'find' && input.id) {
      ctx.cache.set(`user:${input.id}`, { data: result, timestamp: Date.now() });
    }
    
    return result;
  })
  .render(({ data, input }) => (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">User {input?.action} Result</h3>
      {data && (
        <div className="space-y-1 text-sm">
          {data.id && <p><span className="font-medium">ID:</span> {data.id}</p>}
          {data.name && <p><span className="font-medium">Name:</span> {data.name}</p>}
          {data.email && <p><span className="font-medium">Email:</span> {data.email}</p>}
          {data.role && <p><span className="font-medium">Role:</span> {data.role}</p>}
          {data.createdAt && <p><span className="font-medium">Created:</span> {new Date(data.createdAt).toLocaleString()}</p>}
        </div>
      )}
    </div>
  ))
  .describe('Comprehensive user management with CRUD operations')
  .tag('database', 'users', 'crud');

// Content management tool
export const contentTool = aui
  .tool('content-management')
  .input(z.object({
    type: z.enum(['post', 'page', 'comment']),
    action: z.enum(['create', 'search', 'update', 'publish', 'archive']),
    query: z.string().optional(),
    id: z.string().optional(),
    data: z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      tags: z.array(z.string()).optional(),
      authorId: z.string().optional()
    }).optional(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    if (input.action === 'create') {
      if (!input.data?.title || !input.data?.content) {
        throw new Error('Title and content required');
      }
      return await db.createPost({
        ...input.data,
        type: input.type,
        status: input.data.status || 'draft'
      });
    }
    
    if (input.action === 'search') {
      return await db.searchPosts(input.query || '', input.limit);
    }
    
    if (input.action === 'update' && input.id) {
      return await db.updatePost(input.id, input.data);
    }
    
    if (input.action === 'publish' && input.id) {
      return await db.updatePost(input.id, { status: 'published', publishedAt: new Date() });
    }
    
    if (input.action === 'archive' && input.id) {
      return await db.updatePost(input.id, { status: 'archived', archivedAt: new Date() });
    }
    
    throw new Error('Invalid action or missing parameters');
  })
  .middleware(async ({ input, ctx, next }) => {
    // Log content operations
    console.log(`Content operation: ${input.action} on ${input.type}`);
    
    // Check permissions (in real app)
    if (input.action === 'publish' && !ctx.user?.isAdmin) {
      // In real app, check actual permissions
      console.warn('Publishing requires admin privileges');
    }
    
    const result = await next();
    
    // Post-processing
    if (input.action === 'create') {
      console.log('New content created:', result);
    }
    
    return result;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div className="animate-pulse">Processing content...</div>;
    if (error) return <div className="text-red-600">Error: {error.message}</div>;
    
    if (Array.isArray(data)) {
      return (
        <div className="space-y-3">
          {data.map((item: any) => (
            <div key={item.id} className="p-3 border rounded">
              <h4 className="font-medium">{item.title}</h4>
              <p className="text-sm text-gray-600 truncate">{item.content}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">{item.type}</span>
                <span className="text-xs px-2 py-1 bg-blue-100 rounded">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="p-4 border rounded">
        <h3 className="font-semibold">{data.title}</h3>
        <p className="text-gray-600 mt-2">{data.content}</p>
        <div className="flex gap-2 mt-3">
          <span className="text-xs px-2 py-1 bg-gray-100 rounded">{data.type}</span>
          <span className="text-xs px-2 py-1 bg-blue-100 rounded">{data.status}</span>
        </div>
      </div>
    );
  })
  .describe('Content management system for posts, pages, and comments')
  .tag('database', 'content', 'cms');

// Analytics tool
export const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    metric: z.enum(['pageviews', 'users', 'engagement', 'conversion']),
    period: z.enum(['day', 'week', 'month', 'year']),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate analytics data fetch
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const data = {
      metric: input.metric,
      period: input.period,
      value: Math.floor(Math.random() * 10000),
      change: (Math.random() * 40 - 20).toFixed(1),
      trend: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100)),
      breakdown: {
        desktop: Math.floor(Math.random() * 60 + 20),
        mobile: Math.floor(Math.random() * 30 + 10),
        tablet: Math.floor(Math.random() * 10 + 5)
      }
    };
    
    return data;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Cache analytics data for 5 minutes
    const cacheKey = `analytics:${input.metric}:${input.period}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }
    
    const response = await ctx.fetch('/api/tools/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  })
  .render(({ data }) => (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold capitalize">{data.metric}</h3>
          <p className="text-3xl font-bold mt-1">{data.value.toLocaleString()}</p>
          <p className={`text-sm mt-1 ${Number(data.change) > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Number(data.change) > 0 ? '↑' : '↓'} {Math.abs(Number(data.change))}% from last {data.period}
          </p>
        </div>
        <span className="text-xs px-2 py-1 bg-white rounded-full">{data.period}</span>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 mb-2">Device Breakdown</p>
        <div className="flex gap-2">
          <div className="text-xs">
            <span className="font-medium">Desktop:</span> {data.breakdown.desktop}%
          </div>
          <div className="text-xs">
            <span className="font-medium">Mobile:</span> {data.breakdown.mobile}%
          </div>
          <div className="text-xs">
            <span className="font-medium">Tablet:</span> {data.breakdown.tablet}%
          </div>
        </div>
      </div>
    </div>
  ))
  .describe('Analytics and metrics tracking tool')
  .tag('database', 'analytics', 'metrics');

// Transaction tool for financial operations
export const transactionTool = aui
  .tool('transaction')
  .input(z.object({
    type: z.enum(['payment', 'refund', 'transfer']),
    amount: z.number().positive(),
    currency: z.string().default('USD'),
    from: z.string().optional(),
    to: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }))
  .execute(async ({ input, ctx }) => {
    // Validate transaction
    if (input.type === 'transfer' && (!input.from || !input.to)) {
      throw new Error('Transfer requires both from and to accounts');
    }
    
    // Simulate transaction processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const transaction = {
      id: `txn_${Math.random().toString(36).substr(2, 9)}`,
      ...input,
      status: 'completed',
      timestamp: new Date().toISOString(),
      fee: input.amount * 0.029, // 2.9% fee
      net: input.amount * 0.971
    };
    
    // Log transaction (in real app, save to database)
    console.log('Transaction processed:', transaction);
    
    return transaction;
  })
  .middleware(async ({ input, ctx, next }) => {
    // Security checks
    if (input.amount > 10000) {
      console.warn('Large transaction detected, additional verification may be required');
    }
    
    // Rate limiting (in real app)
    const userTransactions = ctx.cache.get(`transactions:${ctx.user?.id}`) || [];
    if (userTransactions.length > 10) {
      throw new Error('Transaction rate limit exceeded');
    }
    
    const result = await next();
    
    // Update transaction cache
    userTransactions.push(result);
    ctx.cache.set(`transactions:${ctx.user?.id}`, userTransactions);
    
    return result;
  })
  .render(({ data, loading }) => {
    if (loading) {
      return (
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg animate-pulse">
          <p className="text-yellow-800">Processing transaction...</p>
        </div>
      );
    }
    
    return (
      <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-green-800">Transaction Complete</h3>
            <p className="text-sm text-gray-600 mt-1">ID: {data.id}</p>
          </div>
          <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded">
            {data.status}
          </span>
        </div>
        
        <div className="mt-3 space-y-1 text-sm">
          <p><span className="font-medium">Amount:</span> {data.currency} {data.amount.toFixed(2)}</p>
          <p><span className="font-medium">Fee:</span> {data.currency} {data.fee.toFixed(2)}</p>
          <p><span className="font-medium">Net:</span> {data.currency} {data.net.toFixed(2)}</p>
          {data.description && <p><span className="font-medium">Description:</span> {data.description}</p>}
        </div>
      </div>
    );
  })
  .describe('Financial transaction processing tool')
  .tag('database', 'finance', 'payments');

// Seed some demo data
db.posts.set('1', {
  id: '1',
  title: 'Getting Started with AUI',
  content: 'AUI is a powerful tool system for AI-powered applications...',
  type: 'post',
  status: 'published',
  createdAt: new Date()
});

db.posts.set('2', {
  id: '2',
  title: 'Advanced AUI Patterns',
  content: 'Learn about middleware, caching, and optimization...',
  type: 'post',
  status: 'draft',
  createdAt: new Date()
});

db.users.set('user1', {
  id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
  createdAt: new Date()
});
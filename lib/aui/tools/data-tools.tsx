import { z } from 'zod';
import { createAITool } from '../ai-control';

export const dataFetch = createAITool('data.fetch')
  .describe('Fetch and process data from various sources')
  .tag('data', 'fetch', 'async')
  .input(z.object({
    source: z.string(),
    transform: z.enum(['json', 'text', 'csv', 'xml']).optional(),
    cache: z.boolean().optional()
  }))
  .execute(async ({ input, ctx }) => {
    const cacheKey = `data_${input.source}`;
    
    if (input.cache && ctx?.cache.has(cacheKey)) {
      return ctx.cache.get(cacheKey);
    }
    
    const response = await ctx!.fetch(input.source);
    let data: any;
    
    switch (input.transform) {
      case 'json':
        data = await response.json();
        break;
      case 'csv':
        const text = await response.text();
        data = text.split('\n').map(line => line.split(','));
        break;
      case 'xml':
        data = await response.text();
        break;
      default:
        data = await response.text();
    }
    
    if (input.cache) {
      ctx?.cache.set(cacheKey, data);
    }
    
    return { data, source: input.source, cached: false };
  });

export const dataTransform = createAITool('data.transform')
  .describe('Transform data using various operations')
  .tag('data', 'transform', 'utility')
  .input(z.object({
    data: z.any(),
    operation: z.enum(['filter', 'map', 'reduce', 'sort', 'group']),
    params: z.any()
  }))
  .execute(async ({ input }) => {
    let result: any;
    
    switch (input.operation) {
      case 'filter':
        if (Array.isArray(input.data)) {
          result = input.data.filter((item: any) => {
            return Object.entries(input.params).every(([key, value]) => item[key] === value);
          });
        }
        break;
        
      case 'map':
        if (Array.isArray(input.data)) {
          result = input.data.map((item: any) => {
            const mapped: any = {};
            Object.entries(input.params).forEach(([newKey, oldKey]) => {
              mapped[newKey] = item[oldKey as string];
            });
            return mapped;
          });
        }
        break;
        
      case 'sort':
        if (Array.isArray(input.data)) {
          const { field, order = 'asc' } = input.params;
          result = [...input.data].sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
          });
        }
        break;
        
      case 'group':
        if (Array.isArray(input.data)) {
          const { by } = input.params;
          result = input.data.reduce((acc: any, item: any) => {
            const key = item[by];
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          }, {});
        }
        break;
        
      default:
        result = input.data;
    }
    
    return { result, operation: input.operation };
  });

export const dataValidate = createAITool('data.validate')
  .describe('Validate data against a schema')
  .tag('data', 'validation', 'utility')
  .input(z.object({
    data: z.any(),
    schema: z.any(),
    strict: z.boolean().optional()
  }))
  .execute(async ({ input }) => {
    try {
      const validated = input.schema.parse(input.data);
      return { valid: true, data: validated, errors: [] };
    } catch (error: any) {
      return { 
        valid: false, 
        data: input.data,
        errors: error.errors || [{ message: error.message }]
      };
    }
  });

export const dataAggregate = createAITool('data.aggregate')
  .describe('Perform aggregation operations on data')
  .tag('data', 'analytics', 'utility')
  .input(z.object({
    data: z.array(z.any()),
    operation: z.enum(['sum', 'avg', 'min', 'max', 'count', 'distinct']),
    field: z.string().optional()
  }))
  .execute(async ({ input }) => {
    let result: any;
    
    switch (input.operation) {
      case 'sum':
        result = input.data.reduce((sum, item) => 
          sum + (input.field ? item[input.field] : item), 0);
        break;
        
      case 'avg':
        const sum = input.data.reduce((s, item) => 
          s + (input.field ? item[input.field] : item), 0);
        result = sum / input.data.length;
        break;
        
      case 'min':
        result = Math.min(...input.data.map(item => 
          input.field ? item[input.field] : item));
        break;
        
      case 'max':
        result = Math.max(...input.data.map(item => 
          input.field ? item[input.field] : item));
        break;
        
      case 'count':
        result = input.data.length;
        break;
        
      case 'distinct':
        const values = input.data.map(item => 
          input.field ? item[input.field] : item);
        result = [...new Set(values)];
        break;
    }
    
    return { result, operation: input.operation, field: input.field };
  });

export const dataPaginate = createAITool('data.paginate')
  .describe('Paginate data')
  .tag('data', 'pagination', 'utility')
  .input(z.object({
    data: z.array(z.any()),
    page: z.number().min(1),
    pageSize: z.number().min(1),
    includeMetadata: z.boolean().optional()
  }))
  .execute(async ({ input }) => {
    const start = (input.page - 1) * input.pageSize;
    const end = start + input.pageSize;
    const items = input.data.slice(start, end);
    const totalPages = Math.ceil(input.data.length / input.pageSize);
    
    const result: any = { items };
    
    if (input.includeMetadata) {
      result.metadata = {
        page: input.page,
        pageSize: input.pageSize,
        total: input.data.length,
        totalPages,
        hasNext: input.page < totalPages,
        hasPrev: input.page > 1
      };
    }
    
    return result;
  });

export const dataSearch = createAITool('data.search')
  .describe('Search through data')
  .tag('data', 'search', 'utility')
  .input(z.object({
    data: z.array(z.any()),
    query: z.string(),
    fields: z.array(z.string()).optional(),
    fuzzy: z.boolean().optional()
  }))
  .execute(async ({ input }) => {
    const query = input.query.toLowerCase();
    
    const results = input.data.filter(item => {
      const fieldsToSearch = input.fields || Object.keys(item);
      
      return fieldsToSearch.some(field => {
        const value = String(item[field]).toLowerCase();
        
        if (input.fuzzy) {
          return value.includes(query) || query.includes(value);
        } else {
          return value === query;
        }
      });
    });
    
    return { results, count: results.length, query: input.query };
  });
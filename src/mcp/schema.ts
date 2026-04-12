/**
 * Lightweight Zod-to-JSON-Schema converter.
 * Handles common Zod types without requiring zod-to-json-schema dependency.
 */

import { z } from 'zod';

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  nullable?: boolean;
  additionalProperties?: boolean | JsonSchema;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodToJsonSchema(schema: z.ZodType | { [key: string]: any }): JsonSchema {
  return convert(schema);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convert(schema: z.ZodType | { [key: string]: any }): JsonSchema {
  const def = (schema as any)._def;
  const typeName: string = def?.typeName;

  switch (typeName) {
    case 'ZodString':
      return convertString(def);
    case 'ZodNumber':
      return convertNumber(def);
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodNull':
      return { type: 'null' };
    case 'ZodLiteral':
      return { enum: [def.value] };
    case 'ZodEnum':
      return { type: 'string', enum: def.values };
    case 'ZodNativeEnum':
      return { enum: Object.values(def.values) };
    case 'ZodObject':
      return convertObject(def);
    case 'ZodArray':
      return convertArray(def);
    case 'ZodOptional':
      return convert(def.innerType);
    case 'ZodNullable': {
      const inner = convert(def.innerType);
      return { anyOf: [inner, { type: 'null' }] };
    }
    case 'ZodDefault':
      return { ...convert(def.innerType), default: def.defaultValue() };
    case 'ZodUnion':
      return { anyOf: def.options.map((o: any) => convert(o)) };
    case 'ZodDiscriminatedUnion':
      return { oneOf: [...def.options.values()].map((o: any) => convert(o)) };
    case 'ZodRecord':
      return {
        type: 'object',
        additionalProperties: convert(def.valueType),
      };
    case 'ZodTuple': {
      const items = def.items.map((item: any) => convert(item));
      return { type: 'array', items: items.length === 1 ? items[0] : undefined, prefixItems: items };
    }
    case 'ZodEffects':
      return convert(def.schema);
    case 'ZodPipeline':
      return convert(def.in);
    case 'ZodLazy':
      return convert(def.getter());
    case 'ZodAny':
      return {};
    case 'ZodUnknown':
      return {};
    default:
      return {};
  }
}

function convertString(def: any): JsonSchema {
  const schema: JsonSchema = { type: 'string' };
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case 'min': schema.minLength = check.value; break;
        case 'max': schema.maxLength = check.value; break;
        case 'email': schema.format = 'email'; break;
        case 'url': schema.format = 'uri'; break;
        case 'uuid': schema.format = 'uuid'; break;
        case 'regex': schema.pattern = check.regex.source; break;
      }
    }
  }
  if (def.description) schema.description = def.description;
  return schema;
}

function convertNumber(def: any): JsonSchema {
  const schema: JsonSchema = { type: 'number' };
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case 'min':
          schema.minimum = check.value;
          if (check.inclusive === false) schema.exclusiveMinimum = check.value;
          break;
        case 'max':
          schema.maximum = check.value;
          if (check.inclusive === false) schema.exclusiveMaximum = check.value;
          break;
        case 'int': schema.type = 'integer'; break;
      }
    }
  }
  if (def.description) schema.description = def.description;
  return schema;
}

function convertObject(def: any): JsonSchema {
  const shape = def.shape();
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    properties[key] = convert(value as any);

    // Check if the field is required (not optional, not with default)
    const fieldDef = (value as any)._def;
    const isOptional = fieldDef?.typeName === 'ZodOptional' ||
      fieldDef?.typeName === 'ZodDefault';
    if (!isOptional) {
      required.push(key);
    }
  }

  const schema: JsonSchema = { type: 'object', properties };
  if (required.length > 0) schema.required = required;
  if (def.description) schema.description = def.description;
  return schema;
}

function convertArray(def: any): JsonSchema {
  const schema: JsonSchema = {
    type: 'array',
    items: convert(def.type),
  };
  if (def.minLength) schema.minItems = def.minLength.value;
  if (def.maxLength) schema.maxItems = def.maxLength.value;
  if (def.description) schema.description = def.description;
  return schema;
}

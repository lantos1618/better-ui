import React from 'react';
import { z } from 'zod';
import aui from '../index';

// Simple tool - just 2 methods as you requested!
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }: { input: any }) => ({ temp: 72, city: input.city }))
  .render(({ data }: { data: any }) => <div>{data.city}: {data.temp}°</div>)
  .build();

export default simpleTool;
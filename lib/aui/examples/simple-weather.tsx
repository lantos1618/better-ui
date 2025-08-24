import React from 'react';
import { z } from 'zod';
import aui from '../index';

// Simple tool - just 2 methods as you requested!
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

export default simpleTool;
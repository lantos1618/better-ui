import { tool } from '@lantos1618/better-ui';
import { z } from 'zod';

export const weatherTool = tool({
  name: 'weather',
  description: 'Get current weather for a city',
  input: z.object({ city: z.string() }),
  output: z.object({
    temp: z.number(),
    city: z.string(),
    condition: z.string(),
  }),
});

weatherTool.server(async ({ city }) => {
  // Simulated weather data
  const temp = Math.floor(Math.random() * 30) + 10;
  return {
    temp,
    city,
    condition: temp > 20 ? 'sunny' : 'cloudy',
  };
});

weatherTool.view((data) => {
  if (!data) return null;
  const icon = data.condition === 'sunny' ? '\u2600' : '\u2601';
  return (
    <div style={{ padding: '12px', border: '1px solid #333', borderRadius: '8px', background: '#1a1a1a' }}>
      <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>{data.city}</div>
      <div style={{ fontSize: '28px', color: '#eee', marginTop: '4px' }}>{data.temp}° {icon}</div>
      <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{data.condition}</div>
    </div>
  );
});

export const tools = {
  weather: weatherTool,
};

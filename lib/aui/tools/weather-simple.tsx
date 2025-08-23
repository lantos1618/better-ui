import React from 'react';
import { z } from 'zod';
import aui from '../index';

// Simplified weather tool - concise API with only essential methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({
    temp: Math.round(50 + Math.random() * 40),
    city: input.city,
    conditions: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)]
  }))
  .render(({ data }) => (
    <div className="weather-card" style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <h3>{data.city}</h3>
      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{data.temp}°F</div>
      <div style={{ color: '#6b7280' }}>{data.conditions}</div>
    </div>
  ))
  .build();

export default weatherTool;
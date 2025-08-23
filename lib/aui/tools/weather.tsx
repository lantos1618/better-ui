import { z } from 'zod';
import aui from '../index';

interface WeatherData {
  temp: number;
  city: string;
  condition: string;
  humidity: number;
}

const weatherTool = aui
  .tool('weather')
  .description('Get current weather for a city')
  .input(z.object({ 
    city: z.string().min(1).describe('The city name') 
  }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockWeather: WeatherData = {
      temp: Math.floor(Math.random() * 30) + 60,
      city: input.city,
      condition: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)],
      humidity: Math.floor(Math.random() * 40) + 40,
    };
    
    return mockWeather;
  })
  .render(({ data }) => (
    <div className="weather-widget p-4 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">{data.city}</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-2xl font-bold">{data.temp}°F</span>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">{data.condition}</p>
          <p className="text-sm text-gray-600">Humidity: {data.humidity}%</p>
        </div>
      </div>
    </div>
  ))
  .build();

export default weatherTool;
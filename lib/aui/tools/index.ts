import weatherTool from './weather';
import searchTool from './search';
import weatherSimple from './weather-simple';
import searchComplex from './search-complex';
import { globalRegistry } from '../core/registry';

export const tools = {
  weather: weatherTool,
  search: searchTool,
  weatherSimple,
  searchComplex,
};

export function registerDefaultTools() {
  globalRegistry.register(weatherTool);
  globalRegistry.register(searchTool);
}

export { default as weatherSimple } from './weather-simple';
export { default as searchComplex } from './search-complex';

export default tools;
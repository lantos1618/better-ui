import React from 'react';
import { z } from 'zod';
import { AUITool } from '@lantos1618/better-ui/lib/aui/core';
import { getStockQuote, getMarketIndices, getStockNews, StockQuote, MarketIndex, StockNews } from './yahoo-finance-client';

// Stock Price Tool Input/Output Types
const stockPriceInputSchema = z.object({
  symbol: z.string().min(1).max(5).toUpperCase(),
  showChart: z.boolean().optional().default(false)
});

type StockPriceInput = z.infer<typeof stockPriceInputSchema>;

interface StockPriceOutput {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  currency: string;
  marketState: string;
  shortName?: string;
  previousClose?: number;
  dayLow?: number;
  dayHigh?: number;
  volume?: number;
  marketCap?: number;
  showChart: boolean;
  error?: string;
}

// Portfolio Tool Types
const portfolioActionSchema = z.enum(['view', 'add', 'remove']);

const portfolioInputSchema = z.object({
  action: portfolioActionSchema,
  symbol: z.string().min(1).max(5).toUpperCase().optional(),
  shares: z.number().positive().optional()
});

type PortfolioInput = z.infer<typeof portfolioInputSchema>;

interface PortfolioItem {
  symbol: string;
  shares: number;
}

// Stock News Tool Types
const stockNewsInputSchema = z.object({
  symbol: z.string().min(1).max(5).toUpperCase(),
  limit: z.number().min(1).max(10).optional().default(3)
});

type StockNewsInput = z.infer<typeof stockNewsInputSchema>;

interface StockNewsOutput {
  symbol: string;
  news: Array<{
    title: string;
    summary: string;
    timestamp: string;
    source: string;
  }>;
}

// Market Overview Tool Types
interface MarketOverviewOutput {
  indices: Array<{
    name: string;
    value: number;
    change: number;
  }>;
  timestamp: string;
  error?: string;
}

// Portfolio storage (in-memory for demo)
const portfolioData: PortfolioItem[] = [];

// Stock Price Tool with Builder Pattern
export const stockPriceTool = new AUITool<StockPriceInput, StockPriceOutput>('stock-price')
  .describe('Get real-time stock price information')
  .input(stockPriceInputSchema)
  .execute(async ({ input }) => {
    try {
      const quote = await getStockQuote(input.symbol);
      
      return {
        symbol: quote.symbol,
        price: quote.price.toFixed(2),
        change: quote.change.toFixed(2),
        changePercent: quote.changePercent.toFixed(2),
        currency: quote.currency,
        marketState: quote.marketState,
        shortName: quote.shortName,
        previousClose: quote.previousClose,
        dayLow: quote.dayLow,
        dayHigh: quote.dayHigh,
        volume: quote.volume,
        marketCap: quote.marketCap,
        showChart: input.showChart
      };
    } catch (error) {
      console.error('Error fetching stock price:', error);
      return {
        symbol: input.symbol,
        price: '0.00',
        change: '0.00',
        changePercent: '0.00',
        currency: 'USD',
        marketState: 'UNKNOWN',
        showChart: input.showChart,
        error: 'Unable to fetch live data'
      };
    }
  })
  .render(({ data }) => (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 my-2">
      {data.error && (
        <div className="text-red-500 text-sm mb-2">{data.error}</div>
      )}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{data.symbol}</h3>
          {data.shortName && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{data.shortName}</p>
          )}
          <p className="text-2xl font-semibold mt-1">
            ${data.price} {data.currency}
          </p>
          <p className={`text-sm ${
            parseFloat(data.change) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {parseFloat(data.change) >= 0 ? '+' : ''}{data.change} ({data.changePercent}%)
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {data.marketState}
        </div>
      </div>
      {(data.dayLow || data.dayHigh || data.volume) && (
        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {data.previousClose && (
              <div>
                <span className="text-gray-500">Prev Close:</span> ${data.previousClose.toFixed(2)}
              </div>
            )}
            {data.dayLow && data.dayHigh && (
              <div>
                <span className="text-gray-500">Day Range:</span> ${data.dayLow.toFixed(2)} - ${data.dayHigh.toFixed(2)}
              </div>
            )}
            {data.volume && (
              <div>
                <span className="text-gray-500">Volume:</span> {(data.volume / 1000000).toFixed(2)}M
              </div>
            )}
            {data.marketCap && (
              <div>
                <span className="text-gray-500">Market Cap:</span> ${(data.marketCap / 1000000000).toFixed(2)}B
              </div>
            )}
          </div>
        </div>
      )}
      {data.showChart && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-500">Chart visualization coming soon</p>
        </div>
      )}
    </div>
  ));

// Portfolio Tool with Builder Pattern
export const portfolioTool = new AUITool<PortfolioInput, PortfolioItem[]>('portfolio')
  .describe('Manage stock portfolio')
  .input(portfolioInputSchema)
  .execute(async ({ input }) => {
    switch (input.action) {
      case 'add':
        if (input.symbol && input.shares) {
          const existing = portfolioData.find(s => s.symbol === input.symbol);
          if (existing) {
            existing.shares += input.shares;
          } else {
            portfolioData.push({ symbol: input.symbol, shares: input.shares });
          }
        }
        break;
      case 'remove':
        if (input.symbol) {
          const index = portfolioData.findIndex(s => s.symbol === input.symbol);
          if (index > -1) {
            portfolioData.splice(index, 1);
          }
        }
        break;
    }
    
    return [...portfolioData];
  })
  .render(({ data }) => (
    <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 my-2">
      <h3 className="font-bold text-lg mb-2">Portfolio</h3>
      {data.length === 0 ? (
        <p className="text-gray-500">No stocks in portfolio</p>
      ) : (
        <div className="space-y-2">
          {data.map((stock) => (
            <div key={stock.symbol} className="flex justify-between">
              <span className="font-medium">{stock.symbol}</span>
              <span>{stock.shares} shares</span>
            </div>
          ))}
        </div>
      )}
    </div>
  ));

// Stock News Tool with Builder Pattern
export const stockNewsTool = new AUITool<StockNewsInput, StockNewsOutput>('stock-news')
  .describe('Get latest news for a stock')
  .input(stockNewsInputSchema)
  .execute(async ({ input }) => {
    try {
      const news = await getStockNews(input.symbol, input.limit);
      
      return {
        symbol: input.symbol,
        news: news.map(item => ({
          title: item.title,
          summary: item.summary,
          timestamp: item.providerPublishTime.toISOString(),
          source: item.publisher
        }))
      };
    } catch (error) {
      console.error('Error fetching news:', error);
      return {
        symbol: input.symbol,
        news: [
          {
            title: `${input.symbol} Market Update`,
            summary: 'Stay tuned for the latest market developments',
            timestamp: new Date().toISOString(),
            source: 'Market Watch'
          }
        ]
      };
    }
  })
  .render(({ data }) => (
    <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4 my-2">
      <h3 className="font-bold text-lg mb-2">{data.symbol} News</h3>
      <div className="space-y-3">
        {data.news.map((item, index) => (
          <div key={index} className="border-l-2 border-yellow-400 pl-3">
            <h4 className="font-medium">{item.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{item.summary}</p>
            <p className="text-xs text-gray-500 mt-1">{item.source}</p>
          </div>
        ))}
      </div>
    </div>
  ));

// Market Overview Tool with Builder Pattern
export const marketOverviewTool = new AUITool<void, MarketOverviewOutput>('market-overview')
  .describe('Get market overview with major indices')
  .execute(async () => {
    try {
      const indices = await getMarketIndices();
      
      return {
        indices: indices.map(index => ({
          name: index.name,
          value: index.value,
          change: index.changePercent
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching market indices:', error);
      return {
        indices: [
          { name: 'S&P 500', value: 0, change: 0 },
          { name: 'Dow Jones', value: 0, change: 0 },
          { name: 'NASDAQ', value: 0, change: 0 },
          { name: 'Russell 2000', value: 0, change: 0 }
        ],
        timestamp: new Date().toISOString(),
        error: 'Unable to fetch live market data'
      };
    }
  })
  .render(({ data }) => (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-lg p-4 my-2">
      <h3 className="font-bold text-lg mb-3">Market Overview</h3>
      <div className="grid grid-cols-2 gap-3">
        {data.indices.map((index) => (
          <div key={index.name} className="bg-white dark:bg-gray-800 rounded p-2">
            <p className="font-medium text-sm">{index.name}</p>
            <p className="text-lg">{index.value.toLocaleString()}</p>
            <p className={`text-sm ${
              index.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {index.change >= 0 ? '+' : ''}{index.change}%
            </p>
          </div>
        ))}
      </div>
    </div>
  ));

// Export all tools as an array
export const stockTools = [
  stockPriceTool,
  portfolioTool,
  stockNewsTool,
  marketOverviewTool
];

// Export tool configuration for AI integration
export const stockToolsConfig = {
  'stock-price': {
    description: 'Get real-time stock prices',
    parameters: stockPriceInputSchema
  },
  'portfolio': {
    description: 'Manage stock portfolio',
    parameters: portfolioInputSchema
  },
  'stock-news': {
    description: 'Get latest stock news',
    parameters: stockNewsInputSchema
  },
  'market-overview': {
    description: 'Get market overview',
    parameters: z.void()
  }
};
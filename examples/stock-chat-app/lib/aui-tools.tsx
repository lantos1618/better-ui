import React from 'react';
import { getStockQuote, getMarketIndices, getStockNews } from './yahoo-finance-client';

// Stock price tool
export const stockPriceTool = {
  name: 'stock-price',
  description: 'Get real-time stock price information',
  execute: async (input: { symbol: string; showChart?: boolean }) => {
    try {
      // Fetch live data from Yahoo Finance
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
        showChart: input.showChart || false
      };
    } catch (error) {
      console.error('Error fetching stock price:', error);
      // Fallback to basic response
      return {
        symbol: input.symbol.toUpperCase(),
        price: '0.00',
        change: '0.00',
        changePercent: '0.00',
        currency: 'USD',
        marketState: 'UNKNOWN',
        showChart: input.showChart || false,
        error: 'Unable to fetch live data'
      };
    }
  },
  render: ({ result }: { result: any }) => (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 my-2">
      {result.error && (
        <div className="text-red-500 text-sm mb-2">{result.error}</div>
      )}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{result.symbol}</h3>
          {result.shortName && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{result.shortName}</p>
          )}
          <p className="text-2xl font-semibold mt-1">
            ${result.price} {result.currency}
          </p>
          <p className={`text-sm ${
            parseFloat(result.change) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {parseFloat(result.change) >= 0 ? '+' : ''}{result.change} ({result.changePercent}%)
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {result.marketState}
        </div>
      </div>
      {(result.dayLow || result.dayHigh || result.volume) && (
        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {result.previousClose && (
              <div>
                <span className="text-gray-500">Prev Close:</span> ${result.previousClose?.toFixed(2)}
              </div>
            )}
            {result.dayLow && result.dayHigh && (
              <div>
                <span className="text-gray-500">Day Range:</span> ${result.dayLow?.toFixed(2)} - ${result.dayHigh?.toFixed(2)}
              </div>
            )}
            {result.volume && (
              <div>
                <span className="text-gray-500">Volume:</span> {(result.volume / 1000000).toFixed(2)}M
              </div>
            )}
            {result.marketCap && (
              <div>
                <span className="text-gray-500">Market Cap:</span> ${(result.marketCap / 1000000000).toFixed(2)}B
              </div>
            )}
          </div>
        </div>
      )}
      {result.showChart && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-500">Chart visualization coming soon</p>
        </div>
      )}
    </div>
  )
};

// Portfolio management tool
const portfolioData: any[] = [];

export const portfolioTool = {
  name: 'portfolio',
  description: 'Manage stock portfolio',
  execute: async (input: { action: 'view' | 'add' | 'remove'; symbol?: string; shares?: number }) => {
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
    
    return portfolioData;
  },
  render: ({ result }: { result: any }) => (
    <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 my-2">
      <h3 className="font-bold text-lg mb-2">Portfolio</h3>
      {result.length === 0 ? (
        <p className="text-gray-500">No stocks in portfolio</p>
      ) : (
        <div className="space-y-2">
          {result.map((stock: any) => (
            <div key={stock.symbol} className="flex justify-between">
              <span className="font-medium">{stock.symbol}</span>
              <span>{stock.shares} shares</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
};

// Stock news tool
export const stockNewsTool = {
  name: 'stock-news',
  description: 'Get latest news for a stock',
  execute: async (input: { symbol: string; limit?: number }) => {
    try {
      const news = await getStockNews(input.symbol, input.limit || 3);
      
      return {
        symbol: input.symbol.toUpperCase(),
        news: news.map(item => ({
          title: item.title,
          summary: item.summary,
          timestamp: item.providerPublishTime.toISOString(),
          source: item.publisher
        }))
      };
    } catch (error) {
      console.error('Error fetching news:', error);
      // Fallback to mock news
      return {
        symbol: input.symbol.toUpperCase(),
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
  },
  render: ({ result }: { result: any }) => (
    <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4 my-2">
      <h3 className="font-bold text-lg mb-2">{result.symbol} News</h3>
      <div className="space-y-3">
        {result.news.map((item: any, index: number) => (
          <div key={index} className="border-l-2 border-yellow-400 pl-3">
            <h4 className="font-medium">{item.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{item.summary}</p>
            <p className="text-xs text-gray-500 mt-1">{item.source}</p>
          </div>
        ))}
      </div>
    </div>
  )
};

// Market overview tool
export const marketOverviewTool = {
  name: 'market-overview',
  description: 'Get market overview with major indices',
  execute: async () => {
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
      // Fallback to mock data
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
  },
  render: ({ result }: { result: any }) => (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-lg p-4 my-2">
      <h3 className="font-bold text-lg mb-3">Market Overview</h3>
      <div className="grid grid-cols-2 gap-3">
        {result.indices.map((index: any) => (
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
  )
};

// Export all tools
export const stockTools = [
  stockPriceTool,
  portfolioTool,
  stockNewsTool,
  marketOverviewTool
];
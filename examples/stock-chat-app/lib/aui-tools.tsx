import React from 'react';

// Stock price tool
export const stockPriceTool = {
  name: 'stock-price',
  description: 'Get real-time stock price information',
  execute: async (input: { symbol: string; showChart?: boolean }) => {
    // Using mock data for demo purposes
    const mockPrices: Record<string, any> = {
      'AAPL': { price: 195.89, change: 2.34, changePercent: 1.21 },
      'GOOGL': { price: 178.23, change: -1.45, changePercent: -0.81 },
      'MSFT': { price: 453.92, change: 5.67, changePercent: 1.26 },
      'TSLA': { price: 178.79, change: -3.21, changePercent: -1.76 },
    };
    
    const mock = mockPrices[input.symbol.toUpperCase()] || {
      price: 100.00,
      change: 0.50,
      changePercent: 0.50
    };
    
    return {
      symbol: input.symbol.toUpperCase(),
      price: mock.price.toFixed(2),
      change: mock.change.toFixed(2),
      changePercent: mock.changePercent.toFixed(2),
      currency: 'USD',
      marketState: 'REGULAR',
      showChart: input.showChart || false
    };
  },
  render: ({ result }: { result: any }) => (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 my-2">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{result.symbol}</h3>
          <p className="text-2xl font-semibold">
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
      {result.showChart && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-500">Chart visualization would go here</p>
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
    const mockNews = [
      {
        title: `${input.symbol} Reports Strong Q4 Earnings`,
        summary: 'Company beats analyst expectations with record revenue',
        timestamp: new Date().toISOString(),
        source: 'Financial Times'
      },
      {
        title: `Analysts Upgrade ${input.symbol} to Buy`,
        summary: 'Multiple firms raise price targets citing growth potential',
        timestamp: new Date().toISOString(),
        source: 'Bloomberg'
      },
      {
        title: `${input.symbol} Announces New Product Launch`,
        summary: 'Innovation expected to drive market share gains',
        timestamp: new Date().toISOString(),
        source: 'Reuters'
      }
    ];
    
    return {
      symbol: input.symbol.toUpperCase(),
      news: mockNews.slice(0, input.limit || 3)
    };
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
    return {
      indices: [
        { name: 'S&P 500', value: 5970.85, change: 0.73 },
        { name: 'Dow Jones', value: 43870.35, change: 0.32 },
        { name: 'NASDAQ', value: 21779.93, change: 1.28 },
        { name: 'Russell 2000', value: 2318.47, change: -0.18 }
      ],
      timestamp: new Date().toISOString()
    };
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
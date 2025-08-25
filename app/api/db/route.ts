import { NextRequest, NextResponse } from 'next/server';

const mockDatabase: Record<string, any[]> = {
  users: [
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: true },
    { id: 3, name: 'Charlie', active: false },
  ],
  posts: [
    { id: 1, title: 'First Post', authorId: 1 },
    { id: 2, title: 'Second Post', authorId: 2 },
  ]
};

export async function POST(request: NextRequest) {
  try {
    const { operation, collection, data } = await request.json();
    
    if (!mockDatabase[collection]) {
      mockDatabase[collection] = [];
    }
    
    let result;
    
    switch (operation) {
      case 'find':
        result = data 
          ? mockDatabase[collection].filter(item => 
              Object.entries(data).every(([key, value]) => item[key] === value)
            )
          : mockDatabase[collection];
        break;
        
      case 'create':
        const newItem = { id: Date.now(), ...data };
        mockDatabase[collection].push(newItem);
        result = newItem;
        break;
        
      case 'update':
        const { id, ...updates } = data;
        const index = mockDatabase[collection].findIndex(item => item.id === id);
        if (index !== -1) {
          mockDatabase[collection][index] = { ...mockDatabase[collection][index], ...updates };
          result = mockDatabase[collection][index];
        } else {
          result = null;
        }
        break;
        
      case 'delete':
        const deleteIndex = mockDatabase[collection].findIndex(item => item.id === data.id);
        if (deleteIndex !== -1) {
          result = mockDatabase[collection].splice(deleteIndex, 1)[0];
        } else {
          result = null;
        }
        break;
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    return NextResponse.json({
      success: true,
      operation,
      collection,
      data: result
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 400 }
    );
  }
}
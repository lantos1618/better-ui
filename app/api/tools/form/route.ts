import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, formData } = await request.json();
    
    switch (action) {
      case 'validate': {
        const errors: Record<string, string> = {};
        
        // Validate email
        if (formData.email && !formData.email.includes('@')) {
          errors.email = 'Invalid email address';
        }
        
        // Validate required fields
        if (!formData.name || formData.name.length < 2) {
          errors.name = 'Name must be at least 2 characters';
        }
        
        return NextResponse.json({
          valid: Object.keys(errors).length === 0,
          errors
        });
      }
      
      case 'save': {
        // In a real app, save to database
        console.log('Saving draft:', formData);
        
        return NextResponse.json({
          saved: true,
          timestamp: new Date().toISOString(),
          id: `draft-${Date.now()}`
        });
      }
      
      case 'submit': {
        // In a real app, process the submission
        console.log('Submitting form:', formData);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return NextResponse.json({
          submitted: true,
          id: Math.random().toString(36).substr(2, 9),
          data: formData,
          timestamp: new Date().toISOString()
        });
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Form processing error:', error);
    return NextResponse.json(
      { error: 'Form processing failed' },
      { status: 500 }
    );
  }
}
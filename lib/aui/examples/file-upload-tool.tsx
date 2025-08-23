import React from 'react';
import aui, { z } from '../index';

// File upload tool with client-side preview
const fileUploadTool = aui
  .tool('file-upload')
  .description('Upload and process files')
  .input(z.object({
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    content: z.string() // base64 encoded
  }))
  .execute(async ({ input }: { input: any }) => {
    // Server: Save file to storage
    const fileUrl = `/uploads/${Date.now()}-${input.fileName}`;
    return {
      url: fileUrl,
      size: input.fileSize,
      type: input.fileType,
      uploadedAt: new Date().toISOString()
    };
  })
  .clientExecute(async ({ input, ctx }: { input: any; ctx: any }) => {
    // Client: Show preview immediately, upload in background
    const preview = {
      url: `data:${input.fileType};base64,${input.content}`,
      size: input.fileSize,
      type: input.fileType,
      status: 'uploading'
    };
    
    // Upload in background
    ctx.fetch('/api/upload', {
      method: 'POST',
      body: JSON.stringify(input)
    }).then(result => {
      // Update UI when complete
      preview.status = 'completed';
    });
    
    return preview;
  })
  .render(({ data }: { data: any }) => (
    <div className="file-upload-result p-4 border rounded">
      <div className="flex items-center gap-3">
        {data.type.startsWith('image/') && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.url} alt="Preview" className="w-16 h-16 object-cover rounded" />
        )}
        <div>
          <p className="font-medium">File uploaded</p>
          <p className="text-sm text-gray-500">
            {(data.size / 1024).toFixed(2)} KB • {data.type}
          </p>
          {data.status && (
            <span className={`text-xs ${data.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
              {data.status}
            </span>
          )}
        </div>
      </div>
    </div>
  ))
  .build();

export default fileUploadTool;
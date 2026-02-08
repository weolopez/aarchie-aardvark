/**
 * Read Tool - Read file contents with line numbers
 * 
 * Reads a file from OPFS and returns its contents with optional
 * line offset and limit parameters.
 */

export const readTool = {
  name: 'read',
  description: 'Read file contents with optional line offset and limit',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path to read (relative to repo root)'
      },
      offset: {
        type: 'number',
        description: '1-indexed line number to start from'
      },
      limit: {
        type: 'number',
        description: 'Maximum lines to read (default: 100)'
      }
    },
    required: ['path']
  },

  async execute(args, context) {
    const { path, offset = 1, limit = 100 } = args;
    const { fileStore, repo } = context;

    try {
      // Read file content using File Store
      const content = await fileStore.read(repo, path);
      
      // Split into lines
      const lines = content.split('\n');
      
      // Calculate start and end indices (1-indexed to 0-indexed)
      const startIndex = Math.max(0, offset - 1);
      const endIndex = Math.min(lines.length, startIndex + limit);
      
      // Extract requested lines
      const selectedLines = lines.slice(startIndex, endIndex);
      
      // Format with line numbers
      const formattedContent = selectedLines
        .map((line, index) => {
          const lineNumber = startIndex + index + 1;
          return `${lineNumber.toString().padStart(4, ' ')} | ${line}`;
        })
        .join('\n');
      
      // Add truncation notice if applicable
      let output = formattedContent;
      if (startIndex > 0 || endIndex < lines.length) {
        output += `\n\n[Showing lines ${startIndex + 1}-${endIndex} of ${lines.length}]`;
      }
      
      return {
        success: true,
        output: output
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error.message}`
      };
    }
  }
};

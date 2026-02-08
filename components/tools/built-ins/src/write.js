/**
 * Write Tool - Write or overwrite a file
 * 
 * Writes content to a file in OPFS, creating parent directories
 * as needed.
 */

export const writeTool = {
  name: 'write',
  description: 'Write or overwrite a file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path (relative to repo root)'
      },
      content: {
        type: 'string',
        description: 'File content to write'
      }
    },
    required: ['path', 'content']
  },

  async execute(args, context) {
    const { path, content } = args;
    const { fileStore, repo, eventBus } = context;

    try {
      // Check if file exists (for update vs create distinction)
      const exists = await fileStore.exists(repo, path);
      
      // Write the file
      await fileStore.write(repo, path, content);
      
      // Publish event
      if (eventBus) {
        eventBus.publish(exists ? 'file:updated' : 'file:created', {
          repo,
          path,
          size: content.length
        });
      }
      
      return {
        success: true,
        output: exists 
          ? `Updated ${path} (${content.length} bytes)` 
          : `Created ${path} (${content.length} bytes)`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error.message}`
      };
    }
  }
};

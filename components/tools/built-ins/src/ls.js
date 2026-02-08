/**
 * LS Tool - List directory contents
 * 
 * Lists files and directories with optional detailed information.
 */

export const lsTool = {
  name: 'ls',
  description: 'List directory contents',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to list',
        default: '.'
      },
      detailed: {
        type: 'boolean',
        description: 'Show detailed listing with sizes',
        default: false
      }
    },
    required: ['path']
  },

  async execute(args, context) {
    const { path = '.', detailed = false } = args;
    const { fileStore, repo } = context;

    try {
      // Get directory entries from File Store
      const entries = await fileStore.list(repo, path);
      
      if (entries.length === 0) {
        return {
          success: true,
          output: `Directory ${path} is empty`
        };
      }
      
      // Sort entries: directories first, then alphabetically
      const sortedEntries = entries.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      if (detailed) {
        // Detailed listing with sizes
        const lines = sortedEntries.map(entry => {
          const type = entry.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--';
          const size = entry.type === 'directory' 
            ? '-' 
            : formatSize(entry.size || 0);
          const name = entry.type === 'directory' 
            ? `${entry.name}/` 
            : entry.name;
          return `${type}  ${size.padStart(8)}  ${name}`;
        });
        
        return {
          success: true,
          output: lines.join('\n')
        };
      } else {
        // Simple listing
        const names = sortedEntries.map(entry => {
          return entry.type === 'directory' 
            ? `${entry.name}/` 
            : entry.name;
        });
        
        return {
          success: true,
          output: names.join('\n')
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list directory: ${error.message}`
      };
    }
  }
};

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

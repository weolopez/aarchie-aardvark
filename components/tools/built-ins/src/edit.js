/**
 * Edit Tool - Surgical find-and-replace
 * 
 * Performs precise text replacement in files with support for
 * fuzzy whitespace matching.
 */

export const editTool = {
  name: 'edit',
  description: 'Edit a file with surgical find-and-replace',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path'
      },
      oldText: {
        type: 'string',
        description: 'Exact text to find (including whitespace)'
      },
      newText: {
        type: 'string',
        description: 'Replacement text'
      },
      fuzzy: {
        type: 'boolean',
        description: 'Enable fuzzy whitespace matching',
        default: false
      }
    },
    required: ['path', 'oldText', 'newText']
  },

  async execute(args, context) {
    const { path, oldText, newText, fuzzy = false } = args;
    const { fileStore, repo, eventBus } = context;

    try {
      // Read current content
      const content = await fileStore.read(repo, path);
      
      // Find the text to replace
      let matchIndex;
      let matchCount = 0;
      
      if (fuzzy) {
        // Fuzzy matching: normalize whitespace and find
        const normalizedContent = content.replace(/\s+/g, ' ');
        const normalizedOldText = oldText.replace(/\s+/g, ' ');
        
        // Count matches in normalized content
        let searchPos = 0;
        while ((searchPos = normalizedContent.indexOf(normalizedOldText, searchPos)) !== -1) {
          matchCount++;
          searchPos += normalizedOldText.length;
        }
        
        if (matchCount === 0) {
          return {
            success: false,
            error: `Text not found in ${path} (fuzzy search)`
          };
        }
        
        if (matchCount > 1) {
          return {
            success: false,
            error: `Found ${matchCount} matches for the text in ${path}. Use more specific text or disable fuzzy matching.`
          };
        }
        
        // For fuzzy matching, we need to find the original position
        // This is simplified - in production, you'd map normalized positions back
        matchIndex = content.indexOf(oldText);
        if (matchIndex === -1) {
          // Try to find with normalized whitespace in original
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const normalizedLine = lines[i].replace(/\s+/g, ' ').trim();
            const normalizedSearch = oldText.replace(/\s+/g, ' ').trim();
            if (normalizedLine.includes(normalizedSearch)) {
              // Found approximate match on this line
              matchIndex = content.split('\n').slice(0, i).join('\n').length + 
                         (i > 0 ? 1 : 0) + 
                         lines[i].indexOf(lines[i].trim());
              break;
            }
          }
        }
      } else {
        // Exact matching
        let searchPos = 0;
        while ((searchPos = content.indexOf(oldText, searchPos)) !== -1) {
          matchCount++;
          searchPos += oldText.length;
        }
        
        if (matchCount === 0) {
          return {
            success: false,
            error: `Text not found in ${path}`
          };
        }
        
        if (matchCount > 1) {
          return {
            success: false,
            error: `Found ${matchCount} matches for the text in ${path}. Use more specific text.`
          };
        }
        
        matchIndex = content.indexOf(oldText);
      }
      
      if (matchIndex === -1) {
        return {
          success: false,
          error: `Could not locate text to replace in ${path}`
        };
      }
      
      // Perform the replacement
      const newContent = content.substring(0, matchIndex) + 
                        newText + 
                        content.substring(matchIndex + oldText.length);
      
      // Write the updated content
      await fileStore.write(repo, path, newContent);
      
      // Get context around the change
      const lines = content.substring(0, matchIndex).split('\n');
      const startLine = Math.max(0, lines.length - 3);
      const endLine = Math.min(
        newContent.split('\n').length,
        lines.length + newText.split('\n').length + 2
      );
      
      // Publish event
      if (eventBus) {
        eventBus.publish('file:updated', {
          repo,
          path,
          size: newContent.length
        });
      }
      
      return {
        success: true,
        output: `Successfully edited ${path}\n\n` +
                `Replaced:\n${oldText.substring(0, 100)}${oldText.length > 100 ? '...' : ''}\n\n` +
                `With:\n${newText.substring(0, 100)}${newText.length > 100 ? '...' : ''}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to edit file: ${error.message}`
      };
    }
  }
};

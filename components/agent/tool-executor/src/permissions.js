/**
 * Permissions - Permission checking and validation for tool execution
 */

/**
 * Valid permission types
 */
export const VALID_PERMISSIONS = ['fs', 'network', 'ui'];

/**
 * Check if requested permissions are granted
 *
 * @param {string[]} requiredPermissions - Permissions required by the tool
 * @param {string[]} grantedPermissions - Permissions granted in execution context
 * @returns {boolean} True if all required permissions are granted
 */
export function checkPermissions(requiredPermissions, grantedPermissions) {
  if (!Array.isArray(requiredPermissions) || !Array.isArray(grantedPermissions)) {
    return false;
  }

  // Check that all required permissions are granted
  return requiredPermissions.every(perm => {
    // Validate permission is known
    if (!VALID_PERMISSIONS.includes(perm)) {
      console.warn(`Unknown permission: ${perm}`);
      return false;
    }

    return grantedPermissions.includes(perm);
  });
}

/**
 * Validate permission array
 *
 * @param {string[]} permissions - Permissions to validate
 * @returns {object} Validation result with valid boolean and errors array
 */
export function validatePermissions(permissions) {
  const errors = [];

  if (!Array.isArray(permissions)) {
    errors.push('Permissions must be an array');
    return { valid: false, errors };
  }

  permissions.forEach((perm, index) => {
    if (typeof perm !== 'string') {
      errors.push(`Permission at index ${index} must be a string`);
    } else if (!VALID_PERMISSIONS.includes(perm)) {
      errors.push(`Unknown permission: ${perm}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get permission description
 *
 * @param {string} permission - Permission name
 * @returns {string} Human-readable description
 */
export function getPermissionDescription(permission) {
  const descriptions = {
    'fs': 'File system access (read/write files)',
    'network': 'Network access (HTTP requests)',
    'ui': 'UI interaction (post messages to main thread)'
  };

  return descriptions[permission] || 'Unknown permission';
}

/**
 * Check if permission is valid
 *
 * @param {string} permission - Permission to check
 * @returns {boolean} True if permission is valid
 */
export function isValidPermission(permission) {
  return VALID_PERMISSIONS.includes(permission);
}

export default {
  checkPermissions,
  validatePermissions,
  getPermissionDescription,
  isValidPermission,
  VALID_PERMISSIONS
};

# Logger Utility Documentation

## Overview
The centralized logging utility for BabyRhythm provides environment-aware logging that only runs in development mode by default.

## Features
- ✅ **Environment-aware**: Only logs in development (no production pollution)
- ✅ **Multiple log levels**: debug, info, warn, error
- ✅ **Runtime control**: Can be toggled via localStorage
- ✅ **Consistent API**: Similar to console methods
- ✅ **Context prefixes**: Better organization of logs

## Usage

### Basic Logging
```typescript
import { logger } from '@/utils/logger';

// Different log levels
logger.debug('Component rendered', { props, state });
logger.info('User action', { action: 'click', target: 'button' });
logger.warn('Slow operation', { duration: 5000 });
logger.error('API failed', error, { endpoint: '/api/data' });
```

### Convenience Functions
```typescript
import { logActivity, logAPI, logAuth, logError } from '@/utils/logger';

// Specialized logging
logActivity('create', newActivity);
logAPI('POST /activities', requestData);
logAuth('login', { userId: user.id });
logError('Photo upload failed', error);
```

### Grouping Related Logs
```typescript
logger.group('Processing batch');
items.forEach(item => {
  logger.info('Processing', item);
});
logger.groupEnd();
```

### Timing Operations
```typescript
logger.time('fetch-activities');
await fetchActivities();
logger.timeEnd('fetch-activities'); // Prints: fetch-activities: 234ms
```

## Runtime Control

### From Browser Console
```javascript
// Enable logging in production for debugging
window.logger.setEnabled(true);

// Change log level
window.logger.setLevel('debug'); // Show all logs
window.logger.setLevel('error'); // Only errors

// Disable logging
window.logger.setEnabled(false);
```

### Via localStorage
```javascript
localStorage.setItem('debug_logging_enabled', 'true');
localStorage.setItem('debug_log_level', 'debug');
```

## Migration Guide

Replace console.log statements:

```typescript
// ❌ Before
console.log('User logged in:', user);
console.error('Failed to save:', error);

// ✅ After
import { logger, logAuth, logError } from '@/utils/logger';

logger.info('User logged in', user);
logError('Failed to save', error);
```

## Log Levels

- **debug**: Detailed information for debugging (lowest priority)
- **info**: General informational messages
- **warn**: Warning messages for potential issues
- **error**: Error messages (highest priority, always logged in dev)

## Best Practices

1. **Use appropriate levels**: Don't use `info` for debug data
2. **Add context**: Include relevant data with each log
3. **Group related logs**: Use `group()` for multi-step operations
4. **Time slow operations**: Use `time()` to identify bottlenecks
5. **Remove sensitive data**: Never log passwords, tokens, etc.

## Examples by Feature

### Activity Tracking
```typescript
import { logActivity } from '@/utils/logger';

logActivity('created', { type: 'feed', id: activity.id });
logActivity('updated', { id: activity.id, changes });
logActivity('deleted', { id: activity.id });
```

### API Calls
```typescript
import { logAPI } from '@/utils/logger';

logAPI('Fetching activities', { householdId, filters });
logAPI('Creating activity', { type, details });
```

### Error Handling
```typescript
import { logError } from '@/utils/logger';

try {
  await riskyOperation();
} catch (error) {
  logError('Operation failed', error);
  // Handle error...
}
```

## Benefits

1. **Performance**: Zero overhead in production (unless explicitly enabled)
2. **Security**: No accidental data leakage in production logs
3. **Debugging**: Can enable in production for live debugging
4. **Organization**: Prefixed logs are easier to filter
5. **Consistency**: Same API across entire codebase

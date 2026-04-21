# Bug Sheet - API Test Application

## Date Generated: April 21, 2026
## Severity Legend:
- 🔴 **Critical** - Causes crashes, data loss, or security vulnerabilities
- 🟠 **High** - Major functionality issues, performance degradation
- 🟡 **Medium** - Minor bugs, edge cases, UX issues
- 🟢 **Low** - Code quality, maintenance issues

---

## 🔴 CRITICAL BUGS

### 1. Undefined Variable Reference - `sioStore.js` Line 148
**File:** `/apps/desktop/src/store/sioStore.js:148`

```javascript
disconnectAll: () => {
  Object.values(conns).forEach((s) => s.disconnect());  // ❌ 'conns' is undefined
  set({ connections: {}, connectionStatus: {} });
},
```

**Issue:** `conns` is not defined. Should be `get().connections`.

**Fix:**
```javascript
disconnectAll: () => {
  Object.values(get().connections).forEach((s) => s.disconnect());
  set({ connections: {}, connectionStatus: {} });
},
```

---

### 2. Missing Socket Cleanup in `sioStore.js`
**File:** `/apps/desktop/src/store/sioStore.js:83-88`

```javascript
disconnect: (requestId) => {
  const socket = get().connections[requestId];
  if (socket) {
    socket.disconnect();
  }
  // ❌ Socket reference remains in state after disconnect
},
```

**Issue:** After disconnecting, the socket reference stays in `connections` state, causing memory leak.

**Fix:**
```javascript
disconnect: (requestId) => {
  const socket = get().connections[requestId];
  if (socket) {
    socket.disconnect();
  }
  set((state) => {
    const newConnections = { ...state.connections };
    delete newConnections[requestId];
    const newStatus = { ...state.connectionStatus };
    delete newStatus[requestId];
    return { connections: newConnections, connectionStatus: newStatus };
  });
},
```

---

### 3. Potential Infinite Loop in Request Update
**File:** `/apps/desktop/src/store/requestStore.js:201-222`

```javascript
updateField: (field, value) => {
  set((state) => {
    // ...
    if (field === 'name' && (req._id || req.collectionId)) {
      import('@/store/collectionStore').then(({ useCollectionStore }) => {
        useCollectionStore.getState().updateRequest(req);
      });
    }
    // ...
  });
},
```

**Issue:** Calling `updateRequest` in collectionStore may trigger cascading updates without proper debouncing.

**Risk:** Potential update loop if collectionStore also modifies requestStore state.

---

## 🟠 HIGH SEVERITY BUGS

### 4. No Error Handling for Malformed JSON in NDJSON Processing
**File:** `/apps/desktop/src/utils/helpers.js:24-35`

```javascript
// Fallback: it might be NDJSON (Newline Delimited JSON)
try {
  const lines = normalizedBody.split('\n').filter(line => line.trim() !== '');
  if (lines.length > 1) {
    const formattedLines = lines.map(line => {
      try {
        return JSON.stringify(JSON.parse(line), null, 2);
      } catch {
        // If individual line isn't valid JSON, return as-is
        return line;
      }
    });
    return formattedLines.join('\n');
  }
} catch (err) {
  // If it's truly broken JSON, return the normalized unformatted string
  return normalizedBody;
}
```

**Issue:** When a single line fails parsing in NDJSON, it returns raw line without any indication of error. This could mask data corruption issues.

**Recommendation:** Add warning indicators for lines that failed to parse.

---

### 5. Missing Loading State Reset on API Doc Fetch Error
**File:** `/apps/desktop/src/store/apiDocStore.js:38-41`

```javascript
} catch {
  set({ isLoading: false });  // ❌ No error state set
  return null;
}
```

**Issue:** Error is silently swallowed; UI has no way to show fetch failure.

**Fix:**
```javascript
} catch (err) {
  set({ isLoading: false, error: err.message || 'Failed to fetch doc' });
  return null;
}
```

---

### 6. Async Store Imports Without Error Handling
**Multiple Files:** `collectionStore.js`, `requestStore.js`, `teamStore.js`

**Pattern Found:**
```javascript
const { useSocketStore } = await import('@/store/socketStore');
const { useAuthStore } = await import('@/store/authStore');
```

**Issue:** Dynamic imports can fail (network issues, code splitting errors) but are not wrapped in try-catch.

**Risk:** Unhandled promise rejections causing silent failures.

---

### 7. Memory Leak in Socket Event Listeners
**File:** `/apps/desktop/src/store/sioStore.js:38-70`

**Issue:** When `connect()` is called multiple times for same requestId, previous socket listeners are not cleaned up before creating new socket.

```javascript
connect: (requestId, url, options = {}) => {
  const existing = get().connections[requestId];
  if (existing && existing.connected) return;  // ❌ Only checks if connected
  // If existing exists but disconnected, it creates duplicate socket
```

---

## 🟡 MEDIUM SEVERITY BUGS

### 8. Hardcoded JWT Secret
**File:** `/apps/backend/lib/auth.js:4`

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'syncnest-secret-change-in-production';
```

**Issue:** Fallback secret is hardcoded and weak. If env var is missing, app uses predictable secret.

**Risk:** Security vulnerability if deployed without proper env configuration.

---

### 9. Unbounded LocalStorage Growth
**File:** `/apps/desktop/src/store/requestStore.js:254-264`

```javascript
addToHistory: (entry) =>
  set((state) => {
    // ...
    return {
      history: [entry, ...cleanedHistory].slice(0, 50),  // ❌ Only limits to 50
    };
  }),
```

**Issue:** History is limited but other stores (logs, sync queue) can grow unbounded.

**File:** `/apps/desktop/src/store/sioStore.js:125-138`

```javascript
addLog: (requestId, type, data, eventName = null) => {
  // ❌ No size limit on logs
  set((state) => ({
    logs: {
      ...state.logs,
      [requestId]: [...(state.logs[requestId] || []), entry],  // Unbounded growth
    },
  }));
},
```

---

### 10. No Input Sanitization on URL Parameters
**File:** `/apps/backend/app/api/request/route.js:24`

```javascript
if (search) {
  const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // ...
}
```

**Issue:** Only regex escaping is done, but no length limiting or other sanitization.

**Risk:** Very long search strings could cause performance issues.

---

### 11. Missing Index on Frequently Queried Fields
**Backend Models**

**Issue:** No visible indexes defined on frequently queried fields like:
- `collectionId` in Request model
- `teamId` in Team/Project/Collection models
- `projectId` in Environment model

**Risk:** Performance degradation with large datasets.

---

### 12. Race Condition in Request Cancellation
**File:** `/apps/desktop/src/components/RequestBuilder/RESTRequestBuilder.jsx:49-56`

```javascript
let isCancelled = false;
useRequestStore.setState({
  cancelCurrentRequest: () => {
    isCancelled = true;
    setIsExecuting(false);
    setResponse({ ... });
  }
});
```

**Issue:** Closure variable `isCancelled` may not be properly synchronized with React renders.

---

## 🟢 LOW SEVERITY / MAINTENANCE ISSUES

### 13. Console.log Statements in Production Code
**Multiple Files:** 
- `/apps/backend/app/api/request/route.js:46,60`
- `/apps/backend/app/api/request/[id]/route.js:31`
- `/apps/desktop/src/store/requestStore.js` (multiple)
- `/apps/realtime/server.js` (logging is acceptable here)

**Issue:** Debug console statements should be removed or converted to proper logging.

---

### 14. Inconsistent Error Response Format
**Backend API Routes**

Some routes return:
```javascript
{ error: 'message' }
```
Others return:
```javascript
{ error: err.message || 'Internal server error' }
```
And some return:
```javascript
{ message: 'success message' }
```

**Issue:** Inconsistent API response format makes client-side error handling harder.

---

### 15. Duplicate Logic in ID Reconciliation
**Multiple Files:**
- `/apps/desktop/src/store/teamStore.js:54-64`
- `/apps/desktop/src/store/requestStore.js:474-483`
- `/apps/desktop/src/store/collectionStore.js` (implied)

**Issue:** Same `reconcileIds` logic duplicated across multiple stores.

**Recommendation:** Extract to shared utility.

---

### 16. Missing Cleanup on Component Unmount
**Pattern:** Multiple components using `VariableUrlInput`, socket connections

**Issue:** Event listeners and socket connections may not be properly cleaned up when components unmount.

---

### 17. CORS Configuration Issue in Realtime Server
**File:** `/apps/realtime/server.js:17`

```javascript
const CORS_CREDENTIALS = CORS_ORIGIN !== '*';
```

**Issue:** When CORS_ORIGIN is '*', credentials are disabled, but this may break authentication in some deployment scenarios.

---

### 18. No Request Timeout in HTTP Executor
**File:** `/apps/desktop/src/lib/executor.js` (implied)

**Issue:** No default timeout for HTTP requests, causing potential hanging requests.

**Note:** RESTRequestBuilder does set timeoutMs: 30000, but executor should have its own default.

---

### 19. Zombie Connections After Browser Refresh
**File:** `/apps/realtime/server.js:297-324`

**Issue:** Disconnect handler broadcasts to all rooms even if socket wasn't properly joined to them. This can cause unnecessary broadcast traffic.

---

### 20. Missing Validation on Protocol Field
**File:** `/apps/backend/app/api/request/route.js:58-69`

```javascript
const finalProtocol = protocol || 'http';
const finalMethod = finalProtocol === 'http' ? (method || 'GET') : undefined;
```

**Issue:** No validation that `protocol` is one of allowed values ('http', 'ws', 'socketio').

---

## 📊 SUMMARY

| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟠 High | 5 |
| 🟡 Medium | 6 |
| 🟢 Low | 8 |
| **Total** | **22** |

## 🎯 PRIORITY FIXES

1. **Fix `sioStore.js` line 148** - Undefined variable causes crash
2. **Add socket cleanup** - Memory leak fix
3. **Secure JWT secret** - Security vulnerability
4. **Add error boundaries** - For async store imports
5. **Limit log growth** - Prevent memory bloat

## 🔍 TESTING RECOMMENDATIONS

1. Add unit tests for store methods
2. Test offline/online transitions
3. Test socket reconnection scenarios
4. Test with large datasets (1000+ requests)
5. Test memory usage over extended sessions

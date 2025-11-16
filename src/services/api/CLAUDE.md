[Root Directory](../../../CLAUDE.md) > [src](../../) > [services](../) > **api**

# API Module

## Change Log (Changelog)

### 2025-11-16 21:32:07
- Initial documentation for API module
- Comprehensive WeChat Reading API client documentation
- Error handling and rate limiting guide

---

## Module Responsibilities

The API module provides a **type-safe HTTP client** for the WeChat Reading platform API. It handles:

1. **Authentication**: QR code login flow with long-polling
2. **Feed Discovery**: Convert WeChat share links to feed metadata
3. **Article Fetching**: Paginated article downloads
4. **Error Handling**: API-specific error codes and retry logic
5. **Rate Limiting**: Account blacklist detection

**External Dependency**: WeChat Reading API at `https://weread.111965.xyz` (configurable)

---

## Entry and Startup

API client is instantiated by services that need it:

```typescript
// In AccountService or FeedService
import { WeChatApiClient } from './api/WeChatApiClient';

export class AccountService {
  private apiClient: WeChatApiClient;

  constructor(plugin: WeWeRssPlugin) {
    this.apiClient = new WeChatApiClient(plugin.settings.platformUrl);
  }
}
```

**No initialization required** - client is stateless.

---

## External Interfaces

### WeChatApiClient

#### Authentication APIs

```typescript
// Step 1: Generate QR code for user to scan
createLoginUrl(): Promise<CreateLoginUrlResponse>
// Returns: { uuid: string, qrcode: string (base64) }

// Step 2: Poll for login result (120s timeout)
getLoginResult(uuid: string): Promise<GetLoginResultResponse>
// Returns: { token?: string, vid?: number, username?: string, message: string }
```

**Login Flow**:
1. Call `createLoginUrl()` → Display QR code to user
2. User scans with WeChat app
3. Call `getLoginResult(uuid)` in loop until success
4. Save `{token, vid}` as account credentials

---

#### Feed Discovery APIs

```typescript
// Get feed info from WeChat share link (no auth)
getMpInfo(wxsLink: string): Promise<GetMpInfoResponse>
// Returns: Array<{ id: string, name: string, description: string }>

// Get feed info with authenticated account (better rate limits)
getMpInfoWithAuth(
  wxsLink: string,
  accountId: string,
  token: string
): Promise<GetMpInfoResponse>
```

**Share Link Format**: `https://mp.weixin.qq.com/s/...` or `http://mp.weixin.qq.com/mp/homepage?__biz=...`

---

#### Article Fetching APIs

```typescript
// Get articles for a public account (requires auth)
getMpArticles(
  mpId: string,
  accountId: string,
  token: string,
  page?: number  // Default: 1
): Promise<GetMpArticlesResponse>
// Returns: Array<{
//   id: string,
//   title: string,
//   content_html: string,
//   url: string,
//   published_at: number
// }>
```

**Pagination**: Articles are returned in pages of ~10-20 items. Call with `page=2`, `page=3`, etc.

---

#### Configuration

```typescript
// Update API base URL
setPlatformUrl(url: string): void

// Get current URL
getPlatformUrl(): string
```

---

## Key Dependencies and Configuration

### HTTP Client

Uses **Obsidian's `requestUrl`** API instead of `fetch`:

**Why?**
- Bypasses CORS restrictions
- Electron's network layer (no browser security)
- Built-in timeout handling

```typescript
import { requestUrl } from 'obsidian';

const response = await requestUrl({
  url: `${this.baseUrl}/api/v2/endpoint`,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

return response.json;
```

### Configuration

From plugin settings:
- `platformUrl`: API base URL (default: `https://weread.111965.xyz`)
- No API keys required (uses account tokens)

---

## Data Models

### API Types

Defined in `src/services/api/types.ts`:

#### CreateLoginUrlResponse
```typescript
{
  uuid: string;      // Long-polling identifier
  qrcode: string;    // Base64-encoded QR code image
}
```

#### GetLoginResultResponse
```typescript
{
  token?: string;     // Authentication token (on success)
  vid?: number;       // Virtual ID (on success)
  username?: string;  // WeChat username (on success)
  message: string;    // Status message ("waiting" | "success" | "expired")
}
```

#### GetMpInfoResponse
```typescript
Array<{
  id: string;          // WeChat MP ID (e.g., "MP_WXS_123")
  name: string;        // Public account name
  description: string; // Account description
}>
```

#### GetMpArticlesResponse
```typescript
Array<{
  id: string;          // Article ID
  title: string;
  content_html: string; // Raw HTML content
  url: string;         // Permanent link
  published_at: number; // Unix timestamp (seconds)
}>
```

### Error Codes

```typescript
enum ApiErrorCode {
  UNAUTHORIZED = '401',        // Token expired
  BAD_REQUEST = '400',         // Invalid parameters
  TOO_MANY_REQUESTS = '429',   // Rate limited (小黑屋)
  INTERNAL_ERROR = '500'       // Server error
}

interface ApiError {
  code: ApiErrorCode;
  message: string;
  details: any;
}
```

---

## Testing and Quality

### Test Coverage

**90% coverage** (API client methods tested with mocked responses)

### Test Strategy

**Mock API Responses**:
```typescript
// src/__tests__/mocks/api-responses.ts
export const mockLoginUrlResponse = {
  uuid: 'test-uuid-12345',
  qrcode: 'data:image/png;base64,iVBORw0KG...'
};

export const mockLoginSuccessResponse = {
  token: 'test-token',
  vid: 12345,
  username: 'test_user',
  message: 'success'
};
```

**Mocking `requestUrl`**:
```typescript
import { requestUrl } from 'obsidian';
jest.mock('obsidian');

(requestUrl as jest.Mock).mockResolvedValue({
  status: 200,
  json: mockLoginUrlResponse
});
```

### Sample Test
```typescript
describe('WeChatApiClient', () => {
  let client: WeChatApiClient;

  beforeEach(() => {
    client = new WeChatApiClient('https://test.api.com');
  });

  it('should create login URL', async () => {
    const result = await client.createLoginUrl();
    expect(result.uuid).toBeDefined();
    expect(result.qrcode).toContain('data:image');
  });
});
```

---

## Frequently Asked Questions (FAQ)

### Q: How do I handle rate limiting (小黑屋)?

**Detection**:
```typescript
try {
  await apiClient.getMpArticles(mpId, accountId, token);
} catch (error) {
  if (error.code === ApiErrorCode.TOO_MANY_REQUESTS) {
    // Account is blacklisted
    accountRepository.blacklist(accountId, 24 * 60 * 60 * 1000); // 24h
  }
}
```

**Prevention**:
- Use `updateDelay` setting between requests (default: 60s)
- Rotate between multiple accounts
- Respect `staleThresholdHours` when syncing

### Q: What if login QR code expires?

**Behavior**:
- QR codes expire after ~5 minutes
- `getLoginResult()` returns `{message: "expired"}`

**Handling**:
```typescript
const result = await apiClient.getLoginResult(uuid);
if (result.message === 'expired') {
  // Generate new QR code
  const newLogin = await apiClient.createLoginUrl();
  // Show new QR to user
}
```

### Q: How do I test API changes locally?

**Use Local WeWe RSS Server**:
1. Clone [wewe-rss](https://github.com/cooderl/wewe-rss)
2. Run server: `docker-compose up`
3. Update plugin setting: `platformUrl = 'http://localhost:3000'`

### Q: Why long-polling for login?

**Alternative Would Be**:
- Constantly polling every 1-2 seconds (wasteful)
- WebSocket connection (complex)

**Long-Polling Benefits**:
- Server holds request until scan or 120s timeout
- Reduces network traffic
- Simple implementation

### Q: Can I use multiple accounts simultaneously?

**Yes**, but carefully:
- Each feed is tied to one account
- Rotate accounts to distribute load
- Monitor blacklist status for each account

---

## Related File List

### Core Files
- `src/services/api/WeChatApiClient.ts` (243 lines)
- `src/services/api/types.ts` (87 lines)

### Usage
- `src/services/AccountService.ts` - Login flow
- `src/services/FeedService.ts` - Feed discovery, article fetching

### Test Files
- `src/__tests__/mocks/api-responses.ts` - Mock responses
- Tested indirectly via AccountService and FeedService tests

### Related
- `src/ui/modals/AddAccountModal.ts` - QR code display
- `src/ui/modals/AddFeedModal.ts` - Share link input

---

**Last Updated**: 2025-11-16 21:32:07

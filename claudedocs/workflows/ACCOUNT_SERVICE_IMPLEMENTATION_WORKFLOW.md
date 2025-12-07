# Account Service Implementation Workflow

**Document Version**: 1.0
**Generated**: 2025-12-07
**Service**: Account Service
**Target Stack**: NestJS 10.4.15, MongoDB 8.0+, Redis 7.0+, Node.js 22

---

## Executive Summary

**Scope**: Platform-level authentication and user management service
**Complexity**: High (35 endpoints, 8 services, 4 collections, OAuth integration)
**Estimated Timeline**: 4-6 weeks (single developer) | 2-3 weeks (2 developers)
**Risk Level**: Medium (OAuth integration, security critical, multi-provider complexity)

**Key Deliverables**:
- 35 REST API endpoints across 7 functional domains
- 8 specialized service classes with clear separation of concerns
- 4 MongoDB collections with optimized indexes and TTL policies
- OAuth integration with 5 providers (Google, Facebook, Apple, Discord, Steam)
- TOTP 2FA with QR codes and backup codes
- Subscription management with 3 tiers (Free, Pro, Enterprise)
- Comprehensive security layer (rate limiting, lockout, audit logs)

---

## Phase Overview

### Phase 1: Foundation (Week 1)
**Goal**: Database schemas, core infrastructure, shared utilities
**Effort**: 20-25 hours
**Dependencies**: None
**Validation Gate**: Schemas compile, indexes created, basic service instantiation

### Phase 2: Core Authentication (Week 2)
**Goal**: Email/password auth, JWT tokens, session management
**Effort**: 25-30 hours
**Dependencies**: Phase 1 complete
**Validation Gate**: Login/logout working, sessions tracked, security logs active

### Phase 3: Advanced Security (Week 3)
**Goal**: 2FA, password management, OAuth integration
**Effort**: 30-35 hours
**Dependencies**: Phase 2 complete
**Validation Gate**: 2FA flow working, password reset functional, 1+ OAuth provider integrated

### Phase 4: Account Management (Week 4)
**Goal**: Profile management, subscription system, admin tools
**Effort**: 25-30 hours
**Dependencies**: Phase 3 complete
**Validation Gate**: All 35 endpoints functional, subscription limits enforced

### Phase 5: Production Readiness (Week 5-6)
**Goal**: Testing, documentation, deployment, monitoring
**Effort**: 20-30 hours
**Dependencies**: Phase 4 complete
**Validation Gate**: 90%+ test coverage, E2E tests pass, deployment successful

---

## Detailed Implementation Plan

## Phase 1: Foundation (Week 1)

### 1.1 Database Schema Implementation
**Priority**: CRITICAL
**Estimated Time**: 8 hours
**Dependencies**: None

#### Tasks

**1.1.1 MongoDB Schemas** (4 hours)
```
Location: apps/account/src/schemas/

Files to create:
- account.schema.ts (Account collection - primary user data)
- session.schema.ts (Session collection - multi-device sessions)
- security-log.schema.ts (SecurityLog collection - audit trail)
- verification-token.schema.ts (VerificationTokens collection - email/reset tokens)

Implementation order:
1. Account schema (lines 1126-1253 from spec)
   - Custom id field: acc_{timestamp}_{random}
   - Email unique index (lowercase)
   - Password hash (bcrypt, optional for OAuth-only)
   - 2FA fields (secret, backup codes - encrypted/hashed)
   - OAuth linked accounts array
   - Subscription object (tier, status, Stripe IDs)
   - Usage tracking object
   - Account status enum validation
   - Timestamps (createdAt, updatedAt)

2. Session schema (lines 1257-1324)
   - Custom id field: session_{timestamp}_{random}
   - AccountId foreign key reference
   - RefreshToken hashed storage
   - Device metadata (platform, browser, OS)
   - Geolocation data (city, country, coordinates)
   - TTL index on expiresAt field (auto-cleanup)

3. SecurityLog schema (lines 1328-1377)
   - Custom id field: log_{timestamp}_{random}
   - Event type enum (login_success, password_changed, etc.)
   - IP address and geolocation tracking
   - TTL index: 365 days retention

4. VerificationToken schema (lines 1381-1418)
   - Token unique index
   - Type enum (email_verification, password_reset, email_change)
   - TTL index on expiresAt (auto-cleanup)

Validation:
✓ All schemas compile without errors
✓ Indexes created successfully
✓ TTL indexes configured properly
✓ Enum validations work correctly
```

**1.1.2 Database Indexes** (2 hours)
```
Critical indexes for performance:

Account collection:
- { email: 1 } - unique, case-insensitive queries
- { id: 1 } - primary key lookups
- { status: 1 } - filtering active/suspended accounts
- { 'linkedAccounts.provider': 1, 'linkedAccounts.oauthId': 1 } - OAuth lookups
- { createdAt: -1 } - pagination and sorting

Session collection:
- { id: 1 } - primary key lookups
- { accountId: 1, revoked: 1 } - active sessions per account
- { refreshToken: 1 } - token verification
- { expiresAt: 1 } - TTL cleanup (expireAfterSeconds: 0)

SecurityLog collection:
- { accountId: 1, timestamp: -1 } - user security history
- { type: 1 } - event type filtering
- { timestamp: 1 } - TTL cleanup (expireAfterSeconds: 31536000)

VerificationToken collection:
- { token: 1 } - unique, token verification
- { accountId: 1, type: 1 } - pending verifications per account
- { expiresAt: 1 } - TTL cleanup (expireAfterSeconds: 0)

Validation:
✓ Index creation scripts tested
✓ Query performance benchmarked
✓ TTL behavior verified in test environment
```

**1.1.3 DTO Definitions** (2 hours)
```
Location: apps/account/src/dto/

Files to create:
- account.dto.ts (CreateAccountDto, UpdateAccountDto)
- auth.dto.ts (LoginDto, LoginWith2FADto, RefreshTokenDto)
- password.dto.ts (ChangePasswordDto, ResetPasswordRequestDto, ResetPasswordDto)
- oauth.dto.ts (LinkOAuthDto, UnlinkOAuthDto)
- session.dto.ts (CreateSessionDto, RevokeSessionDto)
- subscription.dto.ts (UpgradeSubscriptionDto, CancelSubscriptionDto)
- admin.dto.ts (SearchAccountsDto, SuspendAccountDto)

Each DTO requires:
- TypeBox schema validation (@sinclair/typebox already in deps)
- Field-level validation rules
- Transform decorators (e.g., lowercase email)
- Swagger/OpenAPI decorators

Validation:
✓ All DTOs compile and validate correctly
✓ Validation rules match spec requirements
✓ TypeBox schemas generate proper JSON schemas
```

### 1.2 Module Structure Setup
**Priority**: CRITICAL
**Estimated Time**: 6 hours
**Dependencies**: 1.1 complete

#### Tasks

**1.2.1 Account Module Configuration** (3 hours)
```
Location: apps/account/src/modules/

File: account.module.ts (lines 1427-1508 from spec)

Module imports:
1. MongooseModule.forFeature() - register 4 schemas
2. JwtModule.registerAsync() - JWT config from env
3. PassportModule - default strategy: jwt
4. ThrottlerModule - rate limiting config
   - Login: 5 attempts per 15 minutes
   - Register: 3 attempts per 1 hour
5. RedisModule - session and rate limit storage
6. ConfigModule - environment variables

Providers to register:
- AccountService (core account CRUD)
- AuthService (login, logout, token management)
- PasswordService (hashing, validation, reset)
- TwoFactorService (TOTP, backup codes)
- SessionService (multi-device session tracking)
- OAuthService (provider integration)
- EmailService (verification, password reset emails)
- SecurityService (audit logs, suspicious activity)
- SubscriptionService (tier management, usage tracking)

Strategies to register:
- JwtStrategy (passport-jwt)
- GoogleStrategy (passport-google-oauth20)
- FacebookStrategy (passport-facebook)
- AppleStrategy (passport-apple)
- DiscordStrategy (passport-discord)
- SteamStrategy (passport-steam)

Exports:
- AccountService (for use in other microservices)
- AuthService (for Player Service auth validation)
- SessionService (for cross-service session checks)

Validation:
✓ Module compiles successfully
✓ All providers instantiate without errors
✓ Dependency injection graph resolves correctly
```

**1.2.2 Environment Configuration** (2 hours)
```
Location: apps/account/.env.template

Required environment variables:

# Database
MONGODB_URI=mongodb://localhost:27017/gamification
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here (min 32 chars)
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/accounts/oauth/google/callback

# OAuth - Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/v1/accounts/oauth/facebook/callback

# OAuth - Apple
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=/path/to/apple-private-key.p8
APPLE_CALLBACK_URL=http://localhost:3000/api/v1/accounts/oauth/apple/callback

# OAuth - Discord
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:3000/api/v1/accounts/oauth/discord/callback

# OAuth - Steam
STEAM_API_KEY=your-steam-api-key
STEAM_CALLBACK_URL=http://localhost:3000/api/v1/accounts/oauth/steam/callback

# Email - SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Gamification Platform

# Security
BCRYPT_ROUNDS=10
PASSWORD_MIN_LENGTH=8
ACCOUNT_LOCKOUT_DURATION=900 (15 minutes in seconds)
MAX_LOGIN_ATTEMPTS=5

# Rate Limiting
RATE_LIMIT_LOGIN_TTL=900000 (15 minutes in ms)
RATE_LIMIT_LOGIN_LIMIT=5
RATE_LIMIT_REGISTER_TTL=3600000 (1 hour in ms)
RATE_LIMIT_REGISTER_LIMIT=3

# Session
SESSION_EXPIRY=604800 (7 days in seconds)
MAX_SESSIONS_PER_ACCOUNT=10

# 2FA
TOTP_WINDOW=1 (time window for code validation)
BACKUP_CODES_COUNT=10

# Subscription - Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

Validation:
✓ Config service loads all variables
✓ Type validation for numeric values
✓ Required variables throw errors if missing
```

**1.2.3 Shared Libraries Integration** (1 hour)
```
Location: libs/

Existing libraries to integrate:
- @gamification-api/core - base abstractions
- @gamification-api/models - shared TypeBox schemas
- @gamification-api/decorators - custom decorators (@CurrentAccount, @JwtAuth)
- @gamification-api/helpers - utility functions
- @gamification-api/interceptors - logging, error handling
- @gamification-api/middlewares - request context

New account-specific utilities:
- libs/helpers/src/id-generator.ts - generate acc_*, session_*, log_* IDs
- libs/helpers/src/geo-location.ts - IP to location mapping
- libs/decorators/src/rate-limit.ts - custom rate limiting decorator

Validation:
✓ All imports resolve correctly
✓ Shared libraries work in account context
✓ No circular dependency issues
```

### 1.3 Core Service Utilities
**Priority**: HIGH
**Estimated Time**: 6 hours
**Dependencies**: 1.1, 1.2 complete

#### Tasks

**1.3.1 Password Service Foundation** (2 hours)
```
Location: apps/account/src/services/password.service.ts

Core responsibilities:
- Password hashing (bcrypt, 10 rounds)
- Password comparison (constant-time)
- Password strength validation
- Common password blacklist checking

Methods to implement:
1. hashPassword(password: string): Promise<string>
   - Use bcrypt.hash() with configured rounds
   - Handle hashing errors gracefully

2. comparePassword(password: string, hash: string): Promise<boolean>
   - Use bcrypt.compare() (constant-time)
   - Prevent timing attacks

3. validatePasswordStrength(password: string): void
   - Min 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
   - At least 1 special character (!@#$%^&*()_+-=[]{};:,.<>?)
   - Not in common password list (optional)
   - Throw BadRequestException with specific requirements

Implementation from spec (lines 1926-1962):
- PASSWORD_REQUIREMENTS constant
- Detailed validation messages
- Regex pattern matching

Validation:
✓ Password hashing produces consistent results
✓ Password comparison works correctly
✓ Validation catches weak passwords
✓ Error messages are user-friendly
```

**1.3.2 Email Service Foundation** (2 hours)
```
Location: apps/account/src/services/email.service.ts

Core responsibilities:
- Email verification emails
- Password reset emails
- Account suspension notifications
- Security alert emails

Email templates needed:
1. verification-email.hbs - email verification with token link
2. password-reset.hbs - password reset with token link
3. password-changed.hbs - notification of password change
4. account-suspended.hbs - suspension notification with reason
5. security-alert.hbs - suspicious activity notification
6. welcome-email.hbs - welcome email after verification

Methods to implement:
1. sendVerificationEmail(account: Account, token: string): Promise<void>
2. sendPasswordResetEmail(account: Account, token: string): Promise<void>
3. sendPasswordChangedEmail(account: Account): Promise<void>
4. sendAccountSuspendedEmail(account: Account, reason: string): Promise<void>
5. sendSecurityAlertEmail(account: Account, activity: string): Promise<void>

SendGrid integration:
- Use @sendgrid/mail package
- Template rendering with Handlebars
- Error handling and retry logic
- Queue emails for batch sending (optional)

Validation:
✓ Emails sent successfully in test environment
✓ Templates render correctly with data
✓ Error handling prevents crashes
✓ Email delivery confirmed via SendGrid dashboard
```

**1.3.3 Security Service Foundation** (2 hours)
```
Location: apps/account/src/services/security.service.ts

Core responsibilities:
- Security event logging
- Suspicious activity detection
- IP geolocation lookup
- User-agent parsing

Methods to implement:
1. logSecurityEvent(accountId: string, type: string, metadata?: any): Promise<void>
   - Create SecurityLog document
   - Extract IP, device info from context
   - Perform geolocation lookup
   - Store in MongoDB

2. detectSuspiciousActivity(accountId: string, ipAddress: string): Promise<boolean>
   - Check for login from new location
   - Check for rapid login attempts
   - Check for unusual access patterns
   - Return true if suspicious

3. getGeoLocation(ipAddress: string): Promise<GeoLocation>
   - Use IP geolocation service (e.g., ipapi.co)
   - Cache results for performance
   - Handle lookup failures gracefully

4. parseUserAgent(userAgent: string): DeviceInfo
   - Extract browser, OS, device type
   - Use ua-parser-js package

Validation:
✓ Security logs created successfully
✓ Geolocation lookup works for various IPs
✓ User-agent parsing extracts correct info
✓ Suspicious activity detection flags anomalies
```

---

## Phase 2: Core Authentication (Week 2)

### 2.1 Authentication Service Implementation
**Priority**: CRITICAL
**Estimated Time**: 12 hours
**Dependencies**: Phase 1 complete

#### Tasks

**2.1.1 Login Flow** (4 hours)
```
Endpoint: POST /api/v1/accounts/login
Implementation reference: lines 1707-1820 from spec

Steps to implement:
1. Email/password validation
   - Find account by email (case-insensitive)
   - Throw UnauthorizedException if not found
   - Log failed attempt to security log

2. Account status checks
   - Check if account is locked (accountLockedUntil > now)
   - Check if account is suspended (status === 'suspended')
   - Return appropriate error messages with timestamps

3. Password verification
   - Compare password with hash using PasswordService
   - If invalid, increment failedLoginAttempts
   - Lock account after 5 failed attempts (15 minutes)
   - Log failed attempt with reason

4. Successful authentication
   - Reset failedLoginAttempts to 0
   - Clear accountLockedUntil
   - Update lastLoginAt and lastLoginIp
   - Check if 2FA is enabled

5. Two-factor check
   - If twoFactorEnabled, generate temporary token (5 min expiry)
   - Return { requiresTwoFactor: true, tempToken }
   - Do NOT create session yet

6. Token generation (if no 2FA)
   - Generate JWT access token (1 hour expiry)
   - Generate JWT refresh token (7 days expiry)
   - Create session in SessionService
   - Log successful login to security log

Response format (lines 164-187):
{
  "account": { id, email, firstName, lastName, emailVerified, twoFactorEnabled },
  "tokens": { accessToken, refreshToken, tokenType: "Bearer", expiresIn, expiresAt },
  "session": { sessionId, deviceId, createdAt }
}

Validation:
✓ Valid credentials return tokens
✓ Invalid credentials throw UnauthorizedException
✓ Account lockout works after 5 failed attempts
✓ Suspended accounts cannot login
✓ 2FA accounts return tempToken
✓ Security logs created for all attempts
```

**2.1.2 Login with 2FA** (2 hours)
```
Endpoint: POST /api/v1/accounts/login/2fa
Implementation reference: lines 1822-1863 from spec

Steps to implement:
1. Verify temporary token
   - Decode JWT tempToken
   - Verify purpose === '2fa'
   - Check token not expired
   - Extract accountId

2. Load account and verify 2FA enabled
   - Find account by id
   - Verify twoFactorEnabled === true
   - Throw UnauthorizedException if not enabled

3. Verify 2FA code
   - Call TwoFactorService.verifyCode()
   - Check TOTP code OR backup code
   - Log failed attempt if invalid
   - Throw UnauthorizedException if invalid

4. Complete authentication
   - Generate access and refresh tokens
   - Create session
   - Log successful login

Response format (lines 202-214):
{
  "account": { id, email, twoFactorEnabled },
  "tokens": { accessToken, refreshToken, expiresIn }
}

Validation:
✓ Valid tempToken + valid code returns tokens
✓ Invalid tempToken throws error
✓ Invalid 2FA code throws error
✓ Both TOTP and backup codes work
✓ Security logs created
```

**2.1.3 Refresh Token Flow** (2 hours)
```
Endpoint: POST /api/v1/accounts/refresh
Implementation reference: lines 1865-1884 from spec

Steps to implement:
1. Verify refresh token
   - Call SessionService.verifyRefreshToken()
   - Check session exists and not revoked
   - Check session not expired
   - Throw UnauthorizedException if invalid

2. Generate new tokens
   - Create new JWT access token (1 hour)
   - Create new JWT refresh token (7 days)
   - Calculate expiresAt timestamp

3. Update session
   - Replace old refresh token hash with new one
   - Update lastActivityAt timestamp
   - Keep deviceId and other metadata

Response format (lines 230-237):
{
  "tokens": { accessToken, refreshToken, expiresIn, expiresAt }
}

Validation:
✓ Valid refresh token returns new tokens
✓ Expired refresh token throws error
✓ Revoked session throws error
✓ Old refresh token invalidated
```

**2.1.4 Logout Flow** (2 hours)
```
Endpoint: POST /api/v1/accounts/logout
Implementation reference: lines 1886-1894 from spec

Steps to implement:
1. Parse request
   - Extract sessionId from body
   - Extract logoutAllDevices boolean

2. Revoke sessions
   - If logoutAllDevices, call SessionService.revokeAllSessions()
   - Else, call SessionService.revokeSession(sessionId)
   - Handle errors gracefully

3. Security logging
   - Log logout event with sessionId
   - Include logoutAllDevices flag in metadata

Response format (lines 252-257):
{
  "message": "Logged out successfully",
  "sessionId": "session_1234567890",
  "loggedOutAt": "2025-12-03T23:15:00Z"
}

Validation:
✓ Single session logout works
✓ Logout all devices revokes all sessions
✓ Revoked sessions cannot refresh tokens
✓ Security log created
```

**2.1.5 JWT Strategy** (2 hours)
```
Location: apps/account/src/strategies/jwt.strategy.ts

Implementation:
1. Extend PassportStrategy(Strategy)
2. Configure JWT extraction from Authorization header
3. Validate token signature and expiry
4. Load account from database
5. Attach account to request context

Methods:
- constructor() - configure strategy with secret and extraction
- validate(payload: any): Promise<Account>
  - Extract accountId from payload
  - Find account by id
  - Check account status (active, not suspended)
  - Return account object (attached to req.user)

Guard usage:
- @UseGuards(JwtAuthGuard) on protected endpoints
- Custom decorator @CurrentAccount() to inject account

Validation:
✓ Valid JWT tokens authenticate successfully
✓ Expired tokens rejected
✓ Invalid signature rejected
✓ Suspended accounts rejected
✓ Account attached to request
```

### 2.2 Session Management Service
**Priority**: CRITICAL
**Estimated Time**: 8 hours
**Dependencies**: 2.1 complete

#### Tasks

**2.2.1 Session Creation** (2 hours)
```
Location: apps/account/src/services/session.service.ts

Method: createSession(accountId: string, refreshToken: string, deviceInfo?: any): Promise<Session>

Steps:
1. Hash refresh token (bcrypt or SHA-256)
2. Parse device info from user-agent
3. Extract IP address from request
4. Perform geolocation lookup
5. Generate session ID: session_{timestamp}_{random}
6. Create Session document with:
   - accountId
   - refreshToken (hashed)
   - deviceId, platform, browser, OS, appVersion
   - ipAddress, location
   - createdAt, expiresAt (7 days from now)
   - lastActivityAt

7. Check session limit per account
   - Query active sessions count for accountId
   - If >= MAX_SESSIONS_PER_ACCOUNT (10), revoke oldest session

8. Save session to MongoDB

Validation:
✓ Session created successfully
✓ Device info parsed correctly
✓ Geolocation stored
✓ Session limit enforced
```

**2.2.2 Session Verification** (2 hours)
```
Method: verifyRefreshToken(refreshToken: string): Promise<Session | null>

Steps:
1. Hash incoming refresh token
2. Find session by hashed token
3. Check session.revoked === false
4. Check session.expiresAt > now
5. Update lastActivityAt timestamp
6. Return session or null

Validation:
✓ Valid tokens return session
✓ Expired tokens return null
✓ Revoked tokens return null
✓ lastActivityAt updated
```

**2.2.3 List Active Sessions** (2 hours)
```
Endpoint: GET /api/v1/accounts/sessions
Implementation reference: lines 673-714 from spec

Steps:
1. Find all sessions for accountId where revoked === false
2. Sort by createdAt descending
3. Mark current session (compare sessionId from JWT)
4. Format response with device info, location, activity

Response format (lines 679-714):
{
  "sessions": [
    {
      sessionId, deviceId, platform, browser, os, appVersion,
      ipAddress, location: { city, country },
      isCurrent, createdAt, lastActivityAt
    }
  ],
  "total": 2
}

Validation:
✓ All active sessions returned
✓ Current session marked correctly
✓ Device info displayed
✓ Location info included
```

**2.2.4 Revoke Session(s)** (2 hours)
```
Endpoints:
- DELETE /api/v1/accounts/sessions/{sessionId} (single)
- DELETE /api/v1/accounts/sessions/all (all sessions)

Implementation reference: lines 717-750 from spec

Single revocation:
1. Find session by sessionId and accountId
2. Verify session belongs to requesting account
3. Set revoked = true, revokedAt = now
4. Save session

Revoke all sessions:
1. Parse excludeCurrent flag from request
2. Find all sessions for accountId where revoked === false
3. If excludeCurrent, exclude session from current JWT
4. Update all sessions: revoked = true, revokedAt = now
5. Return count of revoked sessions

Validation:
✓ Single session revoked successfully
✓ Revoke all works with excludeCurrent
✓ Revoked sessions cannot refresh
✓ Count returned accurately
```

### 2.3 Account Registration
**Priority**: HIGH
**Estimated Time**: 5 hours
**Dependencies**: 2.1, 2.2 complete

#### Tasks

**2.3.1 Email/Password Registration** (3 hours)
```
Endpoint: POST /api/v1/accounts/register
Implementation reference: lines 1531-1573 from spec

Steps to implement:
1. Validate input DTO
   - Email format validation
   - Password strength validation (via PasswordService)
   - Accept terms required
   - Optional: referral code, metadata

2. Check email uniqueness
   - Query Account by email (case-insensitive)
   - Throw ConflictException if exists

3. Hash password
   - Use PasswordService.hashPassword()
   - Store hash, not plaintext

4. Generate account ID
   - Format: acc_{timestamp}_{random}
   - Ensure uniqueness (unlikely collision)

5. Create account document
   - Set email (lowercase), passwordHash
   - Set firstName, lastName, dateOfBirth
   - emailVerified = false
   - status = 'active'
   - Default preferences (language: en, timezone: UTC, notifications: all true)
   - subscription: { tier: 'free', status: 'active' }
   - usage: { gamesCreated: 0, apiRequestsToday: 0 }

6. Generate verification token
   - Create VerificationToken document
   - Type: 'email_verification'
   - Token: signed JWT with accountId
   - expiresAt: 24 hours from now

7. Send verification email
   - Call EmailService.sendVerificationEmail()
   - Include token in verification link

Response format (lines 86-100):
{
  "account": { id, email, firstName, lastName, emailVerified, status, createdAt },
  "message": "Account created successfully. Please check your email to verify your account."
}

Validation:
✓ Account created with correct data
✓ Password hashed properly
✓ Verification token generated
✓ Verification email sent
✓ Duplicate email throws ConflictException
```

**2.3.2 Email Verification** (1 hour)
```
Endpoint: POST /api/v1/accounts/verify-email
Implementation reference: lines 1606-1623 from spec

Steps:
1. Verify token validity
   - Find VerificationToken by token
   - Check type === 'email_verification'
   - Check used === false
   - Check expiresAt > now
   - Throw BadRequestException if invalid

2. Update account
   - Set emailVerified = true
   - Set emailVerifiedAt = now
   - Save account

3. Mark token as used
   - Set used = true, usedAt = now
   - Save token (will be auto-deleted by TTL)

4. Send welcome email (optional)
   - Call EmailService.sendWelcomeEmail()

Response format (lines 113-123):
{
  "account": { id, email, emailVerified, verifiedAt },
  "message": "Email verified successfully"
}

Validation:
✓ Valid token verifies email
✓ Expired token throws error
✓ Used token throws error
✓ emailVerified flag set
```

**2.3.3 Resend Verification Email** (1 hour)
```
Endpoint: POST /api/v1/accounts/resend-verification
Implementation reference: lines 126-141 from spec

Steps:
1. Find account by email
   - Check account exists
   - Check emailVerified === false
   - Throw BadRequestException if already verified

2. Invalidate old tokens
   - Find existing verification tokens for account
   - Mark as used or delete

3. Generate new token
   - Create new VerificationToken
   - expiresAt: 24 hours from now

4. Send verification email
   - Call EmailService.sendVerificationEmail()

Response format (lines 136-141):
{
  "message": "Verification email sent",
  "expiresAt": "2025-12-04T00:00:00Z"
}

Validation:
✓ New token generated and sent
✓ Old tokens invalidated
✓ Already verified accounts rejected
```

---

## Phase 3: Advanced Security (Week 3)

### 3.1 Two-Factor Authentication
**Priority**: HIGH
**Estimated Time**: 10 hours
**Dependencies**: Phase 2 complete

#### Tasks

**3.1.1 Enable 2FA** (3 hours)
```
Endpoint: POST /api/v1/accounts/2fa/enable
Implementation reference: lines 408-430 from spec

Location: apps/account/src/services/two-factor.service.ts

Steps:
1. Generate TOTP secret
   - Use speakeasy.generateSecret()
   - Label: Gamification Platform (user@example.com)
   - Issuer: Gamification Platform

2. Generate QR code
   - Use qrcode package
   - Create data URL: otpauth://totp/...
   - Return base64-encoded PNG

3. Generate backup codes
   - Create 10 random codes (format: XXXX-XXXX-XXXX)
   - Hash codes with bcrypt
   - Store hashed codes in account.twoFactorBackupCodes

4. Store secret temporarily
   - Encrypt TOTP secret (AES-256)
   - Store in account.twoFactorSecret (but don't enable yet)
   - Set pending flag or use temporary storage

5. Return setup data
   - plaintext secret (for manual entry)
   - QR code image (data URL)
   - plaintext backup codes (ONLY shown once)

Response format (lines 414-430):
{
  "twoFactor": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "backupCodes": ["1234-5678-90AB", "CDEF-1234-5678", ...]
  },
  "message": "Scan the QR code with your authenticator app and verify with a code to enable 2FA"
}

Validation:
✓ TOTP secret generated correctly
✓ QR code renders in authenticator app
✓ Backup codes formatted properly
✓ Secret encrypted before storage
```

**3.1.2 Verify and Activate 2FA** (2 hours)
```
Endpoint: POST /api/v1/accounts/2fa/verify
Implementation reference: lines 432-460 from spec

Steps:
1. Load account with pending 2FA secret
2. Verify TOTP code
   - Use speakeasy.totp.verify()
   - Window: 1 (30 seconds before/after)
   - Check against stored secret

3. Activate 2FA if valid
   - Set twoFactorEnabled = true
   - Set twoFactorEnabledAt = now
   - Keep encrypted secret and hashed backup codes

4. Security logging
   - Log '2fa_enabled' event

Response format (lines 444-459):
{
  "account": { id, twoFactorEnabled, twoFactorEnabledAt },
  "backupCodes": ["1234-5678-90AB", ...],
  "message": "Two-factor authentication enabled successfully. Save your backup codes in a secure location."
}

Validation:
✓ Valid TOTP code activates 2FA
✓ Invalid code throws error
✓ Backup codes returned again
✓ twoFactorEnabled flag set
```

**3.1.3 Disable 2FA** (2 hours)
```
Endpoint: POST /api/v1/accounts/2fa/disable
Implementation reference: lines 462-484 from spec

Steps:
1. Verify password (security confirmation)
   - Use PasswordService.comparePassword()
   - Throw UnauthorizedException if invalid

2. Verify current 2FA code (double security)
   - Verify TOTP code against stored secret
   - Throw UnauthorizedException if invalid

3. Disable 2FA
   - Set twoFactorEnabled = false
   - Set twoFactorDisabledAt = now
   - Clear twoFactorSecret
   - Clear twoFactorBackupCodes

4. Security logging
   - Log '2fa_disabled' event

Response format (lines 476-483):
{
  "account": { id, twoFactorEnabled, twoFactorDisabledAt },
  "message": "Two-factor authentication disabled"
}

Validation:
✓ Password + code required
✓ 2FA disabled successfully
✓ Secret and backup codes cleared
✓ Security log created
```

**3.1.4 Regenerate Backup Codes** (2 hours)
```
Endpoint: POST /api/v1/accounts/2fa/backup-codes/regenerate
Implementation reference: lines 486-510 from spec

Steps:
1. Verify password
   - Require password for security
   - Throw UnauthorizedException if invalid

2. Generate new backup codes
   - Create 10 new random codes
   - Hash with bcrypt
   - Replace old codes in account.twoFactorBackupCodes

3. Invalidate old codes
   - Clear previous hashed codes
   - Save new codes

Response format (lines 500-509):
{
  "backupCodes": ["ABCD-1234-EFGH", ...],
  "regeneratedAt": "2025-12-03T23:50:00Z",
  "message": "Backup codes regenerated. Previous codes are now invalid."
}

Validation:
✓ New codes generated successfully
✓ Old codes no longer work
✓ New codes work for login
```

**3.1.5 2FA Code Verification Logic** (1 hour)
```
Location: apps/account/src/services/two-factor.service.ts

Method: verifyCode(account: Account, code: string): Promise<boolean>

Steps:
1. Try TOTP verification first
   - Decrypt account.twoFactorSecret
   - Use speakeasy.totp.verify() with window: 1
   - Return true if valid

2. Try backup code if TOTP fails
   - Loop through account.twoFactorBackupCodes
   - Use bcrypt.compare() for each hashed code
   - If match found, mark code as used (remove from array)
   - Return true if valid

3. Return false if both fail

Validation:
✓ TOTP codes verified correctly
✓ Backup codes verified correctly
✓ Used backup codes removed
✓ Invalid codes return false
```

### 3.2 Password Management
**Priority**: HIGH
**Estimated Time**: 8 hours
**Dependencies**: Phase 2 complete

#### Tasks

**3.2.1 Change Password** (3 hours)
```
Endpoint: POST /api/v1/accounts/password/change
Implementation reference: lines 345-365 from spec

Steps:
1. Verify current password
   - Load account by id from JWT
   - Compare currentPassword with stored hash
   - Throw UnauthorizedException if invalid

2. Validate new password strength
   - Call PasswordService.validatePasswordStrength()
   - Throw BadRequestException if weak

3. Check password history (optional)
   - Prevent reusing last 5 passwords
   - Store password hashes in account.passwordHistory array

4. Hash new password
   - Use PasswordService.hashPassword()

5. Update account
   - Set passwordHash to new hash
   - Set lastPasswordChange = now
   - Add old hash to passwordHistory (if implemented)

6. Handle session revocation
   - If logoutOtherSessions === true, revoke all sessions except current
   - Count revoked sessions

7. Send notification email
   - Call EmailService.sendPasswordChangedEmail()

8. Security logging
   - Log 'password_changed' event

Response format (lines 360-365):
{
  "message": "Password changed successfully",
  "changedAt": "2025-12-03T23:30:00Z",
  "sessionsRevoked": 3
}

Validation:
✓ Current password verified
✓ New password validated for strength
✓ Password changed successfully
✓ Other sessions revoked if requested
✓ Notification email sent
```

**3.2.2 Request Password Reset** (2 hours)
```
Endpoint: POST /api/v1/accounts/password/reset-request
Implementation reference: lines 367-383 from spec

Steps:
1. Find account by email
   - Handle gracefully if not found (don't reveal existence)
   - Always return success message (prevent email enumeration)

2. Generate reset token
   - Create VerificationToken document
   - Type: 'password_reset'
   - Token: signed JWT with accountId
   - expiresAt: 1 hour from now

3. Send reset email
   - Call EmailService.sendPasswordResetEmail()
   - Include token in reset link
   - Link format: https://app.example.com/reset-password?token=...

4. Security logging
   - Log 'password_reset_requested' event

Response format (lines 379-383):
{
  "message": "Password reset email sent",
  "expiresAt": "2025-12-04T00:30:00Z"
}

Note: Always return success, even if email doesn't exist (security best practice)

Validation:
✓ Reset token generated
✓ Reset email sent
✓ Token expires after 1 hour
✓ Non-existent emails handled gracefully
```

**3.2.3 Reset Password** (3 hours)
```
Endpoint: POST /api/v1/accounts/password/reset
Implementation reference: lines 385-402 from spec

Steps:
1. Verify reset token
   - Find VerificationToken by token
   - Check type === 'password_reset'
   - Check used === false
   - Check expiresAt > now
   - Extract accountId from token
   - Throw BadRequestException if invalid

2. Validate new password strength
   - Call PasswordService.validatePasswordStrength()

3. Update password
   - Hash new password
   - Set account.passwordHash
   - Set lastPasswordChange = now
   - Reset failedLoginAttempts = 0
   - Clear accountLockedUntil

4. Mark token as used
   - Set used = true, usedAt = now

5. Revoke all sessions
   - Force user to login with new password
   - Call SessionService.revokeAllSessions()

6. Send confirmation email
   - Call EmailService.sendPasswordChangedEmail()

7. Security logging
   - Log 'password_reset_completed' event

Response format (lines 398-402):
{
  "message": "Password reset successfully",
  "resetAt": "2025-12-03T23:35:00Z"
}

Validation:
✓ Valid token resets password
✓ Expired token throws error
✓ Used token throws error
✓ All sessions revoked
✓ Confirmation email sent
```

### 3.3 OAuth Integration
**Priority**: MEDIUM
**Estimated Time**: 12 hours
**Dependencies**: Phase 2 complete

#### Tasks

**3.3.1 Google OAuth Strategy** (3 hours)
```
Location: apps/account/src/strategies/google.strategy.ts

Dependencies:
- passport-google-oauth20 package
- @nestjs/passport integration

Configuration:
- clientID: from GOOGLE_CLIENT_ID env
- clientSecret: from GOOGLE_CLIENT_SECRET env
- callbackURL: from GOOGLE_CALLBACK_URL env
- scope: ['email', 'profile']

Strategy implementation:
1. Extend PassportStrategy(Strategy, 'google')
2. Implement validate(accessToken, refreshToken, profile, done)
   - Extract email from profile.emails[0].value
   - Extract firstName, lastName from profile.name
   - Extract oauthId from profile.id
   - Return user data

Endpoints:
- GET /api/v1/accounts/oauth/google (redirect to Google)
- GET /api/v1/accounts/oauth/google/callback (handle OAuth callback)

Callback handler steps:
1. Check if account exists with email
   - If exists, link OAuth if not already linked
   - If not exists, create new account

2. For existing account:
   - Add to linkedAccounts array: { provider: 'google', oauthId, email, linkedAt }
   - Set emailVerified = true (Google verified)
   - Do NOT set password (OAuth-only login allowed)

3. For new account:
   - Create account with:
     - email, firstName, lastName
     - emailVerified = true
     - linkedAccounts: [{ provider: 'google', ... }]
     - passwordHash = undefined (OAuth-only)
   - Send welcome email

4. Generate tokens and create session
5. Redirect to frontend with tokens in query params or cookies

Response format (lines 277-295):
{
  "account": { id, email, firstName, lastName, emailVerified, oauthProvider, oauthId },
  "tokens": { accessToken, refreshToken, expiresIn },
  "isNewAccount": false
}

Validation:
✓ Google OAuth flow completes successfully
✓ New accounts created with email verified
✓ Existing accounts linked correctly
✓ Tokens generated and session created
```

**3.3.2 Facebook OAuth Strategy** (2 hours)
```
Location: apps/account/src/strategies/facebook.strategy.ts

Dependencies:
- passport-facebook package

Configuration:
- clientID: from FACEBOOK_APP_ID env
- clientSecret: from FACEBOOK_APP_SECRET env
- callbackURL: from FACEBOOK_CALLBACK_URL env
- profileFields: ['id', 'emails', 'name']

Implementation:
Similar to Google strategy, follow same pattern:
- Extend PassportStrategy(Strategy, 'facebook')
- Implement validate() method
- Handle account creation/linking
- Generate tokens

Endpoints:
- GET /api/v1/accounts/oauth/facebook
- GET /api/v1/accounts/oauth/facebook/callback

Validation:
✓ Facebook OAuth flow works
✓ Email extraction successful
✓ Account linking functional
```

**3.3.3 Apple OAuth Strategy** (3 hours)
```
Location: apps/account/src/strategies/apple.strategy.ts

Dependencies:
- passport-apple package

Configuration (more complex than Google/Facebook):
- clientID: from APPLE_CLIENT_ID env (Service ID)
- teamID: from APPLE_TEAM_ID env
- keyID: from APPLE_KEY_ID env
- privateKeyPath: from APPLE_PRIVATE_KEY_PATH env
- callbackURL: from APPLE_CALLBACK_URL env
- scope: ['email', 'name']

Apple-specific challenges:
- Requires Apple Developer account
- Private key file (.p8) needed
- Email only provided on first authorization
- Name only provided on first authorization

Strategy implementation:
1. Load private key from file system
2. Implement validate() method
3. Handle first-time vs returning users
4. Cache email/name for returning users (Apple doesn't re-send)

Endpoints:
- GET /api/v1/accounts/oauth/apple
- POST /api/v1/accounts/oauth/apple/callback (Apple uses POST)

Validation:
✓ Apple OAuth flow completes
✓ Private key loaded correctly
✓ Email captured on first auth
✓ Account linking works
```

**3.3.4 Discord OAuth Strategy** (2 hours)
```
Location: apps/account/src/strategies/discord.strategy.ts

Dependencies:
- passport-discord package

Configuration:
- clientID: from DISCORD_CLIENT_ID env
- clientSecret: from DISCORD_CLIENT_SECRET env
- callbackURL: from DISCORD_CALLBACK_URL env
- scope: ['identify', 'email']

Implementation:
- Similar pattern to Google/Facebook
- Extract username, discriminator, avatar from profile

Endpoints:
- GET /api/v1/accounts/oauth/discord
- GET /api/v1/accounts/oauth/discord/callback

Validation:
✓ Discord OAuth works
✓ Email verified properly
✓ Username extracted
```

**3.3.5 Steam OAuth Strategy** (2 hours)
```
Location: apps/account/src/strategies/steam.strategy.ts

Dependencies:
- passport-steam package

Configuration:
- apiKey: from STEAM_API_KEY env
- returnURL: from STEAM_CALLBACK_URL env
- realm: application base URL

Steam-specific notes:
- Steam doesn't provide email (requires separate API call)
- Uses OpenID authentication
- Returns Steam ID as identifier

Strategy implementation:
1. Authenticate with OpenID
2. Extract Steam ID
3. Optional: fetch profile data via Steam Web API
4. Link account by Steam ID (no email available)

Endpoints:
- GET /api/v1/accounts/oauth/steam
- GET /api/v1/accounts/oauth/steam/callback

Validation:
✓ Steam OpenID flow works
✓ Steam ID captured
✓ Account linking functional (without email)
```

---

## Phase 4: Account Management (Week 4)

### 4.1 Profile Management
**Priority**: MEDIUM
**Estimated Time**: 8 hours
**Dependencies**: Phase 3 complete

#### Tasks

**4.1.1 Get Account Profile** (2 hours)
```
Endpoint: GET /api/v1/accounts/profile
Implementation reference: lines 516-561 from spec

Steps:
1. Extract accountId from JWT (via @CurrentAccount decorator)
2. Load account from database
3. Exclude sensitive fields (passwordHash, twoFactorSecret, backupCodes)
4. Format linkedAccounts array
5. Include security metadata (lastPasswordChange, lastLoginAt, activeSessions count)

Response format (lines 523-560):
{
  "account": {
    id, email, emailVerified, firstName, lastName, dateOfBirth,
    phoneNumber, phoneVerified, twoFactorEnabled,
    linkedAccounts: [{ provider, email, linkedAt }],
    preferences: { language, timezone, notifications },
    security: { lastPasswordChange, lastLoginAt, activeSessions },
    status, createdAt, updatedAt
  }
}

Validation:
✓ Profile data returned correctly
✓ Sensitive fields excluded
✓ Active sessions count accurate
```

**4.1.2 Update Account Profile** (3 hours)
```
Endpoint: PATCH /api/v1/accounts/profile
Implementation reference: lines 564-605 from spec

Allowed updates:
- firstName, lastName
- phoneNumber (trigger verification if changed)
- preferences: { language, timezone, notifications }

Steps:
1. Validate input DTO
   - Sanitize firstName, lastName
   - Validate phone number format
   - Validate language code (ISO 639-1)
   - Validate timezone (IANA timezone)

2. Update account
   - Merge updateDto into account object
   - Set updatedAt = now
   - Save to database

3. Send notification if significant changes
   - Email if phoneNumber changed
   - SMS if phone number changed (optional)

Response format (lines 587-604):
{
  "account": { id, firstName, lastName, phoneNumber, preferences, updatedAt }
}

Validation:
✓ Profile updated successfully
✓ Invalid data rejected
✓ Preferences saved correctly
✓ Notification sent if needed
```

**4.1.3 Update Email Address** (2 hours)
```
Endpoint: POST /api/v1/accounts/email/update
Implementation reference: lines 607-626 from spec

Steps:
1. Verify password (security confirmation)
   - Compare password with account.passwordHash
   - Throw UnauthorizedException if invalid

2. Check new email availability
   - Query accounts by newEmail
   - Throw ConflictException if exists

3. Generate verification token
   - Create VerificationToken with type: 'email_change'
   - Store newEmail in token document
   - expiresAt: 1 hour from now

4. Send verification email to NEW email
   - Call EmailService.sendEmailChangeVerificationEmail()
   - Include token in verification link

5. Set pending email status
   - Store in account.metadata.pendingEmailChange
   - Do NOT change actual email yet

6. Verification handler (separate endpoint)
   - Verify token
   - Update account.email to newEmail
   - Set emailVerified = true
   - Clear pendingEmailChange metadata

Response format (lines 620-625):
{
  "message": "Verification email sent to newemail@example.com. Please verify to complete the change.",
  "pendingEmail": "newemail@example.com",
  "expiresAt": "2025-12-04T00:55:00Z"
}

Validation:
✓ Password verified before change
✓ Duplicate email rejected
✓ Verification sent to new email
✓ Email change completes after verification
```

**4.1.4 Delete Account** (1 hour)
```
Endpoint: DELETE /api/v1/accounts/profile
Implementation reference: lines 629-650 from spec

Steps:
1. Verify password and confirmation
   - Require password verification
   - Require confirmDeletion === true

2. Schedule deletion (soft delete with grace period)
   - Set status = 'pending_deletion'
   - Set deletionScheduledAt = now
   - Calculate permanentDeletionAt = now + 30 days
   - Store deletion reason in metadata

3. Revoke all sessions
   - Force logout from all devices

4. Send confirmation email
   - Notify user of scheduled deletion
   - Include cancellation instructions

5. Background job (cron)
   - Daily check for accounts with deletionScheduledAt + 30 days < now
   - Hard delete account and all related data
   - Comply with GDPR/data retention policies

Response format (lines 643-649):
{
  "message": "Account deletion scheduled. Your account will be permanently deleted in 30 days.",
  "accountId": "acc_1234567890",
  "deletionScheduledAt": "2025-12-03T23:58:00Z",
  "permanentDeletionAt": "2026-01-02T23:58:00Z",
  "cancellationDeadline": "2026-01-02T23:58:00Z"
}

Validation:
✓ Account scheduled for deletion
✓ Sessions revoked
✓ Confirmation email sent
✓ Account can be cancelled before deadline
```

### 4.2 Subscription Management
**Priority**: MEDIUM
**Estimated Time**: 10 hours
**Dependencies**: Phase 4.1 complete

#### Tasks

**4.2.1 Subscription Service Foundation** (3 hours)
```
Location: apps/account/src/services/subscription.service.ts

Core responsibilities:
- Tier management (Free, Pro, Enterprise)
- Usage tracking (games, API requests, webhooks, players)
- Limit enforcement
- Stripe integration (payment processing)

Data structures:

Subscription tiers (lines 33-38 from spec):
{
  free: { gamesAllowed: 1, apiRequestsPerDay: 1000, webhooksAllowed: 5, activePlayersPerMonth: 1000, servicesAccess: ['leaderboard', 'achievement', 'player', 'quest'] },
  pro: { gamesAllowed: 10, apiRequestsPerDay: 100000, webhooksAllowed: 50, activePlayersPerMonth: 100000, servicesAccess: ['all'], price: 4900 },
  enterprise: { gamesAllowed: 'unlimited', apiRequestsPerDay: 'unlimited', webhooksAllowed: 'unlimited', activePlayersPerMonth: 'unlimited', servicesAccess: ['all'], price: null }
}

Methods to implement:
1. getTierLimits(tier: string): TierLimits
2. checkUsageLimit(accountId: string, resourceType: string): Promise<boolean>
3. incrementUsage(accountId: string, resourceType: string, amount: number): Promise<void>
4. resetDailyUsage(): Promise<void> (cron job)

Validation:
✓ Tier limits retrieved correctly
✓ Usage tracked accurately
✓ Limits enforced properly
```

**4.2.2 Get Subscription Details** (2 hours)
```
Endpoint: GET /api/v1/accounts/{accountId}/subscription
Implementation reference: lines 924-953 from spec

Steps:
1. Load account subscription data
2. Get tier limits from SubscriptionService
3. Get current usage from account.usage
4. Calculate usage percentages
5. Determine services access based on tier

Response format (lines 932-952):
{
  "subscription": {
    tier, status, currentPeriodStart, currentPeriodEnd,
    limits: { gamesAllowed, apiRequestsPerDay, webhooksAllowed, activePlayersPerMonth },
    usage: { gamesCreated, apiRequestsToday, webhooksCreated, activePlayers },
    servicesAccess: ['leaderboard', 'achievement', 'player', 'quest']
  }
}

Validation:
✓ Subscription data returned
✓ Limits match tier
✓ Usage accurate
```

**4.2.3 Upgrade Subscription (Stripe Integration)** (3 hours)
```
Endpoint: POST /api/v1/accounts/{accountId}/subscription/upgrade
Implementation reference: lines 955-992 from spec

Steps:
1. Validate upgrade path
   - Free → Pro, Free → Enterprise, Pro → Enterprise allowed
   - Pro → Free, Enterprise → Pro/Free = downgrade (different flow)

2. Create Stripe customer (if not exists)
   - Use Stripe SDK
   - Store stripeCustomerId in account.subscription

3. Create Stripe subscription
   - Attach payment method
   - Create subscription with price ID
   - Handle billing cycle (monthly/yearly)
   - Store stripeSubscriptionId

4. Update account subscription
   - Set tier to targetTier
   - Set status = 'active'
   - Set currentPeriodStart = now
   - Set currentPeriodEnd = now + billing cycle
   - Update limits in real-time

5. Create invoice
   - Stripe auto-generates invoice
   - Retrieve invoice details

6. Send confirmation email
   - Include invoice and new limits

Response format (lines 972-991):
{
  "subscription": { tier, status, currentPeriodStart, currentPeriodEnd, stripeSubscriptionId, limits },
  "invoice": { id, amount, currency, status },
  "message": "Subscription upgraded to Pro tier"
}

Validation:
✓ Stripe customer created
✓ Subscription created successfully
✓ Account tier updated
✓ Invoice generated
```

**4.2.4 Cancel Subscription** (2 hours)
```
Endpoint: POST /api/v1/accounts/{accountId}/subscription/cancel
Implementation reference: lines 994-1017 from spec

Steps:
1. Load Stripe subscription
   - Use stripeSubscriptionId

2. Cancel subscription
   - If cancelAtPeriodEnd === true:
     - Update Stripe subscription to cancel at period end
     - Keep tier active until currentPeriodEnd
   - If cancelAtPeriodEnd === false:
     - Cancel immediately
     - Downgrade to Free tier immediately

3. Update account
   - Set subscription.cancelAtPeriodEnd
   - Set subscription.status based on immediate/end-of-period

4. Send confirmation email

Response format (lines 1008-1016):
{
  "subscription": { tier, status, cancelAtPeriodEnd, currentPeriodEnd },
  "message": "Subscription will cancel at the end of billing period"
}

Validation:
✓ Subscription cancelled in Stripe
✓ Account tier managed correctly
✓ Confirmation email sent
```

### 4.3 Admin Tools
**Priority**: LOW
**Estimated Time**: 6 hours
**Dependencies**: Phase 4.2 complete

#### Tasks

**4.3.1 Search Accounts (Admin)** (2 hours)
```
Endpoint: GET /api/v1/admin/accounts/search
Implementation reference: lines 843-873 from spec

Authentication:
- Require admin role via @Roles('admin') decorator
- Implement Role-Based Access Control (RBAC) guard

Query parameters:
- email (partial match, case-insensitive)
- status (active, suspended, pending_deletion)
- tier (free, pro, enterprise)
- page, limit (pagination)

Steps:
1. Build MongoDB query
   - Use regex for email search: { email: /query/i }
   - Filter by status if provided
   - Filter by subscription.tier if provided

2. Execute paginated query
   - Skip: (page - 1) * limit
   - Limit: limit
   - Count total matching documents

3. Exclude sensitive fields
   - No passwordHash, twoFactorSecret, backupCodes

Response format (lines 851-872):
{
  "accounts": [{ id, email, emailVerified, firstName, lastName, status, twoFactorEnabled, createdAt, lastLoginAt }],
  "pagination": { page, limit, total, pages }
}

Validation:
✓ Admin authentication required
✓ Search filters work correctly
✓ Pagination accurate
✓ Sensitive fields excluded
```

**4.3.2 Suspend Account (Admin)** (2 hours)
```
Endpoint: POST /api/v1/admin/accounts/{accountId}/suspend
Implementation reference: lines 875-900 from spec

Steps:
1. Verify admin authentication
2. Load account by accountId
3. Update account:
   - status = 'suspended'
   - suspendedAt = now
   - suspendedUntil = now + duration
   - suspendedReason = reason from request

4. Revoke all sessions
   - Force logout from all devices

5. Send notification email
   - Inform user of suspension
   - Include reason and duration

6. Security logging
   - Log 'account_suspended' event
   - Include admin who performed action

Response format (lines 890-899):
{
  "account": { id, status, suspendedAt, suspendedUntil, reason },
  "message": "Account suspended for 7 days"
}

Validation:
✓ Account suspended successfully
✓ Sessions revoked
✓ Notification sent
✓ Admin action logged
```

**4.3.3 Unsuspend Account (Admin)** (2 hours)
```
Endpoint: POST /api/v1/admin/accounts/{accountId}/unsuspend
Implementation reference: lines 902-918 from spec

Steps:
1. Verify admin authentication
2. Load account by accountId
3. Verify account is suspended
4. Update account:
   - status = 'active'
   - suspendedUntil = undefined
   - suspendedReason = undefined

5. Send notification email
   - Inform user of unsuspension

6. Security logging
   - Log 'account_unsuspended' event

Response format (lines 909-917):
{
  "account": { id, status, unsuspendedAt },
  "message": "Account suspension lifted"
}

Validation:
✓ Account unsuspended
✓ Notification sent
✓ Security log created
```

---

## Phase 5: Production Readiness (Week 5-6)

### 5.1 Testing Strategy
**Priority**: CRITICAL
**Estimated Time**: 20 hours
**Dependencies**: Phase 4 complete

#### Test Coverage Targets
- **Unit Tests**: 85%+ coverage
- **Integration Tests**: 70%+ coverage
- **E2E Tests**: All 35 endpoints functional

#### Tasks

**5.1.1 Unit Tests - Services** (8 hours)
```
Location: apps/account/src/**/*.spec.ts

Services to test (reference: lines 1997-2106):
1. AccountService (account.service.spec.ts)
   - createAccount() - success, duplicate email
   - verifyEmail() - valid token, expired token, already verified
   - updateAccount() - valid updates, invalid data
   - scheduleAccountDeletion() - success, cancellation
   - suspendAccount() - duration, reason

2. AuthService (auth.service.spec.ts)
   - login() - valid credentials, invalid password, locked account, 2FA required
   - loginWith2FA() - valid code, invalid code, expired tempToken
   - refreshTokens() - valid token, expired token, revoked session
   - logout() - single session, all sessions

3. PasswordService (password.service.spec.ts)
   - hashPassword() - consistent hashing
   - comparePassword() - correct password, incorrect password
   - validatePasswordStrength() - valid password, weak passwords (missing uppercase, lowercase, number, special char)

4. TwoFactorService (two-factor.service.spec.ts)
   - generateSecret() - TOTP secret generation
   - verifyCode() - valid TOTP, invalid TOTP, backup code, used backup code
   - generateBackupCodes() - format, uniqueness

5. SessionService (session.service.spec.ts)
   - createSession() - device info parsing, geolocation
   - verifyRefreshToken() - valid token, expired token, revoked session
   - revokeSession() - single revocation
   - revokeAllSessions() - multiple revocations, excludeCurrent

6. OAuthService (oauth.service.spec.ts)
   - linkOAuthAccount() - new link, duplicate link
   - unlinkOAuthAccount() - successful unlink, last auth method check

7. EmailService (email.service.spec.ts)
   - sendVerificationEmail() - template rendering, SendGrid API call
   - sendPasswordResetEmail() - token inclusion
   - Use mocked SendGrid client

8. SecurityService (security.service.spec.ts)
   - logSecurityEvent() - event creation, metadata storage
   - detectSuspiciousActivity() - new location, rapid attempts

Testing tools:
- Jest (already in package.json)
- @nestjs/testing module
- Mocked dependencies (MongoDB models, external services)

Validation:
✓ All service methods tested
✓ 85%+ code coverage
✓ Edge cases covered
✓ Mocks properly configured
```

**5.1.2 Integration Tests - Database** (6 hours)
```
Location: apps/account/test/integration/

Test suites:
1. account-crud.integration.spec.ts
   - Create account → verify → update → delete flow
   - Test MongoDB indexes performance
   - Test unique constraints

2. session-management.integration.spec.ts
   - Multi-device session creation
   - Session expiry and cleanup
   - TTL index behavior

3. security-log.integration.spec.ts
   - Event logging across services
   - Log retrieval and filtering
   - TTL cleanup after 365 days

4. verification-tokens.integration.spec.ts
   - Token generation and validation
   - Token expiry and cleanup
   - Used token prevention

Setup:
- Use in-memory MongoDB (mongodb-memory-server)
- Seed test data
- Teardown after tests

Validation:
✓ Database operations work correctly
✓ Indexes perform as expected
✓ TTL cleanup functions properly
✓ Constraints enforced
```

**5.1.3 E2E Tests - API Endpoints** (6 hours)
```
Location: apps/account/test/e2e/

Test suites:
1. registration.e2e.spec.ts
   - POST /api/v1/accounts/register → 201 Created
   - POST /api/v1/accounts/verify-email → 200 OK
   - POST /api/v1/accounts/resend-verification → 200 OK

2. authentication.e2e.spec.ts
   - POST /api/v1/accounts/login → 200 OK
   - POST /api/v1/accounts/login/2fa → 200 OK
   - POST /api/v1/accounts/refresh → 200 OK
   - POST /api/v1/accounts/logout → 200 OK

3. password-management.e2e.spec.ts
   - POST /api/v1/accounts/password/change → 200 OK
   - POST /api/v1/accounts/password/reset-request → 200 OK
   - POST /api/v1/accounts/password/reset → 200 OK

4. two-factor.e2e.spec.ts
   - POST /api/v1/accounts/2fa/enable → 200 OK
   - POST /api/v1/accounts/2fa/verify → 200 OK
   - POST /api/v1/accounts/2fa/disable → 200 OK
   - POST /api/v1/accounts/2fa/backup-codes/regenerate → 200 OK

5. oauth.e2e.spec.ts (partial - requires OAuth mocks)
   - POST /api/v1/accounts/oauth/link → 200 OK
   - DELETE /api/v1/accounts/oauth/unlink/{provider} → 200 OK

6. account-management.e2e.spec.ts
   - GET /api/v1/accounts/profile → 200 OK
   - PATCH /api/v1/accounts/profile → 200 OK
   - POST /api/v1/accounts/email/update → 200 OK
   - DELETE /api/v1/accounts/profile → 200 OK

7. session-management.e2e.spec.ts
   - GET /api/v1/accounts/sessions → 200 OK
   - DELETE /api/v1/accounts/sessions/{sessionId} → 200 OK
   - DELETE /api/v1/accounts/sessions/all → 200 OK

8. security.e2e.spec.ts
   - GET /api/v1/accounts/security/log → 200 OK
   - POST /api/v1/accounts/security/report → 200 OK

9. admin.e2e.spec.ts
   - GET /api/v1/admin/accounts/search → 200 OK (with admin token)
   - POST /api/v1/admin/accounts/{accountId}/suspend → 200 OK
   - POST /api/v1/admin/accounts/{accountId}/unsuspend → 200 OK

10. subscription.e2e.spec.ts
    - GET /api/v1/accounts/{accountId}/subscription → 200 OK
    - POST /api/v1/accounts/{accountId}/subscription/upgrade → 200 OK (with Stripe mock)
    - POST /api/v1/accounts/{accountId}/subscription/cancel → 200 OK
    - GET /api/v1/accounts/{accountId}/subscription/usage → 200 OK

Setup:
- Use supertest for HTTP requests
- Start test server (NestJS TestingModule)
- Mock external services (SendGrid, Stripe, OAuth providers)
- Use test database

Validation:
✓ All 35 endpoints return expected responses
✓ Authentication guards work
✓ Rate limiting enforced
✓ Error responses correct (4xx, 5xx)
```

### 5.2 Documentation
**Priority**: HIGH
**Estimated Time**: 8 hours
**Dependencies**: Phase 5.1 complete

#### Tasks

**5.2.1 API Documentation (Swagger/OpenAPI)** (4 hours)
```
Location: apps/account/src/main.ts

Setup Swagger:
1. Install @nestjs/swagger
2. Configure SwaggerModule in main.ts
3. Add decorators to controllers and DTOs

Decorators to add:
- @ApiTags('Authentication', 'Account Management', 'Subscription', 'Admin')
- @ApiOperation({ summary: '...', description: '...' })
- @ApiResponse({ status: 200, description: '...', type: ... })
- @ApiResponse({ status: 400, description: 'Bad Request' })
- @ApiResponse({ status: 401, description: 'Unauthorized' })
- @ApiBearerAuth() for protected endpoints

Generate OpenAPI spec:
- JSON spec at /api/v1/swagger.json
- Interactive UI at /api/v1/docs

Validation:
✓ All endpoints documented
✓ Request/response schemas accurate
✓ Authentication requirements clear
✓ Example requests provided
```

**5.2.2 Developer Guide** (2 hours)
```
Location: claudedocs/guides/ACCOUNT_SERVICE_DEVELOPER_GUIDE.md

Content:
1. Overview
   - Service purpose and scope
   - Architecture diagram

2. Getting Started
   - Environment setup
   - Database initialization
   - Running locally

3. Authentication
   - JWT token format
   - Token refresh flow
   - OAuth integration

4. Core Flows
   - Registration and verification
   - Login with/without 2FA
   - Password reset
   - Session management

5. Security Best Practices
   - Password requirements
   - Rate limiting
   - Account lockout
   - 2FA implementation

6. Subscription System
   - Tier management
   - Usage tracking
   - Limit enforcement

7. Testing
   - Running unit tests
   - Running E2E tests
   - Test data setup

8. Troubleshooting
   - Common errors
   - Debugging tips

Validation:
✓ Guide covers all major features
✓ Code examples provided
✓ Setup instructions clear
```

**5.2.3 Deployment Guide** (2 hours)
```
Location: claudedocs/guides/ACCOUNT_SERVICE_DEPLOYMENT_GUIDE.md

Content:
1. Prerequisites
   - Node.js 22+
   - MongoDB 8.0+
   - Redis 7.0+

2. Environment Variables
   - All required variables listed
   - Production vs development configs

3. Database Setup
   - MongoDB replica set configuration
   - Index creation scripts
   - Migration scripts

4. Build Process
   - nx build account
   - Output artifacts

5. Deployment Strategies
   - Docker deployment (Dockerfile)
   - Kubernetes deployment (k8s manifests)
   - PM2 process management

6. Monitoring
   - Health check endpoint
   - Metrics collection
   - Log aggregation

7. Backup and Recovery
   - Database backup strategy
   - Disaster recovery procedures

Validation:
✓ Deployment steps clear
✓ Configuration examples provided
✓ Monitoring setup documented
```

### 5.3 Performance Optimization
**Priority**: MEDIUM
**Estimated Time**: 6 hours
**Dependencies**: Phase 5.1 complete

#### Tasks

**5.3.1 Database Query Optimization** (3 hours)
```
Optimizations:
1. Index analysis
   - Use MongoDB explain() to analyze query performance
   - Add missing indexes based on actual query patterns
   - Verify index usage in production queries

2. Query projection
   - Always exclude sensitive fields (passwordHash, twoFactorSecret)
   - Use .select() for partial document retrieval
   - Reduce data transfer size

3. Connection pooling
   - Configure MongoDB connection pool size
   - Optimize for concurrent requests

4. Caching strategy
   - Cache account profile data in Redis (5 min TTL)
   - Cache subscription tier limits (1 hour TTL)
   - Invalidate cache on updates

Validation:
✓ Query performance benchmarked
✓ Index usage confirmed
✓ Cache hit rate monitored
```

**5.3.2 Rate Limiting Tuning** (2 hours)
```
Optimizations:
1. Granular rate limits
   - Login: 5 per 15 minutes (IP-based)
   - Register: 3 per hour (IP-based)
   - Password reset: 5 per hour (IP + account)
   - 2FA verify: 10 per 5 minutes (account-based)

2. Redis-based rate limiting
   - Use @nestjs/throttler with Redis storage
   - Distributed rate limiting for multi-instance deployments

3. Bypass for trusted IPs (optional)
   - Whitelist internal services
   - Configure in environment

Validation:
✓ Rate limits enforced correctly
✓ Redis storage working
✓ Distributed setup tested
```

**5.3.3 Security Hardening** (1 hour)
```
Hardening checklist:
1. Helmet middleware
   - Install @nestjs/helmet
   - Configure security headers

2. CORS configuration
   - Whitelist allowed origins
   - Restrict methods and headers

3. Input validation
   - Enable global validation pipe
   - Use TypeBox schemas
   - Sanitize user inputs

4. Secrets management
   - Use environment variables (not hardcoded)
   - Consider AWS Secrets Manager or Vault
   - Rotate secrets regularly

5. Audit logging
   - Log all security events
   - Include IP, user-agent, timestamp
   - Monitor for suspicious patterns

Validation:
✓ Security headers present
✓ CORS configured
✓ Input validation working
✓ Secrets secured
```

### 5.4 Monitoring and Observability
**Priority**: MEDIUM
**Estimated Time**: 6 hours
**Dependencies**: Phase 5.3 complete

#### Tasks

**5.4.1 Application Logging** (2 hours)
```
Setup:
1. Use nestjs-pino (already in package.json)
2. Configure structured logging
3. Log levels: error, warn, info, debug

Log categories:
- Authentication events (login, logout, 2FA)
- Security events (failed attempts, lockouts)
- Subscription changes (upgrades, cancellations)
- API errors and exceptions

Log aggregation:
- Send logs to ELK stack or CloudWatch
- Set up log rotation
- Configure retention policies

Validation:
✓ Logs structured (JSON)
✓ All critical events logged
✓ Log aggregation working
```

**5.4.2 Metrics Collection** (2 hours)
```
Setup:
1. Install @nestjs/metrics or prometheus client
2. Expose /metrics endpoint

Metrics to track:
- Request rate (total, per endpoint)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Authentication success/failure rate
- Active sessions count
- Database query performance
- Cache hit/miss rate
- Subscription tier distribution

Dashboard:
- Use Grafana or Datadog
- Create alerts for anomalies

Validation:
✓ Metrics exposed correctly
✓ Dashboard visualizations created
✓ Alerts configured
```

**5.4.3 Health Checks** (2 hours)
```
Implementation:
1. Install @nestjs/terminus
2. Create health check controller

Health indicators:
- Database connectivity (MongoDB ping)
- Redis connectivity (ping)
- Memory usage (< 90% threshold)
- Disk space (> 10% free)

Endpoints:
- GET /health (basic liveness probe)
- GET /health/ready (readiness probe with dependencies)

Response format:
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "error": {},
  "details": { ... }
}

Integration:
- Kubernetes liveness and readiness probes
- Load balancer health checks

Validation:
✓ Health checks pass
✓ Probes configured
✓ Failure scenarios tested
```

---

## Dependency Graph

```
Phase 1 (Foundation)
├─ 1.1 Database Schemas
├─ 1.2 Module Structure
└─ 1.3 Core Services
   └─ GATE: Schemas compile, services instantiate

Phase 2 (Core Auth)
├─ 2.1 Authentication Service ← depends on 1.3
├─ 2.2 Session Management ← depends on 2.1
└─ 2.3 Account Registration ← depends on 2.1, 2.2
   └─ GATE: Login/logout working, sessions tracked

Phase 3 (Advanced Security)
├─ 3.1 Two-Factor Authentication ← depends on 2.1
├─ 3.2 Password Management ← depends on 2.1
└─ 3.3 OAuth Integration ← depends on 2.1, 2.2
   └─ GATE: 2FA working, password reset functional, 1+ OAuth provider

Phase 4 (Account Management)
├─ 4.1 Profile Management ← depends on 3.1, 3.2
├─ 4.2 Subscription Management ← depends on 4.1
└─ 4.3 Admin Tools ← depends on 4.2
   └─ GATE: All 35 endpoints functional

Phase 5 (Production Readiness)
├─ 5.1 Testing ← depends on all Phase 4
├─ 5.2 Documentation ← depends on 5.1
├─ 5.3 Performance ← depends on 5.1
└─ 5.4 Monitoring ← depends on 5.3
   └─ GATE: 90%+ test coverage, deployment successful
```

---

## Critical Path

**Week 1**: Foundation (parallel: schemas + module setup + core services)
**Week 2**: Core Auth (sequential: login → sessions → registration)
**Week 3**: Advanced Security (parallel: 2FA + passwords + OAuth)
**Week 4**: Account Management (sequential: profiles → subscriptions → admin)
**Week 5-6**: Production (parallel: testing + docs + monitoring)

**Minimum Viable Product (MVP)**: Phase 1 + Phase 2 (email/password auth, sessions)
**Production-Ready**: All 5 phases complete

---

## Risk Mitigation

### High-Risk Areas

**OAuth Integration** (Phase 3.3)
- Risk: Provider-specific quirks, credential management
- Mitigation:
  - Start with Google (simplest)
  - Mock OAuth responses for testing
  - Secure credential storage
  - Fallback to email/password if OAuth fails

**Stripe Integration** (Phase 4.2)
- Risk: Payment processing errors, webhook handling
- Mitigation:
  - Use Stripe test mode extensively
  - Implement idempotency keys
  - Handle webhook retries
  - Monitor webhook logs

**Performance at Scale** (Phase 5.3)
- Risk: Slow queries, memory leaks, session bloat
- Mitigation:
  - Load testing with k6 or Artillery
  - Index optimization early
  - Implement caching strategy
  - Monitor resource usage

**Security Vulnerabilities** (All Phases)
- Risk: Auth bypass, token leakage, injection attacks
- Mitigation:
  - Security code review
  - Penetration testing
  - OWASP compliance
  - Regular dependency updates

---

## Testing Checkpoints

### Phase 1 Validation
- [ ] MongoDB schemas compile without errors
- [ ] All indexes created successfully
- [ ] TTL indexes configured (sessions: 0s, logs: 365 days, tokens: 0s)
- [ ] Account module instantiates all providers
- [ ] Environment variables load correctly

### Phase 2 Validation
- [ ] Login with valid credentials returns JWT tokens
- [ ] Login with invalid credentials throws UnauthorizedException
- [ ] Account locks after 5 failed login attempts
- [ ] Refresh token flow works correctly
- [ ] Logout revokes sessions (single and all devices)
- [ ] Email verification completes successfully
- [ ] Security logs created for all auth events

### Phase 3 Validation
- [ ] 2FA enable generates QR code and backup codes
- [ ] TOTP codes verify correctly (6-digit codes)
- [ ] Backup codes work and are removed after use
- [ ] 2FA disable requires password + current code
- [ ] Password change validates strength and updates hash
- [ ] Password reset flow completes (request → email → reset)
- [ ] At least 1 OAuth provider (Google) works end-to-end
- [ ] OAuth account linking works without duplicates

### Phase 4 Validation
- [ ] Profile retrieval excludes sensitive fields
- [ ] Profile updates save correctly
- [ ] Email change requires verification
- [ ] Account deletion schedules 30-day grace period
- [ ] Subscription tier limits enforced
- [ ] Usage tracking increments correctly
- [ ] Stripe integration creates subscriptions
- [ ] Admin endpoints require admin role

### Phase 5 Validation
- [ ] Unit test coverage ≥ 85%
- [ ] All E2E tests pass for 35 endpoints
- [ ] Load testing shows acceptable performance (< 200ms p95)
- [ ] Security headers present (Helmet)
- [ ] Rate limiting enforced correctly
- [ ] Health checks pass
- [ ] Monitoring dashboard functional
- [ ] Deployment successful in test environment

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (unit, integration, E2E)
- [ ] Environment variables configured for production
- [ ] Database indexes created
- [ ] Secrets secured (JWT secret, OAuth credentials, Stripe keys)
- [ ] Email service configured (SendGrid API key)
- [ ] Redis instance configured
- [ ] MongoDB replica set configured

### Deployment
- [ ] Build production artifacts: `nx build account --prod`
- [ ] Run database migrations (if any)
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify health checks passing
- [ ] Monitor error rates for 1 hour

### Post-Deployment
- [ ] Verify critical flows (login, registration, 2FA)
- [ ] Check monitoring dashboards
- [ ] Verify email delivery
- [ ] Test OAuth providers
- [ ] Review security logs for anomalies
- [ ] Document any deployment issues

---

## Timeline Summary

### Single Developer (Full-Time)
- **Week 1**: Phase 1 (Foundation) - 25 hours
- **Week 2**: Phase 2 (Core Auth) - 30 hours
- **Week 3**: Phase 3 (Advanced Security) - 35 hours
- **Week 4**: Phase 4 (Account Management) - 30 hours
- **Week 5-6**: Phase 5 (Production Readiness) - 30 hours

**Total**: 150 hours (~4-6 weeks at 30-40 hours/week)

### Two Developers (Parallel Work)
- **Week 1**: Phase 1 (Developer A: schemas, Developer B: services)
- **Week 2**: Phase 2 + 3.1 (Developer A: auth, Developer B: 2FA)
- **Week 3**: Phase 3.2 + 3.3 (Developer A: passwords, Developer B: OAuth)
- **Week 4**: Phase 4.1 + 4.2 (Developer A: profiles, Developer B: subscriptions)
- **Week 5**: Phase 5 (both: testing, docs, deployment)

**Total**: 2-3 weeks with parallel workstreams

---

## Success Criteria

### Functional Requirements
✓ All 35 API endpoints functional
✓ Email/password authentication working
✓ OAuth integration with at least Google and Facebook
✓ 2FA (TOTP) working with QR codes and backup codes
✓ Session management across multiple devices
✓ Subscription management with Stripe integration
✓ Admin tools for account management

### Non-Functional Requirements
✓ 90%+ test coverage (unit + integration)
✓ All E2E tests passing
✓ API response time < 200ms (p95)
✓ Zero critical security vulnerabilities
✓ Rate limiting enforced on all sensitive endpoints
✓ Monitoring and alerting configured
✓ Documentation complete (API docs, developer guide, deployment guide)

### Production Readiness
✓ Deployed to staging and production environments
✓ Health checks passing
✓ Error rates < 0.1%
✓ No memory leaks or resource exhaustion
✓ Secrets secured and rotated
✓ Backup and recovery procedures tested

---

## Next Steps After Completion

### Integration with Other Services
- **Player Service**: Use Account Service for authentication validation
- **Leaderboard Service**: Fetch account details for player display names
- **Gateway**: Route authentication requests to Account Service
- **Notification Service**: Subscribe to account events (registration, password reset)

### Future Enhancements
- **Phone verification**: SMS-based 2FA as alternative to TOTP
- **Passwordless authentication**: Magic links, WebAuthn
- **Social login expansion**: Twitter, GitHub, LinkedIn
- **Account recovery**: Security questions, trusted contacts
- **Advanced fraud detection**: Device fingerprinting, behavioral analysis
- **Audit trail**: Detailed activity logs for compliance (GDPR, HIPAA)

---

**End of Implementation Workflow**

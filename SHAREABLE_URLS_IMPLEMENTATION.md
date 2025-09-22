# Shareable URLs Implementation

This document describes the implementation of the shareable URLs feature for the show-tracker application.

## Overview

The shareable URLs feature allows users to share individual show pages via unique URLs that can be accessed by anyone with the link, while maintaining community privacy controls.

## Files Added/Modified

### Database Migration
- `database-shareable-urls-migration.sql` - Database migration to add URL fields to shows table

### Server Actions
- `lib/shareable-urls.ts` - Server actions for URL generation and resolution

### API Routes
- `app/api/shows/[id]/share/route.ts` - Generate shareable URL for a show
- `app/api/shows/public/[publicId]/route.ts` - Resolve show by public ID
- `app/api/communities/[communitySlug]/shows/[publicId]/route.ts` - Resolve community show by public ID

### UI Components
- `components/ShowDetail.tsx` - Individual show detail page component
- `components/ShowCard.tsx` - Updated with share functionality

### Routes
- `app/c/[communitySlug]/e/[publicId]/page.tsx` - Community-specific show detail page
- `app/share/[publicId]/page.tsx` - Legacy redirect route for shows without community context

### Types
- `lib/types.ts` - Updated with shareable URL types

### Configuration
- `env.example` - Added shareable URL feature flags
- `app/api/health/route.ts` - Added shareable URL feature status

### Testing
- `scripts/test-shareable-urls.ts` - Test script for shareable URLs functionality

## Setup Instructions

### 1. Database Migration

Run the database migration to add the required columns:

```bash
psql -f database-shareable-urls-migration.sql
```

This will:
- Add URL-related columns to the shows table
- Generate public IDs for all existing shows
- Create helper functions for URL management
- Update RLS policies for URL access

### 2. Environment Configuration

Add the following environment variables to your `.env.local` file:

```env
# Shareable URLs feature flags
ENABLE_SHAREABLE_URLS=false
ENABLE_NATIVE_SHARING=false
REQUIRE_COMMUNITY_MEMBERSHIP=true
PUBLIC_SHARE_ENABLED=false
SHARE_URL_EXPIRATION_DAYS=0
```

### 3. Feature Flags

- `ENABLE_SHAREABLE_URLS` - Master switch for the feature
- `ENABLE_NATIVE_SHARING` - Enable native sharing API on mobile devices
- `REQUIRE_COMMUNITY_MEMBERSHIP` - Require community membership to access shared URLs
- `PUBLIC_SHARE_ENABLED` - Allow public access to shared URLs (future enhancement)
- `SHARE_URL_EXPIRATION_DAYS` - URL expiration in days (0 = never expire)

### 4. Testing

Run the test script to verify the implementation:

```bash
npx tsx scripts/test-shareable-urls.ts
```

## URL Structure

### Community-Specific URLs
```
https://app.domain.com/c/{communitySlug}/e/{publicId}
Example: https://showtracker.app/c/edm-adoption-clinic/e/abc123xy
```

### Legacy URLs (for shows without community context)
```
https://app.domain.com/share/{publicId}
Example: https://showtracker.app/share/abc123xy
```

## Features

### URL Generation
- Automatic generation of 8-character alphanumeric public IDs
- URL-friendly slugs generated from show titles
- Community-aware URL construction

### Sharing Options
- Native sharing API on mobile devices
- Copy to clipboard fallback
- Share button on show cards and detail pages

### Access Control
- Community membership required for accessing shared URLs
- RLS policies enforce access controls
- Non-members see appropriate access denied messages

### Analytics
- Share count tracking
- Last shared timestamp
- Health endpoint includes shareable URL statistics

## Security Considerations

- Public IDs are cryptographically random (not sequential)
- Community membership still required for access
- No sensitive information exposed in URLs
- Share tracking respects user privacy settings

## Browser Support

- Native sharing API: Modern mobile browsers
- Clipboard API: Modern browsers
- Fallback: Manual copy/paste instructions

## Future Enhancements

- Social media preview cards
- QR code generation
- Bulk sharing of multiple shows
- Anonymous commenting or interaction
- Public show discovery without community membership

## Troubleshooting

### Common Issues

1. **Migration fails**: Ensure you have the required permissions and the shows table exists
2. **URLs not generating**: Check that `ENABLE_SHAREABLE_URLS=true` in environment
3. **Access denied**: Verify community membership and RLS policies
4. **Native sharing not working**: Check browser support and `ENABLE_NATIVE_SHARING` flag

### Debug Steps

1. Check health endpoint: `/api/health`
2. Verify database migration completed successfully
3. Test URL generation with the test script
4. Check browser console for client-side errors
5. Verify environment variables are set correctly

## Performance Considerations

- Public IDs are indexed for fast lookups
- Share tracking updates are asynchronous
- URL resolution is cached for 10 minutes
- Community membership validation is cached for 5 minutes

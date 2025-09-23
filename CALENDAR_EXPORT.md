# Calendar Export Feature

This document describes the calendar export functionality that allows users to export show information to their calendar applications.

## Overview

The calendar export feature enables users to:
- Export shows to Google Calendar via quick-add links
- Download ICS files for manual calendar import
- Support timezone handling for accurate calendar entries
- Provide mobile and desktop optimized export experiences

## Features

### Google Calendar Integration
- Generates Google Calendar quick-add URLs
- Opens in new tab/window with user consent
- Includes all show details (title, venue, time, description, links)

### ICS File Download
- Generates standards-compliant ICS calendar files
- Supports import into Apple Calendar, Outlook, Thunderbird, and other calendar apps
- Includes proper timezone conversion and event formatting

### Timezone Handling
- Converts stored UTC times to Boston local time
- Maintains accurate time representation across calendar applications
- Handles daylight saving time transitions correctly

## Implementation

### Server Actions
- `generateGoogleCalendarUrlAction()` - Creates Google Calendar URLs
- `generateICSFileAction()` - Generates ICS file content
- `getCalendarEventDataAction()` - Retrieves formatted event data
- `validateCalendarDataAction()` - Validates show data for export

### API Endpoints
- `POST /api/calendar/google` - Generate Google Calendar URL
- `POST /api/calendar/ics` - Download ICS file
- `POST /api/calendar/event` - Get event data

### UI Components
- `CalendarExportButton` - Dropdown with export options
- Integrated into `ShowCard` component
- Mobile and desktop optimized

## Configuration

### Environment Variables
```env
# Calendar export feature flags
ENABLE_CALENDAR_EXPORT=false
ENABLE_GOOGLE_CALENDAR_LINKS=true
ENABLE_ICS_DOWNLOAD=true

# Calendar configuration
DEFAULT_TIMEZONE=America/New_York
CALENDAR_REMINDER_MINUTES=60
ICS_CACHE_TTL_SECONDS=300
```

### Feature Flags
- `ENABLE_CALENDAR_EXPORT` - Master switch for calendar export
- `ENABLE_GOOGLE_CALENDAR_LINKS` - Enable Google Calendar integration
- `ENABLE_ICS_DOWNLOAD` - Enable ICS file downloads

## Usage

### For Users
1. Navigate to any show in the application
2. Click the "Calendar" button
3. Choose between:
   - **Google Calendar** - Opens Google Calendar with pre-filled event details
   - **Download ICS** - Downloads a calendar file for import

### For Developers
```typescript
import { generateGoogleCalendarUrl, generateICSContent } from '@/lib/calendar'

// Generate Google Calendar URL
const calendarUrl = generateGoogleCalendarUrl(show, shareableUrl)

// Generate ICS content
const icsContent = generateICSContent(show, shareableUrl)
```

## Testing

Run the test script to verify functionality:
```bash
node scripts/test-calendar-export.js
```

## Calendar Application Compatibility

| Application | ICS Import | Google Link | Notes |
|-------------|------------|-------------|-------|
| Google Calendar | ✅ | ✅ | Primary integration target |
| Apple Calendar | ✅ | ❌ | ICS import only |
| Outlook | ✅ | ❌ | ICS with limitations on URL field |
| Thunderbird | ✅ | ❌ | Full ICS support |

## Security Considerations

- Calendar exports contain only show information user already has access to
- No additional sensitive information exposed in calendar format
- Google Calendar URLs are temporary and do not store user data
- ICS files generated server-side to prevent tampering
- Export operations do not require additional permissions

## Performance

- Google Calendar URLs generated fresh each time (no caching)
- ICS files cached for 5 minutes to handle repeated downloads
- Calendar event data cached for 2 minutes
- Export operations typically complete within 1-2 seconds

## Troubleshooting

### Common Issues
1. **"Calendar export is not enabled"** - Check `ENABLE_CALENDAR_EXPORT` environment variable
2. **"Show time information incomplete"** - Ensure show has valid `date_time` field
3. **"Failed to generate calendar URL"** - Check timezone configuration and show data validity
4. **ICS file won't import** - Verify ICS content is properly formatted and not corrupted

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed error messages.

## Future Enhancements

- Bulk calendar export for multiple shows
- Calendar app-specific integrations beyond Google
- Automatic calendar updates when show details change
- Calendar synchronization and two-way integration
- Custom reminder settings per show

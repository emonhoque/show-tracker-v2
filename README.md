# EDM Adoption Clinic Show Tracker

A modern, password-protected Progressive Web App (PWA) for groups to track shows and manage RSVPs. Built with Next.js and Supabase, featuring offline capabilities and native app-like experience.

## Features

- 🔐 **Password-protected access** - Simple shared password with show/hide toggle
- 📅 **Show management** - Add, edit, and delete shows with intuitive time picker
- ✅ **Smart RSVP system** - Going/Maybe/Not Going for upcoming, Went/Maybe/Not Going for past shows
- 📱 **Progressive Web App** - Installable on mobile and desktop devices
- 🔄 **Pull-to-refresh** - Native-like refresh gesture (PWA only)
- ⬆️ **Scroll-to-top** - Quick navigation button (PWA only)
- 🕐 **Smart time picker** - Starts at 3 PM, cycles to 2 PM (realistic show times)
- 📊 **Intelligent sorting** - Next show first (upcoming), newest first (past)
- 💀 **Skeleton loading** - Smooth loading states while data fetches
- 🌐 **Offline detection** - Graceful handling when connection is lost
- ⚡ **Optimized performance** - No duplicate API calls, efficient data management
- 🎨 **Modern UI** - Clean, responsive design with smooth animations

## Quick Start

### Prerequisites
- Node.js 18+
- A Supabase account

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd show-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   - Create a new project in Supabase
   - Go to SQL Editor and run the contents of `database-schema.sql`

4. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Public environment variables (available to client)
   NEXT_PUBLIC_APP_PASSWORD="your-chosen-password"
   
   # Server-only environment variables
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Timezone configuration
   TZ=America/New_York
   ```

5. **Run the application**
   ```bash
   npm run dev
   ```

6. **Visit** [http://localhost:3000](http://localhost:3000)

## Usage

### Web App
1. Enter the shared password and your name
2. Add shows with the "Add" button
3. RSVP to upcoming shows
4. Past shows are automatically moved to the Past tab

### PWA Installation
- **Mobile**: Tap "Add to Home Screen" in your browser menu
- **Desktop**: Look for the install button in your browser's address bar
- **Features**: Once installed, enjoy pull-to-refresh and scroll-to-top functionality

### Time Picker
- Shows start at 3:00 PM and cycle through to 2:00 PM the next day
- Covers realistic show times from afternoon to late night
- No more scrolling through 3 AM times for evening shows!

## Testing

```bash
npm test
```

## Deployment

The easiest way to deploy is using [Vercel](https://vercel.com/new):

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel's dashboard
4. Deploy!

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **PWA**: Service Worker, Web App Manifest
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## PWA Features

This app is a fully functional Progressive Web App with:

- **Installable**: Can be installed on mobile and desktop devices
- **Offline capable**: Works without internet connection (with graceful degradation)
- **Native-like experience**: Pull-to-refresh, scroll-to-top, app-like navigation
- **No stale data**: Always fetches fresh show/RSVP data when online
- **Cross-platform**: Works on iOS, Android, Windows, macOS, Linux

## Performance Optimizations

- **Efficient data fetching**: RSVPs fetched once per show, not on every tab switch
- **Skeleton loading**: Smooth loading states prevent layout shifts
- **Smart caching**: Static assets cached, API data always fresh
- **Optimized re-renders**: Minimal unnecessary component updates

## License

MIT License - feel free to use this project for your own group!

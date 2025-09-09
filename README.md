# Group Show Tracker

A simple, password-protected web app for groups to track shows and manage RSVPs. Built with Next.js and Supabase.

## Features

- 🔐 **Password-protected access** - Simple shared password for group members
- 📅 **Show management** - Add, edit, and delete shows
- ✅ **RSVP system** - Going, Maybe, Not Going options
- 📱 **Mobile-first design** - Works great on all devices
- 🕐 **Timezone handling** - Boston timezone support
- 📊 **Past/Upcoming tabs** - Automatic show categorization

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

1. Enter the shared password and your name
2. Add shows with the "Add" button
3. RSVP to upcoming shows
4. Past shows are automatically moved to the Past tab

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
- **Deployment**: Vercel (recommended)

## License

MIT License - feel free to use this project for your own group!

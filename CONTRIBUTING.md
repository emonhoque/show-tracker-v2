# Contributing to Show Tracker

Thank you for your interest in contributing to Show Tracker! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- A Supabase account (for database setup)
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/emonhoque/show-tracker.git
   cd show-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   - Create a new project in Supabase
   - Run the contents of `database-complete-setup.sql` in the SQL Editor
   - This sets up all necessary tables, indexes, and RLS policies

4. **Configure environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_APP_PASSWORD="dev-password"
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   TZ=America/New_York
   BLOB_READ_WRITE_TOKEN=blob
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Visit** [http://localhost:3000](http://localhost:3000)

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code formatting (Prettier is configured)
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep components focused and single-purpose

### Component Structure

- Place reusable UI components in `components/ui/`
- Place feature-specific components in `components/`
- Use proper TypeScript interfaces for props
- Follow the existing naming conventions

### Database Changes

- All database changes should be added to `database-complete-setup.sql`
- Test changes thoroughly before submitting
- Consider backward compatibility
- Update indexes if adding new query patterns

### API Routes

- Place API routes in `app/api/`
- Use proper HTTP status codes
- Include error handling and validation
- Add appropriate caching headers
- Follow RESTful conventions

## Pull Request Process

### Before Submitting

1. **Test your changes thoroughly**
   - Test on both mobile and desktop
   - Test offline functionality
   - Test with different data scenarios
   - Verify no console errors

2. **Update documentation**
   - Update README.md if adding new features
   - Add JSDoc comments for new functions
   - Update any relevant configuration files

3. **Check code quality**
   ```bash
   npm run lint
   npm run build
   ```

### Pull Request Guidelines

1. **Use descriptive titles and descriptions**
   - Clearly explain what the PR does
   - Reference any related issues
   - Include screenshots for UI changes

2. **Keep PRs focused**
   - One feature or bug fix per PR
   - Keep changes as small as possible
   - Avoid mixing unrelated changes

3. **Follow the PR template**
   - Use the provided PR template
   - Check all relevant boxes
   - Provide clear testing instructions

## Types of Contributions

### Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/device information
- Screenshots if applicable

### Feature Requests

For new features, please:
- Describe the feature clearly
- Explain the use case
- Consider the impact on existing functionality
- Provide mockups or examples if possible

### Code Contributions

We welcome contributions for:
- Bug fixes
- New features
- Performance improvements
- Documentation updates
- Test coverage improvements

## Testing

### Manual Testing

Before submitting a PR, please test:
- [ ] All existing functionality still works
- [ ] New features work as expected
- [ ] Mobile responsiveness
- [ ] Offline functionality
- [ ] Theme switching (light/dark)
- [ ] PWA installation and usage

### Automated Testing

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Build the project
npm run build
```

## Performance Considerations

- Keep bundle size minimal
- Use efficient database queries
- Implement proper caching strategies
- Consider mobile performance
- Optimize images and assets

## Security

- Never commit sensitive data (API keys, passwords)
- Validate all user inputs
- Use proper sanitization
- Follow security best practices
- Test for XSS vulnerabilities

## Database Guidelines

### Schema Changes

- Always test schema changes in development
- Consider migration strategies for existing data
- Update RLS policies when adding new tables/columns
- Add appropriate indexes for new query patterns

### Query Optimization

- Use EXPLAIN ANALYZE to check query performance
- Avoid N+1 query problems
- Use proper joins instead of multiple queries
- Consider caching strategies

## Release Process

1. All changes go through pull request review
2. Maintainer reviews and approves
3. Changes are merged to main branch
4. Automatic deployment to production (if configured)

## Getting Help

- Check existing issues and discussions
- Create a new issue for questions
- Join our community discussions
- Review the codebase and documentation

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the golden rule

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Show Tracker! 🎵

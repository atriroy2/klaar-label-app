# Contributing to SaaS Boilerplate

Thank you for your interest in contributing! This is a starter boilerplate, so contributions that improve the foundation are welcome.

## How to Contribute

### Reporting Issues

If you find a bug or have a suggestion:

1. Check if the issue already exists
2. Create a new issue with:
   - Clear description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Environment details (Node version, OS, etc.)

### Suggesting Features

Feature suggestions are welcome! Please:

1. Check existing issues first
2. Create an issue describing:
   - The feature
   - Use case
   - Potential implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## Development Guidelines

### Code Style

- Follow existing code patterns
- Use TypeScript for type safety
- Follow Next.js best practices
- Use meaningful variable and function names

### Testing

- Test all user flows
- Verify authentication works
- Check multi-tenant isolation
- Test role-based access control

### Documentation

- Update README if adding features
- Add comments for complex logic
- Update setup guides if process changes

## Project Structure

When adding features:

- **API Routes**: Add to `app/api/`
- **Pages**: Add to `app/` directory
- **Components**: Add to `components/`
- **Utilities**: Add to `lib/`
- **Database Changes**: Update `prisma/schema.prisma` and create migration

## Questions?

Open an issue with the `question` label for help or clarification.

---

Thank you for contributing! 🎉

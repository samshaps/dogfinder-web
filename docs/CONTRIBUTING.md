# Contributing to DogYenta

Thank you for your interest in contributing to DogYenta! This guide will help you get started with contributing to our AI-powered dog adoption platform.

## 🤝 How to Contribute

### Types of Contributions
- **Bug Reports**: Report issues you encounter
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit bug fixes or new features
- **Documentation**: Improve or add documentation
- **Testing**: Help improve test coverage

## 🚀 Getting Started

### 1. Fork and Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/dogfinder-web.git
cd dogfinder-web

# Add upstream remote
git remote add upstream https://github.com/samshaps/dogfinder-web.git
```

### 2. Set Up Development Environment
Follow the [Development Setup Guide](DEVELOPMENT_SETUP.md) to get your local environment running.

### 3. Create a Branch
```bash
# Create a new branch for your contribution
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

## 📝 Code Standards

### TypeScript
- Use strict type checking
- Define interfaces for all data structures
- Use proper type annotations
- Avoid `any` type when possible
- Use meaningful variable and function names

### React
- Use functional components with hooks
- Implement proper error boundaries
- Use proper key props for lists
- Follow React best practices
- Use TypeScript for all components

### Styling
- Use Tailwind CSS classes
- Follow mobile-first approach
- Use consistent spacing and colors
- Implement responsive design
- Follow accessibility guidelines

### API Design
- Use RESTful principles
- Implement proper error handling
- Use consistent response formats
- Add proper validation
- Include comprehensive documentation

## 🧪 Testing

### Writing Tests
- Write tests for new features
- Update tests when fixing bugs
- Aim for high test coverage
- Use descriptive test names
- Test both success and error cases

### Test Structure
```typescript
describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern=email-alerts

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## 📋 Pull Request Process

### Before Submitting
- [ ] Code follows project standards
- [ ] Tests pass locally
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Proper error handling

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process
1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: Team members review your code
3. **Feedback**: Address any feedback or requested changes
4. **Approval**: Once approved, your PR will be merged

## 🐛 Bug Reports

### Before Reporting
- Check if the issue already exists
- Try to reproduce the issue
- Check the latest version
- Gather relevant information

### Bug Report Template
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]

## Additional Context
Any other relevant information
```

## 💡 Feature Requests

### Before Requesting
- Check if the feature already exists
- Consider if it fits the project's goals
- Think about implementation complexity
- Consider user impact

### Feature Request Template
```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How would you like this to work?

## Alternatives Considered
What other solutions did you consider?

## Additional Context
Any other relevant information
```

## 🏗️ Development Guidelines

### Git Workflow
```bash
# Keep your fork updated
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature
```

### Commit Messages
Use conventional commit format:
```
type(scope): description

feat: add email alerts functionality
fix: resolve authentication issue
docs: update API documentation
test: add unit tests for email service
refactor: improve error handling
```

### Code Organization
- Keep components small and focused
- Use proper folder structure
- Group related functionality
- Use meaningful file names
- Add proper imports/exports

## 🔍 Code Review Guidelines

### As a Reviewer
- Be constructive and helpful
- Focus on code quality and standards
- Ask questions if something is unclear
- Suggest improvements
- Approve when ready

### As a Contributor
- Respond to feedback promptly
- Ask questions if feedback is unclear
- Make requested changes
- Test changes thoroughly
- Update documentation if needed

## 📚 Documentation

### Code Documentation
- Add JSDoc comments for functions
- Document complex logic
- Include usage examples
- Update README when needed

### API Documentation
- Document all API endpoints
- Include request/response examples
- Document error codes
- Keep documentation up to date

## 🚫 What Not to Contribute

### Security Issues
- Don't submit security vulnerabilities publicly
- Use private channels for security issues
- Follow responsible disclosure

### Inappropriate Content
- No offensive or inappropriate content
- No spam or promotional content
- No copyrighted material

## 🎯 Areas for Contribution

### High Priority
- Bug fixes
- Performance improvements
- Accessibility improvements
- Test coverage improvements
- Documentation updates

### Medium Priority
- New features
- UI/UX improvements
- API enhancements
- Developer experience improvements

### Low Priority
- Code refactoring
- Style improvements
- Minor optimizations

## 🏆 Recognition

### Contributors
- All contributors are recognized in the project
- Significant contributions get special recognition
- Contributors are listed in the README

### Types of Recognition
- **Bug Fixes**: Quick and effective bug fixes
- **Features**: New functionality that adds value
- **Documentation**: Improvements to project docs
- **Testing**: Help with test coverage and quality
- **Community**: Helping other contributors

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and discussions
- **Email**: support@dogyenta.com for private matters

### Response Times
- **Bug Reports**: Within 48 hours
- **Feature Requests**: Within 1 week
- **Pull Requests**: Within 3-5 business days
- **General Questions**: Within 1-2 days

## 📄 License

By contributing to DogYenta, you agree that your contributions will be licensed under the same MIT License that covers the project.

## 🙏 Thank You

Thank you for contributing to DogYenta! Your contributions help make dog adoption easier and more accessible for everyone.

---

**Happy contributing! 🐕✨**

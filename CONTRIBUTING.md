# Contributing to GraphQL-ly

Thanks for your interest in contributing! Here's how to get started.

## Reporting Bugs

1. Check [existing issues](https://github.com/kripikroli/graphql-ly/issues) to avoid duplicates
2. Open a new issue with:
   - A clear title
   - Steps to reproduce
   - The `.graphql` file content that triggers the bug
   - Expected vs actual behavior
   - VS Code version and OS

## Suggesting Features

Open an issue with the `enhancement` label. Describe:
- What problem it solves
- A GraphQL schema example showing the use case
- How it should behave

## Development Setup

```bash
git clone https://github.com/kripikroli/graphql-ly.git
cd graphql-ly
npm install
npm run build
npm test
```

Press **F5** in VS Code to launch the Extension Development Host for manual testing.

## Making Changes

1. **Fork** the repo and clone your fork
2. Create a branch: `git checkout -b my-feature`
3. Make your changes in `src/`
4. Add or update tests in `src/__tests__/`
5. Run `npm test` — all 54+ tests must pass
6. Run `npm run build` — must compile without errors
7. Test manually with F5 using the `samples/` folders
8. Commit with a clear message: `git commit -m "Add detection for X"`
9. Push and open a Pull Request

## Project Structure

```
src/
├── extension.ts          # VS Code entry point, diagnostics wiring
├── validator.ts          # Single-file validation (parse + schema)
├── workspace-validator.ts # Multi-file workspace validation
└── appsync-directives.ts # AWS AppSync directive declarations
```

## Guidelines

- Keep changes focused — one feature or fix per PR
- Add tests for new validation rules
- Add a sample `.graphql` file in `samples/` for new detectable issues
- Don't break existing tests
- Follow the existing code style

## Testing

```bash
npm test          # Run all tests
npx jest --watch  # Watch mode during development
```

## Questions?

Open an issue — happy to help.

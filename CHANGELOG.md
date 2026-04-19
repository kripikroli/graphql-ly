# Changelog

All notable changes to the **GraphQL-ly** extension will be documented in this file.

## [1.1.0] - 2026-04-19

### Added

- AWS AppSync built-in scalar type support — `AWSDate`, `AWSTime`, `AWSDateTime`, `AWSTimestamp`, `AWSEmail`, `AWSJSON`, `AWSPhone`, `AWSURL`, `AWSIPAddress` no longer trigger false "Unknown type" errors
- 12 new unit tests for scalar type validation

## [1.0.0] - 2026-04-18

### Added

- GraphQL syntax validation (parse errors with line/column positions)
- Schema-level validation:
  - Undefined type detection (fields, arguments, union members)
  - Duplicate type name detection
  - Duplicate field detection
  - Interface compliance checking (missing required fields)
  - Undefined interface detection
  - Unknown directive detection
  - Directive misuse detection (wrong location, missing arguments)
- AWS AppSync directive support — `@aws_api_key`, `@aws_iam`, `@aws_oidc`, `@aws_lambda`, `@aws_auth`, `@aws_cognito_user_pools`, `@aws_subscribe`
- Inline error messages (red italic text next to the problem line)
- File-level error indicators (red filenames in explorer and tabs)
- Background validation (diagnostics persist when switching tabs)
- Configurable validation mode: `single` (per-file) or `multi` (workspace-wide cross-file validation)
- Support for `.graphql` and `.gql` file extensions

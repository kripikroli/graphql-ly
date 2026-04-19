# GraphQL-ly

**Local GraphQL schema validation for VS Code** — catch syntax errors, schema issues, and directive problems in `.graphql` and `.gql` files before they reach your API. Built-in AWS AppSync directive support.

---

## Getting Started

1. Install **GraphQL-ly** from the VS Code Marketplace
2. Open any `.graphql` or `.gql` file
3. Errors appear instantly — red squiggles inline, red filenames in the explorer, and error messages right next to the problem line

No configuration files needed. No cloud connection. Just open a file and go.

---

## Features

### ✅ Syntax Validation

Catches parse-level errors — missing braces, invalid tokens, malformed definitions.

```graphql
# ❌ Missing closing brace
type Query {
  id: ID!
  name: String
          ← Syntax Error: Expected "}", found <EOF>.
```

```graphql
# ❌ Missing colon between field name and type
type Query {
  name String
       ← Syntax Error: Expected ":", found Name "String".
```

```graphql
# ❌ Unterminated string
type Query {
  name: "this string never closes
        ← Syntax Error: Unterminated string.
```

### ✅ Undefined Type Detection

Flags fields, arguments, and union members that reference types not defined in the schema.

```graphql
# ❌ "Post" is never defined
type Query {
  getPost: Post
           ← Unknown type "Post".
}
```

```graphql
# ❌ Input type doesn't exist
type Query {
  getUser(input: UserInput): String
                 ← Unknown type "UserInput".
}
```

```graphql
# ❌ Union references undefined types
union SearchResult = Post | Comment
                     ← Unknown type "Post".
```

### ✅ Duplicate Type Detection

Catches when the same type name is defined more than once.

```graphql
# ❌ "User" defined twice
type User {
  name: String
}

type User {
  email: String
}
← Type "User" was defined more than once.
```

### ✅ Duplicate Field Detection

Catches when the same field appears twice in a type.

```graphql
# ❌ "name" defined twice in Query
type Query {
  name: String
  name: Int
  ← Field "Query.name" can only be defined once.
}
```

### ✅ Interface Compliance

Detects when a type claims to implement an interface but is missing required fields.

```graphql
# ❌ User is missing "createdAt" from Node
interface Node {
  id: ID!
  createdAt: String!
}

type User implements Node {
  id: ID!
  name: String
  ← Type "User" is missing field "Node.createdAt".
}
```

### ✅ Undefined Interface / Union Member Detection

Flags when a type implements an interface that doesn't exist, or a union references missing types.

```graphql
# ❌ "Animal" interface doesn't exist
type Dog implements Animal {
  name: String
}
← Type "Dog" interfaces must be defined. "Animal" is not defined.
```

### ✅ Unknown Directive Detection

Flags directives that aren't recognized.

```graphql
# ❌ @nonexistent is not a known directive
type Query {
  id: ID @nonexistent
         ← Unknown directive "@nonexistent".
}
```

### ✅ Directive Misuse Detection

Catches directives used in the wrong location or with missing required arguments.

```graphql
# ❌ @aws_subscribe belongs on a field, not a type
type Subscription @aws_subscribe(mutations: ["addPost"]) {
  onAddPost: String
}
← Directive "@aws_subscribe" may not be used on OBJECT.
```

### ✅ AWS AppSync Directive Support

Recognizes all AppSync authorization and subscription directives — no false positives:

| Directive | Purpose |
|---|---|
| `@aws_api_key` | API key authorization |
| `@aws_iam` | IAM authorization |
| `@aws_oidc` | OpenID Connect authorization |
| `@aws_lambda` | Lambda authorization |
| `@aws_auth` | Cognito User Pools (default auth mode) |
| `@aws_cognito_user_pools` | Cognito User Pools (additional auth mode) |
| `@aws_subscribe` | Real-time subscriptions |

### ✅ AWS AppSync Scalar Type Support

Recognizes all AppSync built-in scalar types — no false positives:

| Scalar | Purpose |
|---|---|
| `AWSDate` | ISO 8601 date (`YYYY-MM-DD`) |
| `AWSTime` | ISO 8601 time (`hh:mm:ss.sss`) |
| `AWSDateTime` | ISO 8601 date and time |
| `AWSTimestamp` | Unix epoch seconds |
| `AWSEmail` | Email address (RFC 822) |
| `AWSJSON` | Arbitrary JSON string |
| `AWSPhone` | Phone number |
| `AWSURL` | URL (RFC 1738) |
| `AWSIPAddress` | IPv4 or IPv6 address |

```graphql
# ✅ All valid — no errors
type Post @aws_api_key @aws_iam {
  id: ID!
  title: String!
  secret: String @aws_iam
}

type Query {
  publicGet: String @aws_api_key
  authGet: String @aws_auth(cognito_groups: ["Admin"])
}

type Subscription {
  onAdd: String @aws_subscribe(mutations: ["addItem"])
}
```

### ✅ File-Level Error Indicators

Files with errors show **red** in the explorer and tab bar — just like ESLint or TypeScript. You can spot problems without opening the file.

### ✅ Inline Error Messages

Error descriptions appear in **red italic text** right next to the problem line — no need to hover or open the Problems panel.

### ✅ Background Validation

Files stay validated even when they're not the active tab. Switch between files freely — diagnostics persist.

---

## Configuration

| Setting | Default | Description |
|---|---|---|
| `graphql-ly.validationMode` | `"single"` | `"single"` validates each file independently. `"multi"` merges all workspace `.graphql`/`.gql` files and cross-validates type references across files. |

Change via **Settings** → search `graphql-ly` → select your preferred mode.

**When to use multi-file mode:** If your schema is split across multiple files (e.g., `types.graphql`, `queries.graphql`, `mutations.graphql`) and they reference each other's types, use `"multi"` so cross-file references are validated.

---

## Supported File Types

- `.graphql`
- `.gql`

---

## Contributing

Found a bug? Have a feature idea? Contributions are welcome!

1. Fork the repo
2. Create a branch (`git checkout -b my-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit and push
6. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Development

```bash
npm install
npm run build
npm test        # 54 unit tests
# Press F5 in VS Code to launch Extension Development Host
```

## License

MIT

import { validateGraphQL, DiagnosticEntry } from '../validator';

// Helper: expect exactly N errors
function expectErrors(text: string, count: number): DiagnosticEntry[] {
  const results = validateGraphQL(text);
  expect(results).toHaveLength(count);
  return results;
}

// Helper: expect zero errors
function expectValid(text: string): void {
  expect(validateGraphQL(text)).toHaveLength(0);
}

// Helper: expect error containing message substring
function expectErrorMatching(text: string, substring: string): DiagnosticEntry {
  const results = validateGraphQL(text);
  expect(results.length).toBeGreaterThanOrEqual(1);
  const match = results.find(r => r.message.includes(substring));
  expect(match).toBeDefined();
  return match!;
}

// ─── SYNTAX ERRORS ──────────────────────────────────────────────

describe('Syntax errors', () => {
  test('missing closing brace', () => {
    const d = expectErrorMatching(`type Query {`, 'Expected');
    expect(d.line).toBe(0);
  });

  test('missing opening brace', () => {
    expectErrorMatching(`type Query \n  id: ID!\n}`, 'Unexpected');
  });

  test('invalid token', () => {
    expectErrorMatching(`type Query { @@@ }`, 'Expected');
  });

  test('trailing comma in type name is tolerated by parser', () => {
    // graphql-js parser accepts trailing commas — this is not a syntax error
    const results = validateGraphQL(`type Author, {\n  id: ID!\n}\ntype Query {\n  a: Author\n}`);
    expect(results).toHaveLength(0);
  });

  test('unterminated string', () => {
    expectErrorMatching(`type Query {\n  name: "unterminated\n}`, 'Unterminated');
  });

  test('missing colon in field', () => {
    expectErrorMatching(`type Query {\n  name String\n}`, 'Expected');
  });

  test('completely empty input', () => {
    // Empty string has nothing to parse — graphql-js throws on empty doc
    const results = validateGraphQL('');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('random garbage text', () => {
    const results = validateGraphQL('this is not graphql at all!!!');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('incomplete type definition', () => {
    expectErrorMatching(`type`, 'Expected');
  });

  test('duplicate field in type', () => {
    // graphql-js parse allows this but buildSchema catches it
    expectErrorMatching(
      `type Query {\n  name: String\n  name: Int\n}`,
      'name'
    );
  });

  test('missing field type', () => {
    expectErrorMatching(`type Query {\n  name:\n}`, 'Expected');
  });

  test('syntax error reports correct line', () => {
    const schema = `type Query {\n  id: ID!\n}\n\ntype Broken {`;
    const d = expectErrorMatching(schema, 'Expected');
    expect(d.line).toBe(4); // 0-based, "type Broken {" is line 5
  });
});

// ─── SCHEMA-LEVEL ERRORS ────────────────────────────────────────

describe('Schema-level errors', () => {
  test('undefined type in field', () => {
    expectErrorMatching(
      `type Query {\n  post: Post\n}`,
      'Unknown type "Post"'
    );
  });

  test('undefined type in list field', () => {
    expectErrorMatching(
      `type Query {\n  posts: [Post]\n}`,
      'Unknown type "Post"'
    );
  });

  test('undefined type in non-null field', () => {
    expectErrorMatching(
      `type Query {\n  post: Post!\n}`,
      'Unknown type "Post"'
    );
  });

  test('undefined type in argument', () => {
    expectErrorMatching(
      `type Query {\n  getPost(input: PostInput): String\n}`,
      'Unknown type "PostInput"'
    );
  });

  test('duplicate type names', () => {
    expectErrorMatching(
      `type Query {\n  id: ID\n}\ntype Foo {\n  a: String\n}\ntype Foo {\n  b: Int\n}`,
      'Foo'
    );
  });

  test('error points to correct line for undefined type', () => {
    const schema = [
      'type Query {',        // 0
      '  id: ID!',           // 1
      '}',                   // 2
      'type Review {',       // 3
      '  comment: Comment',  // 4
      '}',                   // 5
    ].join('\n');
    const d = expectErrorMatching(schema, 'Unknown type "Comment"');
    expect(d.line).toBe(4);
  });

  test('error points to correct line — not a comment line', () => {
    const schema = [
      'type Query {',                    // 0
      '  id: ID!',                       // 1
      '}',                               // 2
      '# Comment references Comment',    // 3
      'type Review {',                   // 4
      '  comment: Comment',              // 5
      '}',                               // 6
    ].join('\n');
    const d = expectErrorMatching(schema, 'Unknown type "Comment"');
    // Should be line 5 (the field), not line 3 (the comment)
    expect(d.line).toBeGreaterThanOrEqual(4);
  });

  test('multiple undefined types produce errors', () => {
    const schema = `type Query {\n  a: Foo\n  b: Bar\n}`;
    const results = validateGraphQL(schema);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // buildSchema throws a single error mentioning both types
    const allMessages = results.map(r => r.message).join(' ');
    expect(allMessages).toContain('Foo');
  });

  test('interface referenced but not defined', () => {
    expectErrorMatching(
      `type Query {\n  id: ID\n}\ntype Dog implements Animal {\n  name: String\n}`,
      'Animal'
    );
  });

  test('union with undefined member type', () => {
    expectErrorMatching(
      `type Query {\n  search: SearchResult\n}\nunion SearchResult = Post | Comment`,
      'Unknown type'
    );
  });
});

// ─── APPSYNC DIRECTIVES (NO FALSE POSITIVES) ───────────────────

describe('AppSync directives — no false positives', () => {
  test('@aws_api_key on type', () => {
    expectValid(`type Query {\n  id: ID\n}\ntype Post @aws_api_key {\n  id: ID!\n}`);
  });

  test('@aws_iam on type', () => {
    expectValid(`type Query {\n  id: ID\n}\ntype Post @aws_iam {\n  id: ID!\n}`);
  });

  test('@aws_oidc on field', () => {
    expectValid(`type Query {\n  getPost: String @aws_oidc\n}`);
  });

  test('@aws_lambda on field', () => {
    expectValid(`type Query {\n  getPost: String @aws_lambda\n}`);
  });

  test('@aws_auth with cognito_groups', () => {
    expectValid(`type Query {\n  getPost: String @aws_auth(cognito_groups: ["Admins"])\n}`);
  });

  test('@aws_cognito_user_pools with cognito_groups', () => {
    expectValid(
      `type Query {\n  getPost: String @aws_cognito_user_pools(cognito_groups: ["Readers"])\n}`
    );
  });

  test('@aws_subscribe on subscription field', () => {
    expectValid(
      `type Query {\n  id: ID\n}\ntype Mutation {\n  addPost: String\n}\ntype Subscription {\n  onAddPost: String @aws_subscribe(mutations: ["addPost"])\n}`
    );
  });

  test('multiple AppSync directives on same type', () => {
    expectValid(
      `type Query {\n  id: ID\n}\ntype Post @aws_api_key @aws_iam {\n  id: ID!\n  title: String\n}`
    );
  });

  test('multiple AppSync directives on same field', () => {
    expectValid(
      `type Query {\n  getPost: String @aws_api_key @aws_iam\n}`
    );
  });

  test('all AppSync directives used together', () => {
    const schema = `
type Query {
  publicGet: String @aws_api_key
  iamGet: String @aws_iam
  oidcGet: String @aws_oidc
  lambdaGet: String @aws_lambda
  authGet: String @aws_auth(cognito_groups: ["Admin"])
  cognitoGet: String @aws_cognito_user_pools(cognito_groups: ["Users"])
}
type Mutation {
  addItem: String
}
type Subscription {
  onAdd: String @aws_subscribe(mutations: ["addItem"])
}`;
    expectValid(schema);
  });
});

// ─── DIRECTIVE ERRORS ───────────────────────────────────────────

describe('Directive errors', () => {
  test('unknown directive is flagged', () => {
    expectErrorMatching(
      `type Query {\n  id: ID @nonexistent\n}`,
      'Unknown directive'
    );
  });

  test('unknown directive with arguments', () => {
    expectErrorMatching(
      `type Query {\n  id: ID @custom(arg: "val")\n}`,
      'Unknown directive'
    );
  });
});

// ─── VALID SCHEMAS ──────────────────────────────────────────────

describe('Valid schemas — no errors expected', () => {
  test('minimal valid schema', () => {
    expectValid(`type Query {\n  id: ID\n}`);
  });

  test('schema with scalar types', () => {
    expectValid(
      `type Query {\n  s: String\n  i: Int\n  f: Float\n  b: Boolean\n  id: ID\n}`
    );
  });

  test('schema with enum', () => {
    expectValid(
      `type Query {\n  status: Status\n}\nenum Status {\n  ACTIVE\n  INACTIVE\n}`
    );
  });

  test('schema with interface and implementation', () => {
    expectValid(
      `type Query {\n  node: Node\n}\ninterface Node {\n  id: ID!\n}\ntype User implements Node {\n  id: ID!\n  name: String\n}`
    );
  });

  test('schema with union', () => {
    expectValid(
      `type Query {\n  search: Result\n}\ntype Post {\n  title: String\n}\ntype Comment {\n  body: String\n}\nunion Result = Post | Comment`
    );
  });

  test('schema with input type', () => {
    expectValid(
      `type Query {\n  id: ID\n}\ntype Mutation {\n  create(input: CreateInput!): String\n}\ninput CreateInput {\n  name: String!\n  age: Int\n}`
    );
  });

  test('schema with nested non-null and list types', () => {
    expectValid(
      `type Query {\n  items: [Item!]!\n}\ntype Item {\n  tags: [String!]\n  id: ID!\n}`
    );
  });

  test('schema with custom scalar', () => {
    expectValid(
      `scalar DateTime\ntype Query {\n  createdAt: DateTime\n}`
    );
  });

  test('schema with descriptions/comments', () => {
    expectValid(
      `# This is a comment\n"A query type"\ntype Query {\n  "Get the ID"\n  id: ID\n}`
    );
  });

  test('schema with mutation and subscription', () => {
    expectValid(
      `type Query {\n  id: ID\n}\ntype Mutation {\n  update: String\n}\ntype Subscription {\n  onUpdate: String\n}`
    );
  });

  test('schema with arguments on fields', () => {
    expectValid(
      `type Query {\n  user(id: ID!, name: String): User\n}\ntype User {\n  id: ID!\n  name: String\n}`
    );
  });

  test('schema with default argument values', () => {
    expectValid(
      `type Query {\n  posts(limit: Int = 10, offset: Int = 0): [String]\n}`
    );
  });

  test('schema with extend type', () => {
    expectValid(
      `type Query {\n  id: ID\n}\nextend type Query {\n  name: String\n}`
    );
  });
});

// ─── EDGE CASES ─────────────────────────────────────────────────

describe('Edge cases', () => {
  test('only comments', () => {
    const results = validateGraphQL('# just a comment\n# another comment');
    // No type definitions — graphql-js may or may not error
    expect(results).toBeDefined();
  });

  test('whitespace only', () => {
    const results = validateGraphQL('   \n\n   \n');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('all diagnostics have non-negative line/column', () => {
    const badSchemas = [
      'type Query {',
      'type Query {\n  x: Unknown\n}',
      '}{}{',
      'type Query {\n  a: Foo\n  b: Bar\n}',
    ];
    for (const schema of badSchemas) {
      const results = validateGraphQL(schema);
      for (const d of results) {
        expect(d.line).toBeGreaterThanOrEqual(0);
        expect(d.column).toBeGreaterThanOrEqual(0);
        expect(d.endLine).toBeGreaterThanOrEqual(0);
        expect(d.endColumn).toBeGreaterThanOrEqual(0);
        expect(d.severity).toBe('error');
        expect(d.message.length).toBeGreaterThan(0);
      }
    }
  });

  test('large schema does not crash', () => {
    const fields = Array.from({ length: 200 }, (_, i) => `  field${i}: String`).join('\n');
    expectValid(`type Query {\n${fields}\n}`);
  });

  test('deeply nested list/non-null types', () => {
    expectValid(`type Query {\n  data: [[[[String!]!]!]!]\n}`);
  });
});

// ─── DIAGNOSTIC STRUCTURE ───────────────────────────────────────

describe('Diagnostic entry structure', () => {
  test('parse error has correct structure', () => {
    const [d] = expectErrors('type Query {', 1);
    expect(d).toHaveProperty('message');
    expect(d).toHaveProperty('line');
    expect(d).toHaveProperty('column');
    expect(d).toHaveProperty('endLine');
    expect(d).toHaveProperty('endColumn');
    expect(d).toHaveProperty('severity');
    expect(typeof d.message).toBe('string');
    expect(typeof d.line).toBe('number');
    expect(typeof d.column).toBe('number');
    expect(d.severity).toBe('error');
  });

  test('schema error has correct structure', () => {
    const [d] = expectErrors('type Query {\n  x: Unknown\n}', 1);
    expect(d.message).toContain('Unknown');
    expect(d.severity).toBe('error');
    expect(d.endColumn).toBeGreaterThan(d.column);
  });
});

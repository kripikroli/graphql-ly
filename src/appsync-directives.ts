export const APPSYNC_DIRECTIVES = `
directive @aws_auth(cognito_groups: [String!]!) on FIELD_DEFINITION | OBJECT
directive @aws_api_key on FIELD_DEFINITION | OBJECT
directive @aws_iam on FIELD_DEFINITION | OBJECT
directive @aws_oidc on FIELD_DEFINITION | OBJECT
directive @aws_cognito_user_pools(cognito_groups: [String!]!) on FIELD_DEFINITION | OBJECT
directive @aws_lambda on FIELD_DEFINITION | OBJECT
directive @aws_subscribe(mutations: [String!]!) on FIELD_DEFINITION
`;

export const APPSYNC_DIRECTIVES_LINE_COUNT = APPSYNC_DIRECTIVES.split('\n').length;

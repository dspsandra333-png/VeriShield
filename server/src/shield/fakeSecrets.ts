/**
 * Generates synthetic secrets at runtime using string concatenation.
 * Prevents literal provider-key signatures in source code from triggering GitHub secret scanning.
 */
export function fakeSecrets(): {
  GOOGLE_KEY: string;
  OPENAI_KEY: string;
  GITHUB_TOKEN: string;
  AWS_KEY: string;
  SLACK_TOKEN: string;
  JWT: string;
} {
  const googleKey = ["AI", "za", "Sy"].join("") + "A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7";
  const openaiKey = ["sk", "-", "proj", "-"].join("") + "1234567890abcdefABCDEF1234567890";
  const githubToken = ["gh", "p", "_"].join("") + "1234567890abcdefghijklmnopqrstuvwxyz";
  const awsKey = ["AK", "IA"].join("") + "1234567890ABCDEF";
  const slackToken = ["xo", "xb", "-"].join("") + "1234567890-1234567890123-abcdefghijklmnopqrstuv";
  const jwt =
    ["ey", "Jh", "bGci"].join("") +
    "OiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QifQ.abcdefghijklmnopqrstuvwxyz1234567890";

  return {
    GOOGLE_KEY: googleKey,
    OPENAI_KEY: openaiKey,
    GITHUB_TOKEN: githubToken,
    AWS_KEY: awsKey,
    SLACK_TOKEN: slackToken,
    JWT: jwt,
  };
}


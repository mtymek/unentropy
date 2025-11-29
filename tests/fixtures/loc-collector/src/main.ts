/**
 * Sample TypeScript file for LOC fixture
 * This is a comment line
 */

interface User {
  id: number;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return `Hello, ${user.name}!`;
}

function calculateTotal(values: number[]): number {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
}

export type { User };
export { greetUser, calculateTotal };

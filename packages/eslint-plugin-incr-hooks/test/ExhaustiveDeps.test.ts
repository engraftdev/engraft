import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../src/ExhaustiveDeps';

(RuleTester as any).describe = describe;
(RuleTester as any).it = it;

function normalizeIndent(strings: TemplateStringsArray) {
  const codeLines = strings[0].split('\n');
  const leftPadding = codeLines[1].match(/\s+/)![0];
  return codeLines.map(line => line.slice(leftPadding.length - 1)).join('\n');
}

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('exhaustive-deps', rule as any, {
  valid: [
    {
      name: 'correct single dep',
      code: normalizeIndent`
        const f = hooks((a: number) => {
          return hookMemo(() => {
            return a * a;
          }, [a]);
        });
      `,
    },
    {
      name: 'correct nested dep',
      code: normalizeIndent`
        const f = hooks((a: number) => {
          return doThing(() => {
            return hookMemo(() => {
              return a * a;
            }, [a])
          })
        });
      `,
    },
    {
      name: 'correct nested dep twice',
      code: normalizeIndent`
        const f = hooks((a: number) => {
          return doThing(() => {
            const b = a * a;
            return hookMemo(() => {
              return a * b;
            }, [a, b])
          })
        });
      `,
    },
  ],

  invalid: [
    {
      name: 'missing dep',
      code: normalizeIndent`
        const f = hooks((a: number) => {
          return hookMemo(() => {
            return a * a;
          }, [])
        });
      `,
      errors: [ {} ],
    },
    {
      name: 'unnecessary outside dep',
      code: normalizeIndent`
        const outside = 100;

        const f = hooks((a: number) => {
          return hookMemo(() => {
            return a * a;
          }, [a, outside])
        });
      `,
      errors: [ {} ],
    },
    {
      name: 'missing nested dep',
      code: normalizeIndent`
        const f = hooks((a: number) => {
          return doThing(() => {
            return hookMemo(() => {
              return a * a;
            }, []);
          });
        });
      `,
      errors: [ {} ],
    },
    {
      name: 'missing nested dep twice',
      code: normalizeIndent`
      const f = hooks((a: number) => {
        return doThing(() => {
          const b = a * a;
          return hookMemo(() => {
            return a * b;
          }, [a]);
        });
      });
      `,
      errors: [ {} ],
    },
  ]
});

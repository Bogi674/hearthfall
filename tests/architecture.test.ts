import { describe, expect, it } from 'vitest';

const simSources = import.meta.glob<string>('../src/sim/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('architecture rules', () => {
  it('finds the simulation sources', () => {
    expect(Object.keys(simSources).length).toBeGreaterThan(3);
  });

  it('src/sim never imports three', () => {
    for (const [f, src] of Object.entries(simSources)) expect(src, f).not.toMatch(/from ['"]three/);
  });

  it('src/sim never uses Math.random or the DOM', () => {
    for (const [f, src] of Object.entries(simSources)) {
      expect(src, f).not.toMatch(/Math\.random/);
      expect(src, f).not.toMatch(/\b(document|window)\./);
    }
  });
});

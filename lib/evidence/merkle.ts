import { createHash } from 'crypto';

/**
 * Computes SHA-256 hex digest of a UTF-8 string or Buffer.
 */
export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Deterministically serializes an object into canonical JSON:
 * - Sorted keys at all nested levels
 * - No whitespace
 * - Consistent array representation
 */
export function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalStringify((obj as Record<string, unknown>)[k])}`
  );
  return `{${entries.join(',')}}`;
}

/**
 * Computes a Merkle leaf hash from a canonical document entry object.
 */
export function computeLeafHash(documentEntry: Record<string, unknown>): string {
  const canonical = canonicalStringify(documentEntry);
  return sha256(Buffer.from(canonical, 'utf8'));
}

/**
 * Computes the parent hash of two child hashes using sorted-pair concatenation.
 * Rule (ARCH §10.4, §22.2 D1):
 * H(min(A, B) + max(A, B))
 * Lexicographical sorting ensures that the order of inputs does not affect the root.
 */
export function hashPair(a: string, b: string): string {
  const [first, second] = a <= b ? [a, b] : [b, a];
  return sha256(first + second);
}

/**
 * Builds a Merkle root over a list of leaf hashes using sorted-pair hashing.
 * Invariant: Reordering leaf inputs produces the EXACT same Merkle root.
 */
export function computeMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return sha256(''); // Empty tree root
  }

  // Pre-sort all leaves to guarantee commutative Merkle tree root
  let currentLevel = [...leaves].sort();

  if (currentLevel.length === 1) {
    return currentLevel[0];
  }

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]));
      } else {
        // Odd node: duplicate with itself or carry up
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i]));
      }
    }

    currentLevel = nextLevel;
  }

  return currentLevel[0];
}


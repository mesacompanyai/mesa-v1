import { randomBytes, scrypt as nodeScrypt, ScryptOptions, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
  });

  return [
    "scrypt",
    String(SCRYPT_COST),
    String(SCRYPT_BLOCK_SIZE),
    String(SCRYPT_PARALLELIZATION),
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash) return false;

  const [algorithm, cost, blockSize, parallelization, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(password, salt, expected.length, {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
  });

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function scryptAsync(password: string, salt: string, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

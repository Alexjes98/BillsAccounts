// Utility functions for Web Cryptography API (PBKDF2 and AES-GCM)

const ENCRYPTION_ALGO = "AES-GCM";
const KEY_DERIVATION_ALGO = "PBKDF2";
const HASH_ALGO = "SHA-256";
const ITERATIONS = 100000;
const KEY_LENGTH = 256;

// Function to generate a random salt or IV
export function generateRandomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

// Convert a string to a BufferSource (Uint8Array)
export function stringToBuffer(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Convert an ArrayBuffer to a string
export function bufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

// Convert an ArrayBuffer to a base64 string
export function bufferToBase64(buffer: ArrayBufferLike | ArrayBuffer): string {
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert a base64 string to a BufferSource (Uint8Array)
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive a CryptoKey from a password string and a salt
export async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    stringToBuffer(password) as unknown as BufferSource,
    { name: KEY_DERIVATION_ALGO },
    false,
    ["deriveBits", "deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGO,
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    { name: ENCRYPTION_ALGO, length: KEY_LENGTH },
    false, // The derived key is not extractable for security
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedPayload {
  iv: string; // Base64 encoded Initialization Vector
  data: string; // Base64 encoded ciphertext
}

// Encrypt a plain text string
export async function encryptData(
  plainText: string,
  key: CryptoKey,
): Promise<EncryptedPayload> {
  const iv = generateRandomBytes(12); // Standard for AES-GCM is 12 bytes
  const encodedData = stringToBuffer(plainText);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGO,
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedData as unknown as BufferSource,
  );

  return {
    iv: bufferToBase64(iv.buffer),
    data: bufferToBase64(encryptedBuffer),
  };
}

// Decrypt an EncryptedPayload to a plain text string
export async function decryptData(
  payload: EncryptedPayload,
  key: CryptoKey,
): Promise<string> {
  const ivBuffer = base64ToBuffer(payload.iv);
  const dataBuffer = base64ToBuffer(payload.data);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGO,
      iv: ivBuffer as unknown as BufferSource,
    },
    key,
    dataBuffer as unknown as BufferSource,
  );

  return bufferToString(decryptedBuffer);
}

// Encrypt a JSON object
export async function encryptObject(
  obj: any,
  key: CryptoKey,
): Promise<EncryptedPayload> {
  const jsonString = JSON.stringify(obj);
  return encryptData(jsonString, key);
}

// Decrypt to a JSON object
export async function decryptObject<T = any>(
  payload: EncryptedPayload,
  key: CryptoKey,
): Promise<T> {
  const jsonString = await decryptData(payload, key);
  return JSON.parse(jsonString) as T;
}

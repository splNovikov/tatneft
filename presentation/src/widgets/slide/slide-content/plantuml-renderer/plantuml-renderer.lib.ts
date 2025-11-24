import pako from 'pako';

/**
 * Encodes PlantUML code for use in PlantUML server URLs
 * Uses deflate compression with prefix ~1 as required by PlantUML server
 * 
 * PlantUML encoding algorithm:
 * 1. UTF-8 encode the text
 * 2. Compress using deflate (raw, without zlib header)
 * 3. Encode in base64
 * 4. Replace + with - and / with _ for URL safety
 * 5. Add ~1 prefix to indicate DEFLATE compressed data
 */
export function encodePlantUML(code: string): string {
  // Remove leading/trailing whitespace and normalize line endings
  const normalized = code.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Step 1: UTF-8 encode
  const utf8Bytes = new TextEncoder().encode(normalized);
  
  // Step 2: Compress using raw deflate (without zlib header)
  // PlantUML expects raw deflate, not zlib format
  const compressed = pako.deflateRaw(utf8Bytes, { level: 9 });
  
  // Step 3: Encode in base64
  // Convert Uint8Array to binary string, then to base64
  let binary = '';
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  const base64 = btoa(binary);
  
  // Step 4: Replace characters for URL safety (PlantUML server format)
  const urlSafe = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding
  
  // Step 5: Add ~1 prefix to indicate DEFLATE compressed data (required by PlantUML server)
  return `~1${urlSafe}`;
}


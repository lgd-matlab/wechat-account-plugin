const input = String.raw`\x3cp\x3eTest\x3c/p\x3e`;
console.log('Input:', input);
console.log('Input length:', input.length);
console.log('First 10 chars:', Array.from(input).slice(0, 10));

// Test decoding
const decoded = input.replace(/\\x3c/gi, '<').replace(/\\x3e/gi, '>');
console.log('Decoded:', decoded);

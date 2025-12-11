// Utility function to convert an ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(
    String.fromCharCode(...new Uint8Array(buffer))
  );
}

// Function to hash the password and generate salt
export async function hashPassword(password: string): Promise<{ hashedPassword: string; salt: string }> {
  // Generate a random salt
  const saltLength = 16; // Length of the salt in bytes
  const saltArray = new Uint8Array(saltLength);
  window.crypto.getRandomValues(saltArray); // Generate random salt
  const salt = arrayBufferToBase64(saltArray.buffer); // Convert salt to Base64

  // Combine password and salt for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);

  // Hash the password using SHA-256
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashedPassword = arrayBufferToBase64(hashBuffer); // Convert hash to Base64

  return { hashedPassword, salt };
}

// Example usage
(async () => {
  const password = "MySecurePassword123";
  const { hashedPassword, salt } = await hashPassword(password); // Hash the password and generate salt

})();
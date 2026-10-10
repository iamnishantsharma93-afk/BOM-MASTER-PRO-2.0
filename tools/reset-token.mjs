// =========================================================
// BOM MASTER PRO — Reset Token Generator (Developer only)
// Usage: node tools/reset-token.mjs <USERNAME> <RESET_CODE>
// Token = <first letter of username> + <reset code> +
//         <last character of username>
// =========================================================

const username = (process.argv[2] || "").trim();
const code = (process.argv[3] || "").trim().toUpperCase();

if (!username || !code) {
  console.error("Usage: node tools/reset-token.mjs <USERNAME> <RESET_CODE>");
  process.exit(1);
}

const token = `${username.charAt(0)}${code}${username.charAt(
  username.length - 1
)}`;

console.log(`Username   : ${username}`);
console.log(`Reset Code : ${code}`);
console.log(`Reset Token: ${token}`);
console.log("\nSend this token to the user - they paste it into the app to set a new password.");
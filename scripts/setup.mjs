import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
if (!existsSync(".env")) {
  writeFileSync(
    ".env",
    `JWT_SECRET=${randomBytes(48).toString("hex")}\nADMIN_PASSWORD=${randomBytes(15).toString("base64url")}\nUSER_PASSWORD=${randomBytes(15).toString("base64url")}\n`,
    { mode: 0o600 },
  );
  console.log("Creado .env privado (excluido de Git).");
}
console.log(
  "Cuentas: admin@nexo.example y usuario@nexo.example. Contraseñas en .env. No publiques ese archivo.",
);

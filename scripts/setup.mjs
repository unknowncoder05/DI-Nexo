import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
if (!existsSync(".env")) {
  writeFileSync(
    ".env",
    `ADMIN_PASSWORD=${randomBytes(15).toString("base64url")}\nUSER_PASSWORD=${randomBytes(15).toString("base64url")}\n`,
    { mode: 0o600 },
  );
  console.log("Creado .env privado (excluido de Git).");
}
console.log(
  "Cuentas: admin@nexo.example y usuario@nexo.example. Contraseñas en .env. Configura también las variables de .env.example y ejecuta npm run db:setup. No publiques ese archivo.",
);

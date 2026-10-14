import { DOCUMENT } from "@angular/common";
import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "./auth.service";
/** Marca llamadas propias y centraliza caducidad de sesión. */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const document = inject(DOCUMENT);
  if (!req.url.startsWith("/api/")) return next(req);
  return next(req.clone({ url: new URL(req.url.slice(1), document.baseURI).toString(), setHeaders: { "X-Nexo-Request": "1" } })).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes("/auth/")) auth.expire();
      return throwError(() => error);
    }),
  );
};
export function errorMessage(error: unknown): string {
  return error instanceof HttpErrorResponse
    ? error.error?.message ||
        "No se pudo conectar. Comprueba la conexión e inténtalo de nuevo."
    : "No se ha podido completar la operación.";
}

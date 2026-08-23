<?php

use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Every API response uses one error envelope:
 *
 *   { "errors": { "message": "...", "code": "...", "fields": { ... } } }
 *
 * `fields` is only present for validation failures.
 */
$apiError = function (string $message, string $code, int $status, array $fields = [], array $headers = []) {
    $payload = ['message' => $message, 'code' => $code];

    if ($fields !== []) {
        $payload['fields'] = $fields;
    }

    return response()->json(['errors' => $payload], $status, $headers);
};

/**
 * Fallback code for HTTP statuses that have no dedicated contract entry.
 *
 * @var array<int, string>
 */
$statusCodes = [
    400 => 'BAD_REQUEST',
    401 => 'UNAUTHENTICATED',
    403 => 'FORBIDDEN',
    404 => 'NOT_FOUND',
    405 => 'METHOD_NOT_ALLOWED',
    409 => 'CONFLICT',
    419 => 'CSRF_TOKEN_MISMATCH',
    422 => 'VALIDATION_ERROR',
    429 => 'TOO_MANY_ATTEMPTS',
    503 => 'SERVICE_UNAVAILABLE',
];

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Sanctum SPA cookie mode: requests whose Origin/Referer matches
        // config('sanctum.stateful') get the full session stack (cookies,
        // StartSession, CSRF, AuthenticateSession) on the `api` group.
        // No API tokens are used anywhere - User does not use HasApiTokens.
        $middleware->statefulApi();

        $middleware->alias([
            'active' => EnsureUserIsActive::class,
            'password.changed' => EnsurePasswordIsChanged::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) use ($apiError, $statusCodes) {
        $isApi = fn (Request $request): bool => $request->is('api/*') || $request->expectsJson();

        $exceptions->shouldRenderJsonWhen(fn (Request $request, Throwable $e): bool => $isApi($request));

        $exceptions->render(function (Throwable $e, Request $request) use ($apiError, $statusCodes, $isApi) {
            if (! $isApi($request)) {
                return null;
            }

            // Already carries a fully formed response (e.g. the deactivated
            // account payload, or a rate limiter response callback).
            if ($e instanceof HttpResponseException) {
                return null;
            }

            if ($e instanceof ValidationException) {
                $fields = $e->errors();

                return $apiError(
                    (string) (Arr::first(Arr::flatten($fields)) ?: 'Gönderilen bilgiler geçersiz.'),
                    'VALIDATION_ERROR',
                    422,
                    $fields,
                );
            }

            if ($e instanceof AuthenticationException) {
                return $apiError('Bu işlem için oturum açmanız gerekiyor.', 'UNAUTHENTICATED', 401);
            }

            if ($e instanceof AccessDeniedHttpException) {
                return $apiError('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
            }

            if ($e instanceof NotFoundHttpException) {
                return $apiError('Kayıt bulunamadı.', 'NOT_FOUND', 404);
            }

            if ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
                $code = $statusCodes[$status] ?? 'HTTP_ERROR';

                $message = match ($status) {
                    403 => 'Bu işlem için yetkiniz yok.',
                    404 => 'Kayıt bulunamadı.',
                    405 => 'Bu adres için geçersiz istek yöntemi.',
                    419 => 'Oturum doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.',
                    429 => 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.',
                    default => $e->getMessage() !== '' && $status < 500
                        ? $e->getMessage()
                        : 'İstek işlenemedi.',
                };

                // Preserves Retry-After (and the X-RateLimit-* headers) that the
                // throttle middleware attached to the exception.
                return $apiError($message, $code, $status, [], $e->getHeaders());
            }

            // Anything unexpected: never leak the message, stack trace, SQL or
            // file paths to the client when debug mode is off.
            $payload = [
                'message' => 'Beklenmeyen bir sunucu hatası oluştu.',
                'code' => 'SERVER_ERROR',
            ];

            if (config('app.debug')) {
                $payload['debug'] = [
                    'exception' => $e::class,
                    'message' => $e->getMessage(),
                ];
            }

            return response()->json(['errors' => $payload], 500);
        });
    })->create();

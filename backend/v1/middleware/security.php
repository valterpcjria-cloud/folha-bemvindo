<?php
/**
 * Security Middleware - Versão Simplificada
 * 
 * Rate Limiting, Security Headers, Input Sanitization
 * NOTA: Esta versão é defensiva e não quebrará se não houver permissões
 */

// ============================================================================
// SECURITY HEADERS (sempre funciona)
// ============================================================================
function setSecurityHeaders(): void
{
    if (!headers_sent()) {
        header("X-XSS-Protection: 1; mode=block");
        header("X-Frame-Options: DENY");
        header("X-Content-Type-Options: nosniff");
        header("Referrer-Policy: strict-origin-when-cross-origin");
        header("Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()");

        // HSTS: força HTTPS por 1 ano (aplicado somente em produção quando conexão é HTTPS)
        if (($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') {
            header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
        }

        // Bem Vindo v1.5.1: a CSP agora é aplicada (enforced) pelo Apache em todas as respostas
        // (docker/apache-bemvindo.conf). O Report-Only daqui foi removido.

        header_remove("X-Powered-By");
    }
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================
class InputSanitizer
{
    public static function sanitizeString(?string $input): string
    {
        if ($input === null)
            return '';
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }

    public static function sanitizeInt($input): int
    {
        return (int)filter_var($input, FILTER_SANITIZE_NUMBER_INT);
    }

    public static function sanitizeFloat($input): float
    {
        return (float)filter_var($input, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    }

    public static function sanitizeEmail(?string $input): string
    {
        if ($input === null)
            return '';
        return filter_var(trim($input), FILTER_SANITIZE_EMAIL);
    }

    public static function sanitizeCPF(?string $input): string
    {
        if ($input === null)
            return '';
        return preg_replace('/[^0-9]/', '', $input);
    }
}

// ============================================================================
// RATE LIMITER
// v4.55.0 (A1): cache em sys_logs/ com fallback p/ temp do sistema.
// Login é fail-closed (sem cache gravável → bloqueia); demais rotas fail-open.
// ============================================================================
class RateLimiter
{
    private static $enabled = false;
    private static $cache_dir = null;

    public static function init(): bool
    {
        // Tenta usar o diretório de logs do projeto
        $candidates = [
            dirname(__DIR__) . '/sys_logs/rate_limit/',
            rtrim(sys_get_temp_dir(), '/') . '/bemvindo_rate_limit/',
        ];

        foreach ($candidates as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
            if (is_dir($dir) && is_writable($dir)) {
                self::$cache_dir = $dir;
                self::$enabled = true;
                return true;
            }
        }

        error_log('[RateLimiter] Nenhum diretório de cache gravável (sys_logs/rate_limit, temp).');
        return false;
    }

    /** true se o cache está gravável (rate limit operante). */
    public static function isAvailable(): bool
    {
        return self::$enabled || self::init();
    }

    public static function check(int $max_requests = 100, int $window_seconds = 60, bool $failClosed = false): bool
    {
        if (!self::isAvailable()) {
            return !$failClosed; // fail-closed: bloqueia; fail-open: permite
        }

        $ip = self::getClientIP();
        $cache_file = self::$cache_dir . md5($ip) . '.json';

        $data = ['count' => 0, 'start' => time()];

        if (file_exists($cache_file)) {
            $data = @json_decode(file_get_contents($cache_file), true) ?? $data;
        }

        if (time() - $data['start'] > $window_seconds) {
            $data = ['count' => 0, 'start' => time()];
        }

        $data['count']++;
        if (@file_put_contents($cache_file, json_encode($data)) === false) {
            error_log('[RateLimiter] Falha ao gravar ' . $cache_file);
            if ($failClosed) return false;
        }

        return $data['count'] <= $max_requests;
    }

    public static function checkLogin(): bool
    {
        return self::check(5, 60, true);
    }

    /**
     * Faixas oficiais do Cloudflare (https://www.cloudflare.com/ips — conferido em 2026-10-01).
     * Só nesses IPs o header CF-Connecting-IP é confiável.
     */
    private const CLOUDFLARE_RANGES = [
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
        '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
        '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
        '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
        '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
    ];

    /**
     * v4.55.0: IP do cliente à prova de spoofing.
     * Antes confiava em X-Forwarded-For/CF-Connecting-IP vindos de qualquer origem —
     * atacante trocava o header a cada tentativa e burlava o rate limit do login.
     * Agora: CF-Connecting-IP só se a conexão vier de fato do Cloudflare; senão REMOTE_ADDR.
     */
    private static function getClientIP(): string
    {
        $remote = $_SERVER['REMOTE_ADDR'] ?? '';
        if ($remote === '') {
            return 'unknown';
        }

        $cfIp = trim($_SERVER['HTTP_CF_CONNECTING_IP'] ?? '');
        if ($cfIp !== '' && filter_var($cfIp, FILTER_VALIDATE_IP) && self::isCloudflare($remote)) {
            return $cfIp;
        }

        return $remote;
    }

    private static function isCloudflare(string $ip): bool
    {
        foreach (self::CLOUDFLARE_RANGES as $cidr) {
            if (self::ipInCidr($ip, $cidr)) {
                return true;
            }
        }
        return false;
    }

    /** Compara IPv4/IPv6 com uma faixa CIDR usando a forma binária (inet_pton). */
    private static function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = explode('/', $cidr);
        $ipBin = @inet_pton($ip);
        $subnetBin = @inet_pton($subnet);
        if ($ipBin === false || $subnetBin === false || strlen($ipBin) !== strlen($subnetBin)) {
            return false;
        }

        $bits = (int)$bits;
        $fullBytes = intdiv($bits, 8);
        if (strncmp($ipBin, $subnetBin, $fullBytes) !== 0) {
            return false;
        }

        $remainder = $bits % 8;
        if ($remainder === 0) {
            return true;
        }
        $mask = chr((0xFF << (8 - $remainder)) & 0xFF);
        return (($ipBin[$fullBytes] & $mask) === ($subnetBin[$fullBytes] & $mask));
    }
}

// ============================================================================
// APLICAR HEADERS (sempre)
// ============================================================================
setSecurityHeaders();
// End of file
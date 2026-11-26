<?php
/**
 * JWT Helper Functions
 * 
 * Implementação simples de JWT sem dependências externas.
 * Para produção em larga escala, considere usar firebase/php-jwt
 */

class JWT
{
    private static $secret = null;

    /** v4.58.0: cookie HttpOnly que carrega o token de sessão */
    public const COOKIE_NAME = 'bemvindo_session';

    /** Origem do token validado na requisição atual: 'header' | 'cookie' | null */
    private static $tokenSource = null;

    /**
     * Obtém a chave secreta do arquivo .env ou usa fallback
     */
    private static function getSecret(): string
    {
        if (self::$secret === null) {
            self::$secret = Database::getEnv('JWT_SECRET');
            if (!self::$secret) {
                // Em desenvolvimento, se não houver .env, bloqueia para segurança
                throw new Exception("JWT_SECRET não configurada no ambiente ou no arquivo .env.");
            }
        }
        return self::$secret;
    }

    /**
     * Base64 URL-safe encode
     */
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL-safe decode
     */
    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }

    /**
     * Gera um token JWT
     */
    public static function encode(array $payload): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];

        // Adiciona timestamps padrão se não existirem
        if (!isset($payload['iat'])) {
            $payload['iat'] = time();
        }
        if (!isset($payload['exp'])) {
            $payload['exp'] = time() + 3600; // 1 hora por padrão
        }

        $headerEncoded = self::base64UrlEncode(json_encode($header));
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", self::getSecret(), true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return "$headerEncoded.$payloadEncoded.$signatureEncoded";
    }

    /**
     * Decodifica e valida um token JWT
     * @return array|false Retorna o payload ou false se inválido
     */
    public static function decode(string $token)
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return false;
        }

        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

        // Defense-in-depth: valida o header para impedir alg confusion (alg=none, RS256 downgrade, etc)
        $header = json_decode(self::base64UrlDecode($headerEncoded), true);
        if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256' || ($header['typ'] ?? '') !== 'JWT') {
            return false;
        }

        // Verifica assinatura
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "$headerEncoded.$payloadEncoded", self::getSecret(), true)
        );

        if (!hash_equals($expectedSignature, $signatureEncoded)) {
            return false;
        }

        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);

        if (!$payload) {
            return false;
        }

        // Verifica expiração
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }

        return $payload;
    }

    /** v4.58.0: token do cookie HttpOnly de sessão */
    public static function getTokenFromCookie(): ?string
    {
        $token = $_COOKIE[self::COOKIE_NAME] ?? '';
        return is_string($token) && $token !== '' ? $token : null;
    }

    /** 'header' | 'cookie' | null — usado na proteção CSRF (auth.php) */
    public static function getTokenSource(): ?string
    {
        return self::$tokenSource;
    }

    /**
     * Valida o token da requisição.
     * Bem Vindo v1.5.1: só o cookie HttpOnly de sessão (fim da transição v4.58.0 — o header
     * Authorization e o token no corpo do login não são mais aceitos/enviados).
     * @return array|false Retorna o payload ou false se inválido
     */
    public static function validateRequest()
    {
        self::$tokenSource = null;
        $cookieToken = self::getTokenFromCookie();
        if ($cookieToken) {
            $payload = self::decode($cookieToken);
            if ($payload) {
                self::$tokenSource = 'cookie';
                return $payload;
            }
        }
        return false;
    }
}
// End of file
<?php
/**
 * AuthSession — emissão/revogação de tokens e regras de senha (v4.57.0)
 *
 * A2: cada JWT ganha um `jti` único; logout grava o jti em `jwt_blacklist`.
 * C5: claim `pwd_change` restringe o token às rotas de troca de senha/logout.
 * A3 (v4.58.0): token entregue em cookie HttpOnly + Secure + SameSite=Strict.
 */

require_once __DIR__ . '/JWT.php';

class AuthSession
{
    public const TOKEN_TTL = 4 * 3600; // 4 horas
    public const SENHA_PADRAO_LEGADA = '123456';

    /** Gera o JWT de sessão com jti único. */
    public static function emitirToken(array $user, bool $trocaSenhaObrigatoria): string
    {
        $claims = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'perfil' => $user['perfil'],
            'id_empresa' => $user['id_empresa'],
            'jti' => bin2hex(random_bytes(16)),
            'exp' => time() + self::TOKEN_TTL,
        ];
        if ($trocaSenhaObrigatoria) {
            $claims['pwd_change'] = true;
        }
        return JWT::encode($claims);
    }

    /**
     * v4.58.0 (A3): grava o token em cookie HttpOnly (JS não lê → imune a roubo por XSS).
     * Cookie de sessão (sem expires): some ao fechar o navegador; o `exp` do JWT segue valendo.
     */
    public static function definirCookieSessao(string $token): void
    {
        self::enviarCookie($token, 0);
    }

    public static function apagarCookieSessao(): void
    {
        self::enviarCookie('', time() - 3600);
    }

    private static function enviarCookie(string $valor, int $expires): void
    {
        if (headers_sent()) {
            error_log('[AuthSession] Headers já enviados — cookie de sessão não gravado.');
            return;
        }
        $https = ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
        $path = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/') . '/';

        setcookie(JWT::COOKIE_NAME, $valor, [
            'expires' => $expires,
            'path' => $path,            // ex: /backend/v1/ — só a API recebe o cookie
            'secure' => $https,
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
    }

    /** Corpo de resposta padrão do login / troca de senha. */
    public static function respostaSessao(array $user, string $token, bool $trocaSenhaObrigatoria): array
    {
        return [
            "id" => $user['id'],
            "nome" => $user['nome'],
            "email" => $user['email'],
            "perfil" => $user['perfil'],
            "id_empresa" => $user['id_empresa'],
            "must_change_password" => $trocaSenhaObrigatoria,
            "token" => $token
        ];
    }

    /**
     * true se o jti foi revogado (logout).
     * Fail-open se a tabela não existir (migration não rodada) — loga o erro
     * para não derrubar todas as requisições do sistema.
     */
    public static function tokenRevogado(PDO $conn, string $jti): bool
    {
        try {
            $stmt = $conn->prepare("SELECT 1 FROM jwt_blacklist WHERE jti = ? LIMIT 1");
            $stmt->execute([$jti]);
            return (bool)$stmt->fetchColumn();
        } catch (PDOException $e) {
            error_log('[AuthSession] Falha ao consultar jwt_blacklist (migration v4.57.0 rodada?): ' . $e->getMessage());
            return false;
        }
    }

    /** Revoga o token atual e limpa registros vencidos. */
    public static function revogarToken(PDO $conn, array $payload): void
    {
        $jti = $payload['jti'] ?? '';
        if (!is_string($jti) || $jti === '') {
            return; // token emitido antes da v4.57.0: expira sozinho em até 4h
        }
        try {
            $stmt = $conn->prepare("INSERT IGNORE INTO jwt_blacklist (jti, usuario_id, expira_em) VALUES (?, ?, ?)");
            $stmt->execute([$jti, $payload['user_id'] ?? null, (int)($payload['exp'] ?? time() + self::TOKEN_TTL)]);
            $conn->prepare("DELETE FROM jwt_blacklist WHERE expira_em < ?")->execute([time()]);
        } catch (PDOException $e) {
            error_log('[AuthSession] Falha ao revogar token: ' . $e->getMessage());
        }
    }

    /** Regra da nova senha. Retorna mensagem de erro ou null se válida. */
    public static function validarNovaSenha(string $nova, string $atual): ?string
    {
        if (strlen($nova) < 8) {
            return 'A nova senha deve ter no mínimo 8 caracteres.';
        }
        if (!preg_match('/[A-Za-z]/', $nova) || !preg_match('/[0-9]/', $nova)) {
            return 'A nova senha deve conter letras e números.';
        }
        if ($nova === $atual) {
            return 'A nova senha deve ser diferente da senha atual.';
        }
        if ($nova === self::SENHA_PADRAO_LEGADA) {
            return 'Escolha uma senha diferente da senha padrão.';
        }
        return null;
    }

    /** Senha temporária legível (sem 0/O/1/l/I), sempre com letras e números. */
    public static function gerarSenhaTemporaria(int $tamanho = 10): string
    {
        $letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
        $numeros = '23456789';
        $todos = $letras . $numeros;

        $senha = $letras[random_int(0, strlen($letras) - 1)] . $numeros[random_int(0, strlen($numeros) - 1)];
        for ($i = 2; $i < $tamanho; $i++) {
            $senha .= $todos[random_int(0, strlen($todos) - 1)];
        }
        return str_shuffle($senha);
    }
}

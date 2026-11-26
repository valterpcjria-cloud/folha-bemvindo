<?php
/**
 * Bem Vindo v1.4.0 — fluxo da competência em 6 etapas.
 *
 *   ABERTA → EM_CONFERENCIA → VALIDADA → AUTORIZADA → PAGA → ENCERRADA
 *
 * Avançar: só para a etapa seguinte, pelo perfil responsável.
 * Devolver: para ABERTA, com justificativa obrigatória.
 * status ABERTA/FECHADA continua sendo a trava dos lançamentos: só a etapa ABERTA edita.
 * SUPERADMIN pode tudo (como em requireRole).
 */
class EtapasCompetencia
{
    public const ETAPAS = ['ABERTA', 'EM_CONFERENCIA', 'VALIDADA', 'AUTORIZADA', 'PAGA', 'ENCERRADA'];

    /** Quem leva a competência PARA cada etapa (avançar). */
    private const AVANCAR = [
        'EM_CONFERENCIA' => ['ADMIN', 'RH'],
        'VALIDADA'       => ['ADMIN', 'CONTABILIDADE'],
        'AUTORIZADA'     => ['ADMIN', 'DIRETOR'],
        'PAGA'           => ['ADMIN', 'RH'],
        'ENCERRADA'      => ['ADMIN', 'RH'],
    ];

    /** Quem devolve para ABERTA, a partir de cada etapa. */
    private const DEVOLVER = [
        'EM_CONFERENCIA' => ['ADMIN', 'RH', 'CONTABILIDADE'],
        'VALIDADA'       => ['ADMIN', 'RH', 'CONTABILIDADE', 'DIRETOR'],
        'AUTORIZADA'     => ['ADMIN', 'RH', 'CONTABILIDADE', 'DIRETOR'],
        'PAGA'           => ['ADMIN'],
        'ENCERRADA'      => ['ADMIN'],
    ];

    public static function proxima(string $etapa): ?string
    {
        $i = array_search($etapa, self::ETAPAS, true);
        return ($i === false || $i >= count(self::ETAPAS) - 1) ? null : self::ETAPAS[$i + 1];
    }

    private static function pode(string $perfil, array $perfis): bool
    {
        return $perfil === 'SUPERADMIN' || in_array($perfil, $perfis, true);
    }

    /**
     * Muda a etapa. Retorna [httpCode, corpo]. Tudo numa transação, com histórico e log.
     */
    public static function mudar(PDO $conn, array $authUser, int $compId, string $para, string $observacao): array
    {
        $empresaId = (int)$authUser['id_empresa'];
        $perfil = (string)($authUser['perfil'] ?? '');
        $observacao = trim($observacao);

        if (!in_array($para, self::ETAPAS, true)) {
            return [400, ['error' => 'Etapa inválida.']];
        }

        $conn->beginTransaction();
        try {
            $st = $conn->prepare("SELECT id, mes, ano, etapa FROM competencias WHERE id = ? AND id_empresa = ? FOR UPDATE");
            $st->execute([$compId, $empresaId]);
            $comp = $st->fetch(PDO::FETCH_ASSOC);
            if (!$comp) {
                $conn->rollBack();
                return [404, ['error' => 'Competência não encontrada.']];
            }
            $de = $comp['etapa'] ?: 'ABERTA';

            if ($para === 'ABERTA') {
                if ($de === 'ABERTA') {
                    $conn->rollBack();
                    return [409, ['error' => 'A competência já está aberta.']];
                }
                if (!self::pode($perfil, self::DEVOLVER[$de])) {
                    $conn->rollBack();
                    return [403, ['error' => 'Seu perfil não pode devolver a competência nesta etapa.']];
                }
                if (mb_strlen($observacao) < 5) {
                    $conn->rollBack();
                    return [400, ['error' => 'Informe o motivo da devolução (mínimo 5 caracteres).']];
                }
                $up = $conn->prepare("UPDATE competencias SET etapa = 'ABERTA', status = 'ABERTA', data_fechamento = NULL, justificativa_status = ? WHERE id = ? AND id_empresa = ?");
                $up->execute([$observacao, $compId, $empresaId]);
                $acao = 'DEVOLUCAO';
            } else {
                if (self::proxima($de) !== $para) {
                    $conn->rollBack();
                    return [409, ['error' => 'A competência só pode avançar para a etapa seguinte.']];
                }
                if (!self::pode($perfil, self::AVANCAR[$para])) {
                    $conn->rollBack();
                    return [403, ['error' => 'Seu perfil não pode fazer esta etapa.']];
                }
                // Sair de ABERTA trava os lançamentos (status FECHADA) e marca a data de fechamento.
                $sql = $de === 'ABERTA'
                    ? "UPDATE competencias SET etapa = ?, status = 'FECHADA', data_fechamento = NOW() WHERE id = ? AND id_empresa = ?"
                    : "UPDATE competencias SET etapa = ?, status = 'FECHADA' WHERE id = ? AND id_empresa = ?";
                $conn->prepare($sql)->execute([$para, $compId, $empresaId]);
                $acao = 'ETAPA_' . $para;
            }

            $nome = null;
            if (!empty($authUser['user_id'])) {
                $su = $conn->prepare("SELECT nome FROM usuarios WHERE id = ?");
                $su->execute([$authUser['user_id']]);
                $nome = $su->fetchColumn() ?: null;
            }
            $hist = $conn->prepare("INSERT INTO competencia_etapas_historico
                (competencia_id, id_empresa, etapa_de, etapa_para, usuario_id, usuario_nome, usuario_perfil, observacao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $hist->execute([$compId, $empresaId, $de, $para, $authUser['user_id'] ?? null, $nome, $perfil, $observacao !== '' ? $observacao : null]);

            $conn->commit();
        } catch (Throwable $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            throw $e;
        }

        $msg = "Competência {$comp['mes']}/{$comp['ano']}: $de → $para" . ($observacao !== '' ? ". Obs.: $observacao" : '');
        registrarLog($conn, $authUser['user_id'], 'COMPETENCIA', $compId, $acao, $msg, $empresaId);

        return [200, ['success' => true, 'etapa' => $para, 'status' => $para === 'ABERTA' ? 'ABERTA' : 'FECHADA']];
    }

    public static function historico(PDO $conn, int $empresaId, int $compId): array
    {
        $st = $conn->prepare("SELECT h.id, h.etapa_de, h.etapa_para, h.usuario_nome, h.usuario_perfil, h.observacao, h.criado_em
            FROM competencia_etapas_historico h
            JOIN competencias c ON c.id = h.competencia_id AND c.id_empresa = ?
            WHERE h.competencia_id = ?
            ORDER BY h.criado_em DESC, h.id DESC");
        $st->execute([$empresaId, $compId]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }
}

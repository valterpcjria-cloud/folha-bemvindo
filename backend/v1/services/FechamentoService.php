<?php
declare(strict_types=1);

require_once __DIR__ . '/DsrService.php';
require_once __DIR__ . '/../lib/PayrollConstants.php';

/**
 * FechamentoService
 *
 * Pipeline de fechamento da folha por funcionário.
 * Ordem de cálculo:
 *   1. Salário Base
 *   2. Eventos Variáveis
 *   3. Calcular Base DSR
 *   4. Calcular DSR
 *   5. Inserir Evento DSR  (executado internamente em calcularDSR)
 *   6. Calcular INSS
 *   7. Calcular FGTS
 *   8. Calcular IRRF
 *   9. Calcular Líquido
 *  10. Finalizar (persistir em fechamento_fila)
 */
class FechamentoService
{
    private PDO $conn;
    private DsrService $dsrService;

    /** Alíquotas INSS carregadas uma vez por instância */
    private array $faixasInss = [];
    /** Alíquotas IRRF carregadas uma vez por instância */
    private array $faixasIrrf = [];
    /** Parâmetros do sistema (ALIQUOTA_FGTS, TETO_INSS…) */
    private array $parametros = [];

    public function __construct(PDO $conn)
    {
        $this->conn       = $conn;
        $this->dsrService = new DsrService($conn);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Carrega alíquotas e parâmetros do banco.
     * Deve ser chamado UMA VEZ antes de processar o lote.
     */
    public function carregarAliquotas(int $empresaId): void
    {
        // INSS – tabela progressiva
        $stmt = $this->conn->query(
            "SELECT faixa_inicio, faixa_fim, aliquota
             FROM aliquotas_inss
             WHERE ativo = 1
               AND vigencia_inicio <= CURDATE()
               AND (vigencia_fim IS NULL OR vigencia_fim >= CURDATE())
             ORDER BY faixa_inicio ASC"
        );
        $this->faixasInss = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // IRRF – tabela progressiva
        $stmt = $this->conn->query(
            "SELECT faixa_inicio, faixa_fim, aliquota, parcela_deduzir
             FROM aliquotas_irrf
             WHERE ativo = 1
               AND vigencia_inicio <= CURDATE()
               AND (vigencia_fim IS NULL OR vigencia_fim >= CURDATE())
             ORDER BY faixa_inicio ASC"
        );
        $this->faixasIrrf = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Parâmetros do tenant
        $stmt = $this->conn->prepare(
            "SELECT chave, valor, tipo
             FROM parametros_sistema
             WHERE id_empresa = ?
               AND chave IN ('TETO_INSS', 'ALIQUOTA_FGTS', 'FAIXA_ISENCAO_IRRF', 'VALOR_DEDUCAO_DEPENDENTE')"
        );
        $stmt->execute([$empresaId]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $this->parametros[$row['chave']] = $row['tipo'] === 'NUMERO'
                ? (float)$row['valor']
                : $row['valor'];
        }

        // Defaults seguros
        $this->parametros['ALIQUOTA_FGTS']             ??= 8.0;
        $this->parametros['TETO_INSS']                  ??= 8475.55;
        $this->parametros['FAIXA_ISENCAO_IRRF']         ??= 2824.00;
        $this->parametros['VALOR_DEDUCAO_DEPENDENTE']   ??= 189.59;
    }

    /**
     * Executa o pipeline completo para um único funcionário.
     *
     * @return array{
     *   funcionario_id: int,
     *   salario_base:   float,
     *   total_proventos: float,
     *   total_descontos: float,
     *   valor_dsr:      float,
     *   base_inss:      float,
     *   desconto_inss:  float,
     *   base_fgts:      float,
     *   deposito_fgts:  float,
     *   base_irrf:      float,
     *   desconto_irrf:  float,
     *   valor_liquido:  float,
     *   status:         string
     * }
     */
    public function calcularFuncionario(int $funcId, int $compId, int $empresaId): array
    {
        // ── 1. Salário Base ───────────────────────────────────────────────────
        $salarioBase = $this->somarLancamentos($funcId, $compId, $empresaId, [
            'evento_codigo' => PayrollConstants::EVENT_CODES['SALARIO'],
        ]);

        // ── 2. Todos os lançamentos (proventos e descontos) ───────────────────
        [$totalProventos, $totalDescontos] = $this->somarProventosDescontos($funcId, $compId, $empresaId);

        // ── 3 + 4 + 5. Base DSR  / Calcular DSR / Inserir Evento DSR ─────────
        //   calcularDSR já persiste o lançamento DSR via lancarEventoDSR()
        $valorDsr = 0.0;
        try {
            $resultDsr = $this->dsrService->calcularDSR($funcId, $compId, 'fechamento', $empresaId);
            if ($resultDsr !== null) {
                $valorDsr = (float)($resultDsr['valor_dsr'] ?? 0.0);
                // Re-soma proventos incluindo o DSR recém-lançado
                [$totalProventos, $totalDescontos] = $this->somarProventosDescontos($funcId, $compId, $empresaId);
            }
        } catch (Throwable $e) {
            // DSR não bloqueia o fechamento; registra o erro e continua
            error_log("[FechamentoService] DSR func=" . (string)$funcId . " comp=" . (string)$compId . ": " . $e->getMessage());
        }

        // ── 6. INSS ───────────────────────────────────────────────────────────
        $baseInss    = $this->calcularBaseInss($funcId, $compId, $empresaId);
        $descontoInss = $this->calcularInssProgressivo($baseInss);

        // ── 7. FGTS ──────────────────────────────────────────────────────────
        $baseFgts    = $this->calcularBaseFgts($funcId, $compId, $empresaId);
        $depositoFgts = round($baseFgts * ($this->parametros['ALIQUOTA_FGTS'] / 100), 2);

        // ── 8. IRRF ──────────────────────────────────────────────────────────
        // Obter número de dependentes do funcionário
        $stmtDep = $this->conn->prepare("SELECT dep_ir FROM funcionarios WHERE id = ?");
        $stmtDep->execute([$funcId]);
        $depIr = (int)($stmtDep->fetchColumn() ?: 0);
        $deducaoDependente = (float)($this->parametros['VALOR_DEDUCAO_DEPENDENTE'] ?? 203.77);

        // RTM = base bruta IRRF (antes de INSS); calcularIrrfProgressivo usa RTM p/ redutor
        $rtmIrrf      = $this->calcularBaseIrrf($funcId, $compId, $empresaId, 0.0);
        $baseIrrf     = max(0.0, $rtmIrrf - $descontoInss);
        $descontoIrrf = $this->calcularIrrfProgressivo($baseIrrf, $depIr, $deducaoDependente, $rtmIrrf);

        // ── 9. Líquido ────────────────────────────────────────────────────────
        $valorLiquido = round(
            $totalProventos - $totalDescontos - $descontoInss - $descontoIrrf,
            2
        );

        // ── 10. Finalizar ─────────────────────────────────────────────────────
        // (A persistência em fechamento_fila é feita pelo chamador via UPDATE)
        return [
            'funcionario_id'  => $funcId,
            'salario_base'    => $salarioBase,
            'total_proventos' => $totalProventos,
            'total_descontos' => $totalDescontos,
            'valor_dsr'       => $valorDsr,
            'base_inss'       => $baseInss,
            'desconto_inss'   => $descontoInss,
            'base_fgts'       => $baseFgts,
            'deposito_fgts'   => $depositoFgts,
            'base_irrf'       => $baseIrrf,
            'desconto_irrf'   => $descontoIrrf,
            'valor_liquido'   => $valorLiquido,
            'status'          => 'CONCLUIDO',
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE – Helpers de base de cálculo
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Soma lançamentos por evento específico (código numérico).
     */
    private function somarLancamentos(int $funcId, int $compId, int $empresaId, array $filtros): float
    {
        $sql = "SELECT COALESCE(SUM(le.valor_total), 0)
                FROM lancamentos_eventos le
                JOIN eventos_folha ef ON le.evento_id = ef.id
                WHERE le.funcionario_id = ?
                  AND le.competencia_id = ?
                  AND le.id_empresa     = ?
                  AND ef.codigo_evento  = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$funcId, $compId, $empresaId, $filtros['evento_codigo']]);
        return (float)$stmt->fetchColumn();
    }

    /**
     * Retorna [total_proventos, total_descontos] para o funcionário.
     */
    private function somarProventosDescontos(int $funcId, int $compId, int $empresaId): array
    {
        $stmt = $this->conn->prepare(
            "SELECT
                COALESCE(SUM(CASE WHEN ef.tipo = 'CREDITO' THEN le.valor_total ELSE 0 END), 0) AS proventos,
                COALESCE(SUM(CASE WHEN ef.tipo = 'DEBITO'  THEN le.valor_total ELSE 0 END), 0) AS descontos
             FROM lancamentos_eventos le
             JOIN eventos_folha ef ON le.evento_id = ef.id
             WHERE le.funcionario_id = ?
               AND le.competencia_id = ?
               AND le.id_empresa     = ?
               AND ef.natureza IN ('PROVENTO', 'DESCONTO')"
        );
        $stmt->execute([$funcId, $compId, $empresaId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return [(float)$row['proventos'], (float)$row['descontos']];
    }

    /**
     * Base INSS = soma de proventos com incide_inss = 1, limitado ao teto.
     */
    private function calcularBaseInss(int $funcId, int $compId, int $empresaId): float
    {
        $stmt = $this->conn->prepare(
            "SELECT COALESCE(SUM(le.valor_total), 0)
             FROM lancamentos_eventos le
             JOIN eventos_folha ef ON le.evento_id = ef.id
             WHERE le.funcionario_id = ?
               AND le.competencia_id = ?
               AND le.id_empresa     = ?
               AND ef.tipo           = 'CREDITO'
               AND ef.incide_inss    = 1"
        );
        $stmt->execute([$funcId, $compId, $empresaId]);
        $base = (float)$stmt->fetchColumn();
        return min($base, $this->parametros['TETO_INSS']);
    }

    /**
     * Base FGTS = soma de proventos com incide_fgts = 1.
     */
    private function calcularBaseFgts(int $funcId, int $compId, int $empresaId): float
    {
        $stmt = $this->conn->prepare(
            "SELECT COALESCE(SUM(le.valor_total), 0)
             FROM lancamentos_eventos le
             JOIN eventos_folha ef ON le.evento_id = ef.id
             WHERE le.funcionario_id = ?
               AND le.competencia_id = ?
               AND le.id_empresa     = ?
               AND ef.tipo           = 'CREDITO'
               AND ef.incide_fgts    = 1"
        );
        $stmt->execute([$funcId, $compId, $empresaId]);
        return (float)$stmt->fetchColumn();
    }

    /**
     * Base IRRF = proventos com incide_irrf = 1 – desconto INSS.
     */
    private function calcularBaseIrrf(int $funcId, int $compId, int $empresaId, float $descontoInss): float
    {
        $stmt = $this->conn->prepare(
            "SELECT COALESCE(SUM(le.valor_total), 0)
             FROM lancamentos_eventos le
             JOIN eventos_folha ef ON le.evento_id = ef.id
             WHERE le.funcionario_id = ?
               AND le.competencia_id = ?
               AND le.id_empresa     = ?
               AND ef.tipo           = 'CREDITO'
               AND ef.incide_irrf    = 1"
        );
        $stmt->execute([$funcId, $compId, $empresaId]);
        $base = (float)$stmt->fetchColumn();
        return max(0.0, round($base - $descontoInss, 2));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE – Cálculos de INSS e IRRF progressivos
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * INSS progressivo por faixas (tabela 2026 — cada faixa tributa apenas
     * o valor que cai dentro dela).
     */
    private function calcularInssProgressivo(float $base): float
    {
        if (empty($this->faixasInss) || $base <= 0) {
            return 0.0;
        }

        $total = 0.0;
        foreach ($this->faixasInss as $faixa) {
            $inicio   = (float)$faixa['faixa_inicio'];
            $fim      = $faixa['faixa_fim'] !== null ? (float)$faixa['faixa_fim'] : PHP_FLOAT_MAX;
            $aliquota = (float)$faixa['aliquota'] / 100;

            if ($base <= $inicio) break;

            $tributavel = min($base, $fim) - $inicio;
            $total     += $tributavel * $aliquota;
        }

        return round($total, 2);
    }

    /**
     * IRRF — Lei 15.270/2025 / tabela progressiva 2026.
     *
     * @param float $base  BC após INSS (RTM − INSS)
     * @param int   $depIr Dependentes
     * @param float $deducaoDependente Dedução por dep. (padrão 189,59)
     * @param float $rtm   RTM bruto (antes de INSS) — usado para redutor
     */
    private function calcularIrrfProgressivo(float $base, int $depIr = 0, float $deducaoDependente = 189.59, float $rtm = 0.0): float
    {
        $rtmEfetivo = $rtm > 0 ? $rtm : $base;
        if ($rtmEfetivo <= 5000.0) return 0.0;

        $bcLegal        = max(0.0, $base - ($depIr * $deducaoDependente));
        $bcSimplificado = max(0.0, $base - 607.20);

        $irLegal        = $this->_aplicarTabelaIRRF($bcLegal, $rtmEfetivo);
        $irSimplificado = $this->_aplicarTabelaIRRF($bcSimplificado, $rtmEfetivo);

        return min($irLegal, $irSimplificado);
    }

    private function _aplicarTabelaIRRF(float $bc, float $rtm): float
    {
        if (empty($this->faixasIrrf) || $bc <= 0 || $rtm <= 5000.0) return 0.0;

        $aliquota = 0.0; $parcelaDeduz = 0.0;
        foreach ($this->faixasIrrf as $faixa) {
            $inicio = (float)$faixa['faixa_inicio'];
            $fim    = $faixa['faixa_fim'] !== null ? (float)$faixa['faixa_fim'] : PHP_FLOAT_MAX;
            if ($bc >= $inicio && $bc <= $fim) {
                $aliquota     = (float)$faixa['aliquota'] / 100;
                $parcelaDeduz = (float)$faixa['parcela_deduzir'];
                break;
            }
        }

        $irBruto = max(0.0, ($bc * $aliquota) - $parcelaDeduz);

        if ($rtm <= 7350.0) {
            $redutor = 978.62 - (0.133145 * $rtm);
            return round(max(0.0, $irBruto - $redutor), 2);
        }

        return round($irBruto, 2);
    }
}

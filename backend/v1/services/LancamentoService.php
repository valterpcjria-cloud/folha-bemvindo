<?php
declare(strict_types=1);

/**
 * LancamentoService
 * 
 * Centraliza a lógica de negócio de lançamentos da folha.
 */
class LancamentoService
{
    private PDO $conn;

    public function __construct(PDO $conn)
    {
        $this->conn = $conn;
    }

    /**
     * Busca lançamentos por competência
     */
    public function getByCompetencia(int $compId, int $empresaId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM lancamentos_eventos WHERE competencia_id = ? AND id_empresa = ?");
        $stmt->execute([$compId, $empresaId]);
        return $stmt->fetchAll();
    }

    /**
     * Salva ou atualiza lançamentos em massa (Bulk Import)
     */
    public function saveBulk(array $data, int $empresaId, int $userId): array
    {
        $this->conn->beginTransaction();
        try {
            // Se o primeiro item não tiver competencia_id, buscamos a ativa da empresa
            $defaultCompId = 0;
            if (empty($data[0]['competencia_id'])) {
                $defaultCompId = $this->getActiveCompetenciaId($empresaId);
            }

            // Primeiro, identificamos os salários base no lote ou no banco p/ cálculos
            $salaries = $this->resolveBaseSalaries($data, $empresaId, $defaultCompId);
            $gratificacoes = $this->resolveGratificacoes($data, $empresaId);

            // Resolve insalubridade (62) e faltas (71) para cálculos em cascata
            require_once __DIR__ . '/../lib/PayrollConstants.php';
            $insalubridades = $this->resolveEventValues($data, $empresaId, $defaultCompId, PayrollConstants::EVENT_CODES['INSALUBRIDADE']);
            $faltasValues   = $this->resolveEventValues($data, $empresaId, $defaultCompId, PayrollConstants::EVENT_CODES['FALTAS']);

            // Valida evento_ids contra a tabela eventos_folha para evitar FK violation
            $eventoIdsNoLote = array_unique(array_map('intval', array_column($data, 'evento_id')));
            $validEventoIds = [];
            if (!empty($eventoIdsNoLote)) {
                $placeholders = implode(',', array_fill(0, count($eventoIdsNoLote), '?'));
                $stmtEvt = $this->conn->prepare("SELECT id FROM eventos_folha WHERE id IN ($placeholders)");
                $stmtEvt->execute(array_values($eventoIdsNoLote));
                $validEventoIds = array_flip($stmtEvt->fetchAll(PDO::FETCH_COLUMN));
            }

            $sql = "INSERT INTO lancamentos_eventos (funcionario_id, competencia_id, evento_id, quantidade, valor_unitario, valor_total, id_empresa, origem)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'CALCULO')
                    ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade), valor_unitario = VALUES(valor_unitario), valor_total = VALUES(valor_total), id_empresa = VALUES(id_empresa), origem = 'CALCULO'";
            $stmt = $this->conn->prepare($sql);

            // Cache de status de competência (evita query por item)
            $competenciaAbertaCache = [];

            foreach ($data as $item) {
                $comp_id = (int)($item['competencia_id'] ?? $defaultCompId);
                if ($comp_id <= 0) continue; // Pula se não tiver competência

                // Bloqueia escrita em competência fechada (imutabilidade/auditoria)
                if (!isset($competenciaAbertaCache[$comp_id])) {
                    $competenciaAbertaCache[$comp_id] = $this->isCompetenciaAberta($comp_id, $empresaId);
                }
                if (!$competenciaAbertaCache[$comp_id]) continue; // Competência FECHADA é ignorada silenciosamente

                $evento_id = (int)$item['evento_id'];
                if (!isset($validEventoIds[$evento_id])) continue; // Pula evento_id inválido (evita FK violation)

                $insalubVal = $insalubridades[$item['funcionario_id']] ?? 0;
                $faltasVal  = $faltasValues[$item['funcionario_id']] ?? 0;
                $salVal     = $salaries[$item['funcionario_id']] ?? 0;
                // Bem Vindo v1.2.0: gratificação de função (82) = % do cadastro × salário
                $gratVal    = round($salVal * ($gratificacoes[$item['funcionario_id']] ?? 0) / 100, 2);
                $processed  = $this->calculateEventValue($item, $salVal, $insalubVal, $faltasVal, $gratVal);

                $stmt->execute([
                    $item['funcionario_id'],
                    $comp_id,
                    $evento_id,
                    $processed['quantidade'],
                    $processed['valor_unitario'],
                    $processed['valor_total'],
                    $empresaId
                ]);
            }
            
            $this->conn->commit();
            
            require_once __DIR__ . '/../lib/Utils.php';
            registrarLog($this->conn, $userId, 'FOLHA', 0, 'IMPORTACAO', "Importou " . count($data) . " lançamentos com auto-cálculo", $empresaId);
            
            return ["success" => true, "count" => count($data)];
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            throw $e;
        }
    }

    /**
     * Salva um único lançamento
     */
    public function saveSingle(array $data, int $empresaId, int $userId): bool
    {
        require_once __DIR__ . '/../lib/PayrollConstants.php';
        $comp_id = (int)($data['competencia_id'] ?? 0);
        if ($comp_id <= 0) {
            $comp_id = $this->getActiveCompetenciaId($empresaId);
        }

        $salary     = $this->getSalaryForEmployee((int)$data['funcionario_id'], $comp_id, $empresaId);
        $insalubSingle = $this->getEventValueForEmployee((int)$data['funcionario_id'], $comp_id, $empresaId, PayrollConstants::EVENT_CODES['INSALUBRIDADE']);
        $faltasSingle  = $this->getEventValueForEmployee((int)$data['funcionario_id'], $comp_id, $empresaId, PayrollConstants::EVENT_CODES['FALTAS']);
        $gratSingle    = round($salary * $this->getGratificacaoForEmployee((int)$data['funcionario_id'], $empresaId) / 100, 2);
        $processed  = $this->calculateEventValue($data, $salary, $insalubSingle, $faltasSingle, $gratSingle);

        $sql = "INSERT INTO lancamentos_eventos (funcionario_id, competencia_id, evento_id, quantidade, valor_unitario, valor_total, id_empresa, origem)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'CALCULO')
                ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade), valor_unitario = VALUES(valor_unitario), valor_total = VALUES(valor_total), id_empresa = VALUES(id_empresa), origem = 'CALCULO'";
        $stmt = $this->conn->prepare($sql);
        
        $success = $stmt->execute([
            $data['funcionario_id'],
            $comp_id,
            $data['evento_id'],
            $processed['quantidade'],
            $processed['valor_unitario'],
            $processed['valor_total'],
            $empresaId
        ]);

        if ($success) {
            require_once __DIR__ . '/../lib/Utils.php';
            registrarLog($this->conn, $userId, 'FOLHA', 0, 'LANCAMENTO', "Lançamento Processado (Func: {$data['funcionario_id']} / Ev: {$data['evento_id']})", $empresaId);
        }
        
        return $success;
    }

    /**
     * Aplica proporcionalidade aos dias trabalhados quando a admissão cai dentro
     * do mês/ano da competência. Fórmula CLT (mês comercial de 30 dias):
     *   dias_trabalhados = 30 - dia_admissao + 1
     *   salario_propor   = salario_base × dias_trabalhados / 30
     * Se admissão for em outro mês, retorna o salário integral.
     * v4.52.10.
     */
    private function aplicarProporcionalidadeAdmissao(float $salarioBase, ?string $dataAdmissao, int $compMes, int $compAno): float
    {
        if (!$dataAdmissao || $compMes <= 0 || $salarioBase <= 0) return $salarioBase;
        $dataPart = explode('T', $dataAdmissao)[0];
        $parts = explode('-', $dataPart);
        if (count($parts) < 3) return $salarioBase;
        $admAno = (int)$parts[0];
        $admMes = (int)$parts[1];
        $admDia = (int)$parts[2];
        if ($admAno !== $compAno || $admMes !== $compMes) return $salarioBase;
        $diasTrabalhados = max(0, min(30, 30 - $admDia + 1));
        return round($salarioBase * $diasTrabalhados / 30, 2);
    }

    /** Retorna [mes, ano] da competência. Cache leve via memoização não é necessário aqui. */
    private function getCompetenciaMesAno(int $compId, int $empresaId): array
    {
        if ($compId <= 0) return [0, 0];
        $stmt = $this->conn->prepare("SELECT mes, ano FROM competencias WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$compId, $empresaId]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? [(int)$r['mes'], (int)$r['ano']] : [0, 0];
    }

    /**
     * Resolve salários base para um conjunto de dados (otimizado para bulk).
     * Fonte única da verdade: funcionarios.salario_base.
     * Fallback: lançamento da rubrica 33 (para dados legados sem salario_base).
     * v4.52.10: aplica proporcionalidade aos dias trabalhados se data_admissao
     *   cair dentro do mês/ano da competência.
     */
    private function resolveBaseSalaries(array $data, int $empresaId, int $fallbackCompId = 0): array
    {
        require_once __DIR__ . '/../lib/PayrollConstants.php';
        $salaries = [];
        $funcIds = array_unique(array_column($data, 'funcionario_id'));
        if (empty($funcIds)) return $salaries;

        $compId = (int)($data[0]['competencia_id'] ?? $fallbackCompId);
        [$compMes, $compAno] = $this->getCompetenciaMesAno($compId, $empresaId);

        // 1. Busca salario_base + data_admissao direto do cadastro (fonte primária)
        $placeholders = implode(',', array_fill(0, count($funcIds), '?'));
        $stmt = $this->conn->prepare("SELECT id, salario_base, data_admissao FROM funcionarios WHERE id IN ($placeholders) AND id_empresa = ?");
        $stmt->execute(array_merge(array_values($funcIds), [$empresaId]));
        while ($row = $stmt->fetch()) {
            if ($row['salario_base'] !== null && (float)$row['salario_base'] > 0) {
                $salaries[$row['id']] = $this->aplicarProporcionalidadeAdmissao(
                    (float)$row['salario_base'],
                    $row['data_admissao'] ?? null,
                    $compMes,
                    $compAno
                );
            }
        }

        // 2. Fallback legado: para funcionários sem salario_base, busca rubrica 33 do banco (sem proporcionalidade)
        $missing = array_diff($funcIds, array_keys($salaries));
        if (!empty($missing) && $compId > 0) {
            $ph2 = implode(',', array_fill(0, count($missing), '?'));
            $sql = "SELECT funcionario_id, valor_total FROM lancamentos_eventos
                    WHERE competencia_id = ? AND id_empresa = ? AND evento_id IN (SELECT id FROM eventos_folha WHERE codigo_evento = ?)
                    AND funcionario_id IN ($ph2)";
            $stmt = $this->conn->prepare($sql);
            $params = array_merge([$compId, $empresaId, PayrollConstants::EVENT_CODES['SALARIO']], array_values($missing));
            $stmt->execute($params);
            while ($row = $stmt->fetch()) {
                $salaries[$row['funcionario_id']] = (float)$row['valor_total'];
            }
        }

        return $salaries;
    }

    /**
     * Resolve o % de gratificação de função (82) por funcionário (otimizado para bulk).
     * Bem Vindo v1.2.0: era o valor R$ da Gratificação 88 (Frimelo); agora é o % do cadastro.
     */
    private function resolveGratificacoes(array $data, int $empresaId): array
    {
        $gratificacoes = [];
        $funcIds = array_unique(array_column($data, 'funcionario_id'));
        if (empty($funcIds)) return $gratificacoes;

        $placeholders = implode(',', array_fill(0, count($funcIds), '?'));
        $stmt = $this->conn->prepare("SELECT id, gratificacao_funcao_perc FROM funcionarios WHERE id IN ($placeholders) AND id_empresa = ?");
        $stmt->execute(array_merge(array_values($funcIds), [$empresaId]));
        while ($row = $stmt->fetch()) {
            $gratificacoes[$row['id']] = (float)($row['gratificacao_funcao_perc'] ?? 0.00);
        }
        return $gratificacoes;
    }

    private function getGratificacaoForEmployee(int $funcId, int $empresaId): float
    {
        $stmt = $this->conn->prepare("SELECT gratificacao_funcao_perc FROM funcionarios WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$funcId, $empresaId]);
        return (float)($stmt->fetchColumn() ?: 0.00);
    }

    private function getSalaryForEmployee(int $funcId, int $compId, int $empresaId): float
    {
        require_once __DIR__ . '/../lib/PayrollConstants.php';
        // 1. Fonte primária: cadastro do funcionário (com proporcionalidade na admissão)
        $stmt = $this->conn->prepare("SELECT salario_base, data_admissao FROM funcionarios WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$funcId, $empresaId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && $row['salario_base'] !== null && (float)$row['salario_base'] > 0) {
            [$compMes, $compAno] = $this->getCompetenciaMesAno($compId, $empresaId);
            return $this->aplicarProporcionalidadeAdmissao(
                (float)$row['salario_base'],
                $row['data_admissao'] ?? null,
                $compMes,
                $compAno
            );
        }

        // 2. Fallback legado
        $sql = "SELECT valor_total FROM lancamentos_eventos
                WHERE funcionario_id = ? AND competencia_id = ? AND id_empresa = ?
                AND evento_id IN (SELECT id FROM eventos_folha WHERE codigo_evento = ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$funcId, $compId, $empresaId, PayrollConstants::EVENT_CODES['SALARIO']]);
        return (float)($stmt->fetchColumn() ?: 0);
    }

    /**
     * Retorna true se a competência está ABERTA (pode receber alterações).
     * Competências FECHADAS são imutáveis por design (snapshot auditável).
     */
    private function isCompetenciaAberta(int $compId, int $empresaId): bool
    {
        $stmt = $this->conn->prepare("SELECT status FROM competencias WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$compId, $empresaId]);
        $status = $stmt->fetchColumn();
        return $status === 'ABERTA';
    }

    private function getEventValueForEmployee(int $funcId, int $compId, int $empresaId, int $codigoEvento): float
    {
        $sql = "SELECT valor_total FROM lancamentos_eventos
                WHERE funcionario_id = ? AND competencia_id = ? AND id_empresa = ?
                AND evento_id IN (SELECT id FROM eventos_folha WHERE codigo_evento = ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$funcId, $compId, $empresaId, $codigoEvento]);
        return (float)($stmt->fetchColumn() ?: 0);
    }

    /**
     * Aplica lógica de cálculo com base no código do evento
     */
    /**
     * Resolve valores de um evento específico por funcionário (lote + banco)
     */
    private function resolveEventValues(array $data, int $empresaId, int $fallbackCompId, int $codigoEvento): array
    {
        $values = [];
        $funcIds = array_unique(array_column($data, 'funcionario_id'));
        $compId = (int)($data[0]['competencia_id'] ?? $fallbackCompId);

        // 1. Procura no lote
        foreach ($data as $item) {
            if (isset($item['codigo_evento']) && (int)$item['codigo_evento'] === $codigoEvento) {
                $values[$item['funcionario_id']] = (float)$item['valor_total'];
            }
        }

        // 2. Para os que faltam, busca no banco
        $missing = array_diff($funcIds, array_keys($values));
        if (!empty($missing) && $compId > 0) {
            $placeholders = implode(',', array_fill(0, count($missing), '?'));
            $sql = "SELECT funcionario_id, valor_total FROM lancamentos_eventos
                    WHERE competencia_id = ? AND id_empresa = ? AND evento_id IN (SELECT id FROM eventos_folha WHERE codigo_evento = ?)
                    AND funcionario_id IN ($placeholders)";
            $stmt = $this->conn->prepare($sql);
            $params = array_merge([$compId, $empresaId, $codigoEvento], array_values($missing));
            $stmt->execute($params);
            while ($row = $stmt->fetch()) {
                $values[$row['funcionario_id']] = (float)$row['valor_total'];
            }
        }

        return $values;
    }

    private function calculateEventValue(array $item, float $baseSalary, float $insalubridade = 0, float $faltas = 0, float $gratificacao = 0): array
    {
        require_once __DIR__ . '/../lib/PayrollConstants.php';

        $code = (int)($item['codigo_evento'] ?? 0);
        $qtd = (float)($item['quantidade'] ?? 0);
        $valUnit = (float)($item['valor_unitario'] ?? 0);
        $valTotal = (float)($item['valor_total'] ?? 0);

        // Rubrica 33 (Salário): força valor_total = salario_base do cadastro.
        // Qualquer valor enviado pelo frontend é ignorado — fonte única da verdade é funcionarios.salario_base.
        if ($code === PayrollConstants::EVENT_CODES['SALARIO']) {
            return [
                'quantidade' => 0,
                'valor_unitario' => $baseSalary,
                'valor_total' => round($baseSalary, 2)
            ];
        }

        // Bem Vindo v1.2.0: Gratificação de função (82) — força o valor do cadastro (% × salário).
        // (A Gratificação 88 da Frimelo está desativada no Bem Vindo.)
        if ($code === PayrollConstants::EVENT_CODES['GRATIFICACAO_FUNCAO']) {
            return [
                'quantidade' => $baseSalary > 0 ? round($gratificacao * 100 / $baseSalary, 2) : 0,
                'valor_unitario' => $baseSalary / 100,
                'valor_total' => round($gratificacao, 2)
            ];
        }

        // Se já vier com valor total e não for um evento de auto-cálculo manual, mantém
        if ($valTotal > 0 && !in_array($code, [
            PayrollConstants::EVENT_CODES['HORAS_EXTRAS_100'],
            PayrollConstants::EVENT_CODES['HORAS_EXTRAS_60'],
            PayrollConstants::EVENT_CODES['HORAS_FALTAS'],
            PayrollConstants::EVENT_CODES['FERIADO_TRABALHADO'],
            PayrollConstants::EVENT_CODES['FALTAS'],
            PayrollConstants::EVENT_CODES['INSALUBRIDADE'],
            PayrollConstants::EVENT_CODES['ASSIDUIDADE']
        ])) {
            return $item;
        }

        switch ($code) {
            case PayrollConstants::EVENT_CODES['HORAS_EXTRAS_100']:
            case PayrollConstants::EVENT_CODES['HORAS_EXTRAS_60']:
                // Base HE = Salário (33) + Gratificação de função (82) + Insalubridade (62)
                // HE 100% (49) × 2; Bem Vindo v1.2.0: HE 60% (37) × 1,6
                $baseHE = $baseSalary + $gratificacao + $insalubridade;
                $mult = $code === PayrollConstants::EVENT_CODES['HORAS_EXTRAS_60']
                    ? PayrollConstants::OVERTIME_60_MULTIPLIER
                    : PayrollConstants::OVERTIME_100_MULTIPLIER;
                if ($baseHE > 0 && $qtd > 0) {
                    $valUnit = ($baseHE / PayrollConstants::MONTHLY_WORKING_HOURS) * $mult;
                    $valTotal = round($qtd * $valUnit, 2);
                }
                break;

            case PayrollConstants::EVENT_CODES['HORAS_FALTAS']:
                // Bem Vindo v1.2.0: horas faltas (23) = salário ÷ 220 × horas (P13)
                if ($baseSalary > 0 && $qtd > 0) {
                    $valUnit = $baseSalary / PayrollConstants::MONTHLY_WORKING_HOURS;
                    $valTotal = round($qtd * $valUnit, 2);
                }
                break;

            case PayrollConstants::EVENT_CODES['FERIADO_TRABALHADO']:
            case PayrollConstants::EVENT_CODES['FALTAS']:
                if ($baseSalary > 0 && $qtd > 0) {
                    $valUnit = $baseSalary / 30;
                    $valTotal = round($qtd * $valUnit, 2);
                }
                break;

            case PayrollConstants::EVENT_CODES['INSALUBRIDADE']:
                // Base: (Salário Mínimo − Faltas) / 100 × percentual
                $baseInsalub = max(0.0, PayrollConstants::SALARIO_MINIMO_2026 - $faltas);
                $valUnit  = $baseInsalub / 100;
                $valTotal = round($qtd * $valUnit, 2);
                break;

            case PayrollConstants::EVENT_CODES['ASSIDUIDADE']:
                // Assiduidade (v4.52.5): base = Salário do funcionário (rubrica 33),
                // não mais Salário Mínimo. Sem dedução de faltas.
                $valUnit  = $baseSalary / 100;
                $valTotal = round($qtd * $valUnit, 2);
                break;

            case PayrollConstants::EVENT_CODES['ADICIONAL_TEMPO_SERVICO']:
                // Adicional Tempo de Serviço (v4.52.7): base = Salário do funcionário (rubrica 33),
                // não mais Salário Mínimo. Sem dedução de faltas.
                $valUnit  = $baseSalary / 100;
                $valTotal = round($qtd * $valUnit, 2);
                break;
        }

        // Se valor_total não foi calculado mas há quantidade e valor_unitário, recalcula
        if ($valTotal == 0 && $qtd > 0 && $valUnit > 0) {
            $valTotal = round($qtd * $valUnit, 2);
        }

        return [
            'quantidade' => $qtd,
            'valor_unitario' => $valUnit,
            'valor_total' => $valTotal
        ];
    }

    private function getActiveCompetenciaId(int $empresaId): int
    {
        $stmt = $this->conn->prepare("SELECT id FROM competencias WHERE id_empresa = ? AND status = 'ABERTA' ORDER BY ano DESC, mes DESC LIMIT 1");
        $stmt->execute([$empresaId]);
        $id = $stmt->fetchColumn();
        if (!$id) {
            $stmt = $this->conn->prepare("SELECT id FROM competencias WHERE id_empresa = ? ORDER BY ano DESC, mes DESC LIMIT 1");
            $stmt->execute([$empresaId]);
            $id = $stmt->fetchColumn();
        }
        return (int)$id;
    }
}

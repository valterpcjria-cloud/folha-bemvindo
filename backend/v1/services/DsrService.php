<?php
declare(strict_types=1);

/**
 * DsrService
 * 
 * Centraliza os cálculos do banco e regras para Descanso Semanal Remunerado.
 * Adaptado de especificações Laravel para o ecossistema PHP + PDO.
 */
class DsrService
{
    private PDO $conn;

    public function __construct(PDO $conn)
    {
        $this->conn = $conn;
    }

    /**
     * Calcula dinamicamente dias uteis e domingos/feriados do mes considerando
     * feriados nacionais, estaduais e municipais da empresa.
     *
     * @return array ['dias_uteis' => int, 'dias_dsr' => int]
     */
    public function getDiasMes(int $mes, int $ano, int $empresaId = 1): array
    {
        $diasUteisRow = 0;
        $diasDsrRow = 0;
        
        $diasNoMes = cal_days_in_month(CAL_GREGORIAN, $mes, $ano);
        
        // Feriados aplicáveis à localidade da empresa
        $feriados = $this->getFeriadosAplicaveis($mes, $ano, $empresaId);

        for ($dia = 1; $dia <= $diasNoMes; $dia++) {
            $dataStr = sprintf('%04d-%02d-%02d', $ano, $mes, $dia);
            $diaSemana = date('w', strtotime($dataStr)); // 0 = Domingo
            
            $isFeriado = in_array($dataStr, $feriados);
            $isDomingo = ($diaSemana == 0);
            
            if ($isDomingo || $isFeriado) {
                $diasDsrRow++;
            } else {
                $diasUteisRow++;
            }
        }
        
        return [
            'dias_uteis' => $diasUteisRow,
            'dias_dsr'   => $diasDsrRow
        ];
    }

    /**
     * Busca todos os feriados aplicáveis a uma empresa/localidade em um mês.
     * Considera feriados nacionais, estaduais (da UF) e municipais (da Cidade).
     */
    public function getFeriadosAplicaveis(int $mes, int $ano, int $empresaId): array
    {
        // 1. Buscar dados da empresa (UF/Cidade)
        $stmtEmp = $this->conn->prepare("SELECT uf, nome_cidade FROM empresas WHERE id = ?");
        $stmtEmp->execute([$empresaId]);
        $empresa = $stmtEmp->fetch(PDO::FETCH_ASSOC);
        $uf = $empresa['uf'] ?? '';
        $cidade = $empresa['nome_cidade'] ?? '';

        // 2. Buscar feriados do banco
        $sql = "
            SELECT data, recorrente FROM feriados 
            WHERE ativo = 1 
            AND (
                (tipo = 'nacional') OR 
                (tipo = 'estadual' AND uf = :uf) OR 
                (tipo = 'municipal' AND (uf = :uf OR uf IS NULL) AND cidade = :cidade)
            )
            AND (empresa_id = :empresa_id OR empresa_id IS NULL)
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':uf' => $uf, ':cidade' => $cidade, ':empresa_id' => $empresaId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $feriados = [];
        foreach ($rows as $r) {
            $data = $r['data'];
            if ($r['recorrente']) {
                // Se recorrente, "data" contém apenas o dia/mês de referência
                $diaMes = date('m-d', strtotime($data));
                $dataNoAno = (string)$ano . '-' . $diaMes;
                // Verifica se a data gerada pertence ao mês alvo
                if (date('m', strtotime($dataNoAno)) == $mes) {
                    $feriados[] = $dataNoAno;
                }
            } else {
                if (date('m', strtotime($data)) == $mes && date('Y', strtotime($data)) == $ano) {
                    $feriados[] = $data;
                }
            }
        }

        // 3. Buscar datas de feriados DESLIGADOS (ativo = 0) para poder excluir
        //    móveis nacionais que o Superadmin desativou manualmente.
        //    Sem isso, o algoritmo de Páscoa re-injetaria Carnaval/Sexta-Santa/Corpus
        //    ignorando o switcher.
        $desligados = $this->getDatasFeriadosDesligados($ano, $empresaId);

        // 4. Adicionar feriados móveis nacionais automaticamente (exceto os desligados)
        $moveis = $this->getFeriadosMoveis($ano);
        foreach ($moveis as $m) {
            if (date('m', strtotime($m)) == $mes && !in_array($m, $desligados, true)) {
                $feriados[] = $m;
            }
        }

        return array_unique($feriados);
    }

    /**
     * Retorna as datas (YYYY-MM-DD, resolvidas para o ano alvo) de feriados
     * marcados como DESLIGADOS (ativo = 0) aplicáveis à empresa.
     *
     * Usado para excluir feriados móveis nacionais que o Superadmin desativou
     * pelo switcher — caso contrário o algoritmo de Páscoa os re-injetaria.
     *
     * @return string[] Lista de datas no formato YYYY-MM-DD
     */
    private function getDatasFeriadosDesligados(int $ano, int $empresaId): array
    {
        $sql = "
            SELECT data, recorrente FROM feriados
            WHERE ativo = 0
            AND (empresa_id = :empresa_id OR empresa_id IS NULL)
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':empresa_id' => $empresaId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $datas = [];
        foreach ($rows as $r) {
            if ($r['recorrente']) {
                // Recorrente: resolve dia/mês para o ano alvo
                $datas[] = (string)$ano . '-' . date('m-d', strtotime($r['data']));
            } else {
                $datas[] = $r['data'];
            }
        }
        return $datas;
    }

    /**
     * Algoritmo de Páscoa para calcular feriados móveis brasileiros
     */
    private function getFeriadosMoveis(int $ano): array
    {
        // easter_date() funciona até 2037 em sistemas 32 bits, seguro para HostGator/PHP 7.4+
        $pascoaTimestamp = easter_date($ano);
        $pascoa = date('Y-m-d', $pascoaTimestamp);
        
        $carnaval      = date('Y-m-d', strtotime("$pascoa -47 days"));
        $sextaSanta    = date('Y-m-d', strtotime("$pascoa -2 days"));
        $corpusChristi = date('Y-m-d', strtotime("$pascoa +60 days"));
        
        return [$pascoa, $carnaval, $sextaSanta, $corpusChristi];
    }

    /**
     * Retorna os dias úteis do mês a partir de uma competência.
     *
     * Dias úteis = total de dias do mês menos domingos e feriados nacionais.
     *
     * @param int $competenciaId
     * @param int $empresaId
     * @return array {
     *   dias_uteis: int,
     *   dias_dsr:   int,
     *   mes:        int,
     *   ano:        int
     * }|null  Retorna null se a competência não for encontrada.
     */
    public function calcularDiasUteisMes(int $competenciaId, int $empresaId = 1): ?array
    {
        $comp = $this->getCompetencia($competenciaId, $empresaId);
        if (!$comp) return null;

        $calendario = $this->getDiasMes((int)$comp['mes'], (int)$comp['ano'], $empresaId);

        return [
            'dias_uteis' => $calendario['dias_uteis'],
            'dias_dsr'   => $calendario['dias_dsr'],
            'mes'        => (int)$comp['mes'],
            'ano'        => (int)$comp['ano'],
        ];
    }

    /**
     * Retorna os dias de DSR do mês a partir de uma competência.
     *
     * Dias DSR = quantidade de domingos + feriados nacionais do mês.
     *
     * @param int $competenciaId
     * @return array {
     *   dias_dsr:   int,
     *   dias_uteis: int,
     *   mes:        int,
     *   ano:        int
     * }|null  Retorna null se a competência não for encontrada.
     */
    public function calcularDiasDSRMes(int $competenciaId): ?array
    {
        // Internamente idêntico a calcularDiasUteisMes — exposto separadamente
        // por clareza semântica e para facilitar chamadas isoladas.
        return $this->calcularDiasUteisMes($competenciaId);
    }

    /**
     * Busca mes e ano de uma competência pelo ID e Empresa.
     * Helper privado compartilhado pelos métodos de calendário.
     */
    private function getCompetencia(int $competenciaId, int $empresaId = 1): ?array
    {
        $stmt = $this->conn->prepare("SELECT mes, ano FROM competencias WHERE id = ? AND id_empresa = ?");
        $stmt->execute([$competenciaId, $empresaId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Busca as faltas que fazem o funcionário perder o DSR na competência.
     *
     * Consulta a tabela dsr_faltas_pre_dsr, que é populada durante o pré-processamento
     * (registrarFalta) sempre que uma falta justificada ou injustificada é identificada.
     *
     * @param int $funcionarioId
     * @param int $competenciaId
     * @return array {
     *   total_faltas:  int,           // Quantidade de faltas que causam perda de DSR
     *   datas_faltas:  string[],      // Datas individuais no formato YYYY-MM-DD
     * }
     */
    public function buscarFaltasQuePerdemDSR(int $funcionarioId, int $competenciaId): array
    {
        $stmt = $this->conn->prepare(
            "SELECT data_falta
             FROM dsr_faltas_pre_dsr
             WHERE funcionario_id = :funcionario_id
               AND competencia_id = :competencia_id
             ORDER BY data_falta"
        );
        $stmt->execute([
            ':funcionario_id' => $funcionarioId,
            ':competencia_id' => $competenciaId,
        ]);

        $datas = $stmt->fetchAll(PDO::FETCH_COLUMN);

        return [
            'total_faltas' => count($datas),
            'datas_faltas' => $datas,
        ];
    }

    /**
     * Processa o DSR de todos os funcionarios sinalizados para aquela competencia
     */
    public function processarFilaCompetencia(int $competenciaId, string $usuario = 'sistema', int $empresaId = 0): array
    {
        $sql = "SELECT funcionario_id FROM dsr_fila_recalculo WHERE competencia_id = ? AND id_empresa = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$competenciaId, $empresaId]);
        
        $funcionarios = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $processados = 0;
        
        foreach ($funcionarios as $func_id) {
            $this->calcular((int)$func_id, $competenciaId, $usuario, $empresaId);
            $processados++;
            
            // Remove da fila
            $del = $this->conn->prepare("DELETE FROM dsr_fila_recalculo WHERE funcionario_id = ? AND competencia_id = ?");
            $del->execute([$func_id, $competenciaId]);
        }
        
        return [
            "success" => true,
            "message" => "Processou $processados calculos pendentes de DSR."
        ];
    }

    /**
     * Calcula e persiste o DSR para um único funcionário na competência.
     *
     * Algoritmo (conforme especificação):
     *   1. base_dsr       = soma dos lançamentos de eventos configurados em dsr_config_eventos
     *   2. dias_uteis     = dias do mês exceto domingos e feriados nacionais
     *   3. dias_dsr       = domingos + feriados nacionais do mês
     *   4. faltas         = registros em dsr_faltas_pre_dsr
     *   5. dias_dsr_final = max(dias_dsr - faltas, 0)
     *   6. valor_dsr      = (base_dsr / dias_uteis) * dias_dsr_final
     *
     * Persiste em dsr_calculado via UPSERT e grava memória de cálculo.
     *
     * @param int    $funcionarioId
     * @param int    $competenciaId
     * @param string $usuario       Identificador do responsável pelo cálculo
     * @return array{
     *   valor_dsr:      float,
     *   base_dsr:       float,
     *   dias_uteis:     int,
     *   dias_dsr:       int,
     *   faltas:         int,
     *   dias_dsr_final: int,
     *   memoria_calculo: string
     * }|null  Null se competência ou funcionário não forem encontrados.
     */
    public function calcularDSR(int $funcionarioId, int $competenciaId, string $usuario = 'sistema', int $empresaId = 1): ?array
    {
        // ── 1. Base monetária DSR ─────────────────────────────────────────────
        $baseResult = $this->calcularBaseDSR($funcionarioId, $competenciaId);
        $baseDsr    = $baseResult['base_dsr'];

        // ── 2 e 3. Calendário do mês ──────────────────────────────────────────
        $calendario = $this->calcularDiasUteisMes($competenciaId, $empresaId);
        if ($calendario === null) return null;          // Competência inexistente

        $diasUteis = $calendario['dias_uteis'];
        $diasDsr   = $calendario['dias_dsr'];
        $mes       = $calendario['mes'];
        $ano       = $calendario['ano'];

        // ── 4. Faltas que fazem perder DSR ───────────────────────────────────
        $faltasResult = $this->buscarFaltasQuePerdemDSR($funcionarioId, $competenciaId);
        $faltas       = $faltasResult['total_faltas'];
        $datasFaltas  = $faltasResult['datas_faltas'];

        // ── 5. Dias DSR final ─────────────────────────────────────────────────
        $diasDsrFinal = max($diasDsr - $faltas, 0);

        // ── 6. Valor DSR (evita divisão por zero) ─────────────────────────────
        $valorDsr = 0.0;
        if ($diasUteis > 0) {
            $valorDsr = ($baseDsr / $diasUteis) * $diasDsrFinal;
        }
        $valorDsr = round($valorDsr, 2);

        // ── 7. Memória de cálculo (texto legível + JSON estruturado) ──────────
        $memoriaTexto = sprintf(
            "BASE DSR: R$ %.2f | Dias Úteis: %d | Dias DSR: %d | Faltas: %d | " .
            "Dias DSR Final: %d | VALOR DSR: R$ %.2f | " .
            "Fórmula: (%.2f / %d) × %d = %.2f",
            $baseDsr, $diasUteis, $diasDsr, $faltas,
            $diasDsrFinal, $valorDsr,
            $baseDsr, $diasUteis, $diasDsrFinal, $valorDsr
        );

        $memoriaJson = [
            'base_dsr'       => $baseDsr,
            'por_tipo'       => $baseResult['por_tipo'],
            'calendario'     => compact('mes', 'ano', 'diasUteis', 'diasDsr'),
            'faltas'         => ['total' => $faltas, 'datas' => $datasFaltas],
            'dias_dsr_final' => $diasDsrFinal,
            'formula'        => '(' . (string)$baseDsr . ' / ' . (string)$diasUteis . ') × ' . (string)$diasDsrFinal . ' = ' . (string)$valorDsr,
            'valor_dsr'      => $valorDsr,
            'calculado_em'   => date('Y-m-d H:i:s'),
            'calculado_por'  => $usuario,
        ];

        // ── 8. Persistir em dsr_calculado (UPSERT) ───────────────────────────
        // Cobre exatamente os campos da especificação:
        //   funcionario_id, competencia_id, mes, ano,
        //   dias_uteis_mes, dias_dsr_mes, faltas_pre_dsr_qtd,
        //   dsr_bruto, dsr_desconto_faltas, dsr_liquido,
        //   memoria_calculo, calculado_em
        $upsert = "
            INSERT INTO dsr_calculado (
                funcionario_id, competencia_id, mes, ano,
                dias_uteis_mes, dias_dsr_mes, faltas_pre_dsr_qtd,
                dsr_horas_extras, dsr_comissoes, dsr_horista,
                dsr_bruto, dsr_desconto_faltas, dsr_liquido,
                memoria_calculo, calculado_em, calculado_por
            ) VALUES (
                :func_id, :comp_id, :mes, :ano,
                :dias_uteis, :dias_dsr, :faltas,
                :dsr_he, :dsr_com, 0,
                :bruto, :desconto, :liquido,
                :memoria, NOW(), :usuario
            )
            ON DUPLICATE KEY UPDATE
                dias_uteis_mes       = VALUES(dias_uteis_mes),
                dias_dsr_mes         = VALUES(dias_dsr_mes),
                faltas_pre_dsr_qtd   = VALUES(faltas_pre_dsr_qtd),
                dsr_horas_extras     = VALUES(dsr_horas_extras),
                dsr_comissoes        = VALUES(dsr_comissoes),
                dsr_bruto            = VALUES(dsr_bruto),
                dsr_desconto_faltas  = VALUES(dsr_desconto_faltas),
                dsr_liquido          = VALUES(dsr_liquido),
                memoria_calculo      = VALUES(memoria_calculo),
                calculado_em         = NOW(),
                calculado_por        = VALUES(calculado_por)
        ";

        // Distribui a base proporcionalmente para os campos de detalhe
        $dsrHe  = round(($baseResult['por_tipo']['horas_extras'] ?? 0) / max($diasUteis, 1) * $diasDsrFinal, 2);
        $dsrCom = round(
            (($baseResult['por_tipo']['comissao'] ?? 0) + ($baseResult['por_tipo']['producao'] ?? 0))
            / max($diasUteis, 1) * $diasDsrFinal,
            2
        );

        // Desconto por falta = diferença entre DSR sem desconto e valor final
        $dsrSemDesconto = $diasUteis > 0 ? round(($baseDsr / $diasUteis) * $diasDsr, 2) : 0.0;
        $desconto       = round($dsrSemDesconto - $valorDsr, 2);

        $stmt = $this->conn->prepare($upsert);
        $stmt->execute([
            ':func_id'  => $funcionarioId,
            ':comp_id'  => $competenciaId,
            ':mes'      => $mes,
            ':ano'      => $ano,
            ':dias_uteis' => $diasUteis,
            ':dias_dsr'   => $diasDsr,
            ':faltas'     => $faltas,
            ':dsr_he'     => $dsrHe,
            ':dsr_com'    => $dsrCom,
            ':bruto'      => $dsrSemDesconto,
            ':desconto'   => $desconto,
            ':liquido'    => $valorDsr,
            ':memoria'    => json_encode($memoriaJson, JSON_UNESCAPED_UNICODE),
            ':usuario'    => $usuario,
        ]);

        // ── 9. Lançar evento DSR na folha (antes de INSS/IRRF) ───────────────
        $this->lancarEventoDSR($funcionarioId, $competenciaId, $valorDsr, $empresaId);

        // ── 10. Retorno estruturado ────────────────────────────────────────────
        return [
            'valor_dsr'       => $valorDsr,
            'base_dsr'        => $baseDsr,
            'dias_uteis'      => $diasUteis,
            'dias_dsr'        => $diasDsr,
            'faltas'          => $faltas,
            'dias_dsr_final'  => $diasDsrFinal,
            'memoria_calculo' => $memoriaTexto,
        ];
    }

    /**
     * Calcula o DSR para um unico funcionario
     * @deprecated Prefira calcularDSR() que usa os helpers isolados e memória de cálculo estruturada.
     */
    public function calcular(int $funcionarioId, int $competenciaId, string $usuario, int $empresaId): ?array
    {
        // Pega config da competencia
        $stmt = $this->conn->prepare("SELECT mes, ano FROM competencias WHERE id = ?");
        $stmt->execute([$competenciaId]);
        $comp = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$comp) return null;
        
        $mes = (int)$comp['mes'];
        $ano = (int)$comp['ano'];
        
        $calendario = $this->getDiasMes($mes, $ano);
        $diasUteis = $calendario['dias_uteis'];
        $diasDsr = $calendario['dias_dsr'];
        
        // Pega a config de Funcionario (se tem salario_hora ou etc)
        $stmtF = $this->conn->prepare("SELECT tipo_contrato, salario_hora FROM funcionarios WHERE id = ?");
        $stmtF->execute([$funcionarioId]);
        $funcionario = $stmtF->fetch(PDO::FETCH_ASSOC);
        if (!$funcionario) return null;

        // Faltas pre-DSR (que perdem o DSR do dia)
        $stmtFaltas = $this->conn->prepare("SELECT COUNT(*) FROM dsr_faltas_pre_dsr WHERE funcionario_id = ? AND competencia_id = ?");
        $stmtFaltas->execute([$funcionarioId, $competenciaId]);
        $qtdFaltasPreDsr = (int)$stmtFaltas->fetchColumn();

        // Faz os recaps de HE e Comissao
        $sqlLancamentos = "
            SELECT le.evento_id, le.valor_total, dce.tipo_dsr
            FROM lancamentos_eventos le 
            INNER JOIN dsr_config_eventos dce ON dce.evento_id = le.evento_id
            WHERE le.funcionario_id = ? AND le.competencia_id = ? AND dce.ativo = 1
        ";
        $stmtLanc = $this->conn->prepare($sqlLancamentos);
        $stmtLanc->execute([$funcionarioId, $competenciaId]);
        $bases = $stmtLanc->fetchAll(PDO::FETCH_ASSOC);
        
        $totalHe = 0;
        $totalComissao = 0;
        
        foreach ($bases as $base) {
            if ($base['tipo_dsr'] === 'horas_extras') {
                $totalHe += (float)$base['valor_total'];
            } elseif ($base['tipo_dsr'] === 'comissao' || $base['tipo_dsr'] === 'producao') {
                $totalComissao += (float)$base['valor_total'];
            }
        }
        
        // Calculos baseados na formula: (Base / Dias Uteis) * Dias DSR
        $dsrHe = 0;
        $dsrComissoes = 0;
        
        // Evitar divisao por zero caso $diasUteis for = 0 (mes bugado/irreal)
        if ($diasUteis > 0) {
            $dsrHe = ($totalHe / $diasUteis) * $diasDsr;
            $dsrComissoes = ($totalComissao / $diasUteis) * $diasDsr;
        }

        // Horista
        $dsrHorista = 0;
        // Na regra Horista, geralmente as horas normais lançadas tbm rendem DSR
        // (Seria (Horas * Valor) / DiasUteis * DiasDSR, mas aqui depende do que foi lancado em evento basico,
        // mas para o escopo v1, se houver salario_hora configurado podemos injetar ali)
        
        $dsrTotalBruto = round($dsrHe + $dsrComissoes + $dsrHorista, 2);
        
        // Desconto por Falta pré-DSR
        $descontoFalta = 0;
        if ($qtdFaltasPreDsr > 0 && $diasDsr > 0) {
            $descontoFalta = ($dsrTotalBruto / $diasDsr) * $qtdFaltasPreDsr;
        }
        $descontoFalta = round($descontoFalta, 2);
        
        $dsrLiquido = round($dsrTotalBruto - $descontoFalta, 2);
        
        $memoriaCalculo = [
            'calendario' => compact('diasUteis', 'diasDsr'),
            'inputs' => compact('totalHe', 'totalComissao', 'qtdFaltasPreDsr'),
            'calculos' => [
                'he' => "$totalHe / $diasUteis * $diasDsr = ".round($dsrHe,2),
                'comissoes' => "$totalComissao / $diasUteis * $diasDsr = ".round($dsrComissoes,2),
                'desconto' => "$dsrTotalBruto / $diasDsr * $qtdFaltasPreDsr = ".round($descontoFalta,2)
            ]
        ];

        // Se o valor de dsr total e os totais de base forem todos zeros, talvez n tenha mais DSR p/ pagar.
        // Fica a criterio de upsert ou delete
        
        $upsert = "
            INSERT INTO dsr_calculado (
                funcionario_id, competencia_id, mes, ano, 
                dias_uteis_mes, dias_dsr_mes, faltas_pre_dsr_qtd, 
                dsr_horas_extras, dsr_comissoes, dsr_horista, 
                dsr_bruto, dsr_desconto_faltas, dsr_liquido, memoria_calculo, calculado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                dias_uteis_mes=VALUES(dias_uteis_mes), dias_dsr_mes=VALUES(dias_dsr_mes),
                faltas_pre_dsr_qtd=VALUES(faltas_pre_dsr_qtd), dsr_horas_extras=VALUES(dsr_horas_extras),
                dsr_comissoes=VALUES(dsr_comissoes), dsr_horista=VALUES(dsr_horista),
                dsr_bruto=VALUES(dsr_bruto), dsr_desconto_faltas=VALUES(dsr_desconto_faltas),
                dsr_liquido=VALUES(dsr_liquido), memoria_calculo=VALUES(memoria_calculo),
                calculado_em=CURRENT_TIMESTAMP, calculado_por=VALUES(calculado_por)
        ";
        
        $stmtP = $this->conn->prepare($upsert);
        $stmtP->execute([
            $funcionarioId, $competenciaId, $mes, $ano,
            $diasUteis, $diasDsr, $qtdFaltasPreDsr,
            round($dsrHe,2), round($dsrComissoes,2), round($dsrHorista,2),
            $dsrTotalBruto, $descontoFalta, $dsrLiquido, json_encode($memoriaCalculo), $usuario
        ]);
        
        // --- 2. REGISTRAR O VALOR NO LANCAMENTO GERAL PARA O COMPONENTE GRID VE-LO ---
        // (Se fosse no padrão total do fluxo. Por equanto os dados ficarão em dsr_calculado 
        // e usaremos a API de DSR para puxar o painel para a modal/componente!)
        
        return [
            'funcionario_id' => $funcionarioId,
            'dsr_bruto' => $dsrTotalBruto,
            'dsr_liquido' => $dsrLiquido,
            'desconto' => $descontoFalta
        ];
    }
    
    public function getListByCompetencia(int $competenciaId, int $empresaId): array
    {
        $stmt = $this->conn->prepare("
            SELECT dc.*, f.nome as funcionario_nome
            FROM dsr_calculado dc
            JOIN funcionarios f ON f.id = dc.funcionario_id
            WHERE dc.competencia_id = ? AND f.id_empresa = ?
        ");
        $stmt->execute([$competenciaId, $empresaId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Lança (ou atualiza via UPSERT) o valor do DSR como evento PROVENTO na folha.
     *
     * Garante que o evento DSR exista em eventos_folha (auto-cria se ausente)
     * e insere/atualiza em lancamentos_eventos com origem='CALCULO'.
     *
     * @param int   $funcionarioId
     * @param int   $competenciaId
     * @param float $valorDsr       Valor líquido calculado por calcularDSR()
     * @param int   $empresaId
     */
    private function lancarEventoDSR(int $funcionarioId, int $competenciaId, float $valorDsr, int $empresaId): void
    {
        require_once 'config.php';
        require_once __DIR__ . '/../lib/PayrollConstants.php';

        // 1. Resolve o ID do evento DSR em eventos_folha pelo código
        $stmtEv = $this->conn->prepare(
            "SELECT id FROM eventos_folha WHERE codigo_evento = ? LIMIT 1"
        );
        $stmtEv->execute([PayrollConstants::EVENT_CODES['DSR']]);
        $eventoId = $stmtEv->fetchColumn();

        // Auto-cria o evento DSR caso o setup_db ainda não tenha sido re-executado
        if (!$eventoId) {
            $this->conn->prepare(
                "INSERT INTO eventos_folha
                    (codigo_evento, nome_evento, tipo, natureza, unidade,
                     incide_inss, incide_fgts, incide_irrf, obrigatorio, ordem_exportacao)
                 VALUES (?, 'DSR', 'CREDITO', 'PROVENTO', 'VALOR', 1, 1, 1, 1, 99)"
            )->execute([PayrollConstants::EVENT_CODES['DSR']]);
            $eventoId = (int)$this->conn->lastInsertId();
        }

        // 2. UPSERT em lancamentos_eventos (chave única: funcionario_id + competencia_id + evento_id)
        $this->conn->prepare(
            "INSERT INTO lancamentos_eventos
                (funcionario_id, competencia_id, evento_id, quantidade, valor_unitario, valor_total, id_empresa, origem)
             VALUES (?, ?, ?, 1, ?, ?, ?, 'CALCULO')
             ON DUPLICATE KEY UPDATE
                valor_unitario = VALUES(valor_unitario),
                valor_total    = VALUES(valor_total),
                origem         = 'CALCULO'"
        )->execute([$funcionarioId, $competenciaId, $eventoId, $valorDsr, $valorDsr, $empresaId]);
    }

    public function registrarFalta(int $funcionarioId, int $competenciaId, string $dataFalta): bool
    {
        $stmt = $this->conn->prepare("INSERT IGNORE INTO dsr_faltas_pre_dsr (funcionario_id, competencia_id, data_falta) VALUES (?, ?, ?)");
        $r = $stmt->execute([$funcionarioId, $competenciaId, $dataFalta]);
        
        // Repoe ele na fila
        $stmtFila = $this->conn->prepare("
            INSERT IGNORE INTO dsr_fila_recalculo (funcionario_id, competencia_id, id_empresa)
            SELECT id, ?, id_empresa FROM funcionarios WHERE id = ?
            ON DUPLICATE KEY UPDATE marcado_em = CURRENT_TIMESTAMP
        ");
        $stmtFila->execute([$competenciaId, $funcionarioId]);
        
        return $r;
    }

    /**
     * Retorna todos os evento_id ativos na tabela dsr_config_eventos.
     * Usado para identificar quais lançamentos entram na base de cálculo do DSR.
     *
     * @return array Array de ['evento_id' => int, 'tipo_dsr' => string]
     */
    public function buscarEventosQueGeramDSR(): array
    {
        $stmt = $this->conn->prepare(
            "SELECT evento_id, tipo_dsr
             FROM dsr_config_eventos
             WHERE ativo = 1
             ORDER BY tipo_dsr, evento_id"
        );
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Calcula a base monetária do DSR para um funcionário em uma competência.
     *
     * Soma os valor_total dos lançamentos cujos eventos estão ativos
     * em dsr_config_eventos, agrupados por tipo de DSR.
     *
     * @param int $funcionarioId
     * @param int $competenciaId
     * @return array {
     *   base_dsr: float,          // Total geral (soma de todos os tipos)
     *   por_tipo: array,          // Subtotais por tipo_dsr (horas_extras, comissao, producao)
     *   eventos_encontrados: int  // Quantidade de lançamentos que compõem a base
     * }
     */
    public function calcularBaseDSR(int $funcionarioId, int $competenciaId): array
    {
        $sql = "
            SELECT
                dce.tipo_dsr,
                SUM(le.valor_total) AS subtotal,
                COUNT(le.id)        AS qtd_lancamentos
            FROM lancamentos_eventos le
            INNER JOIN dsr_config_eventos dce
                ON dce.evento_id = le.evento_id
               AND dce.ativo = 1
            WHERE le.funcionario_id = :funcionario_id
              AND le.competencia_id = :competencia_id
            GROUP BY dce.tipo_dsr
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':funcionario_id' => $funcionarioId,
            ':competencia_id' => $competenciaId,
        ]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $baseDsr          = 0.0;
        $porTipo          = [];
        $eventosEncontrados = 0;

        foreach ($rows as $row) {
            $subtotal = (float) $row['subtotal'];
            $tipo     = $row['tipo_dsr'];

            $porTipo[$tipo]      = round($subtotal, 2);
            $baseDsr            += $subtotal;
            $eventosEncontrados += (int) $row['qtd_lancamentos'];
        }

        return [
            'base_dsr'            => round($baseDsr, 2),
            'por_tipo'            => $porTipo,
            'eventos_encontrados' => $eventosEncontrados,
        ];
    }
}

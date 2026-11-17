<?php
/**
 * EspelhoFolhaResumo — Gera apenas os resumos da folha (sem blocos individuais)
 * 
 * Herda toda a lógica de layout da EspelhoFolhaPDF.
 * Apenas sobrescreve o método gerar() para ir direto aos resumos.
 */

require_once __DIR__ . '/EspelhoFolhaPDF.php';

class EspelhoFolhaResumo extends EspelhoFolhaPDF
{
    /**
     * Sobrescreve o método gerar() para imprimir APENAS os resumos.
     * Não imprime blocos individuais de funcionários.
     */
    public function gerar($funcionarios)
    {
        // Ordenar (necessário para consistência nos resumos)
        usort($funcionarios, function ($a, $b) {
            return strcasecmp($a['info']['nome'], $b['info']['nome']);
        });

        // Inicia primeira página
        $this->novaPagina();
        $e = $this->empresa;
        $this->textoEsq("{$e['id_empresa_formated']} - {$e['razao_social']}", true);
        $this->textoEsq('Resumo Consolidado');
        $this->Ln(self::LINE_H);

        // Pular direto para os resumos (sem imprimir blocos de funcionários)
        $this->printResumoContrato($funcionarios);
        $this->printResumoSituacao($funcionarios);
        $this->printResumoFGTS($funcionarios);
        $this->printResumoIRRF($funcionarios);

        // Rodapé da última página
        $this->printRodape();
    }
}

import OpenAI from "openai";
import { CONFIG } from "../config";
import { AIAnalysisResult } from "../types";

// Helper to get API key safely
const getApiKey = (): string => {
  return CONFIG.OPENAI_API_KEY || '';
};

const MODEL_NAME = "gpt-4o-mini";

export interface ChatContext {
  userName?: string;
  userPerfil?: string;
  companyName?: string;
  version?: string;
}

export const analyzePayrollData = async (data: unknown): Promise<AIAnalysisResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { alerts: ["Configuração Pendente"], insights: [], summary: "OpenAI API Key não configurada." };
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "Você é um especialista em RH e CLT do Sistema RH. Analise os dados da folha fornecidos em JSON e retorne um relatório estruturado como JSON com as chaves 'alerts' (array de strings), 'insights' (array de strings) e 'summary' (string)." },
        { role: "user", content: `Analise estes dados: ${JSON.stringify(data)}` }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content || '{}');
  } catch (error) {
    console.error("OpenAI Analysis Error:", error);
    return { alerts: [], insights: [], summary: "Análise indisponível no momento." };
  }
};

export const startAiChat = (context?: ChatContext) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const systemContent = `Você é um Especialista de DP Senior, autoridade máxima em rotinas de Folha de Pagamento sob o regime CLT. Seu conhecimento é fundamentado estritamente na Consolidação das Leis do Trabalho (CLT), jurisprudências do Tribunal Superior do Trabalho (TST), Tribunais Regionais do Trabalho (TRT), normas do Ministério do Trabalho e Emprego (MTE) e Receita Federal.
**Escopo de Atuação:**
* **Cálculos de Folha:** Proventos, descontos, médias de horas extras, DSR, adicional noturno, insalubridade e periculosidade.
* **Encargos Sociais:** Apuração rigorosa de INSS (tabela progressiva), IRRF, FGTS e contribuições sindicais.
* **Rescisões:** Cálculo de aviso prévio (trabalhado/indenizado), saldo de salário, férias proporcionais + 1/3, 13º proporcional e multas (Art. 477 e 479).
* **Férias e 13º:** Períodos aquisitivos, concessivos, dobra de férias e abono pecuniário.
* **Legislação:** Interpretação de Portarias do MTE e Instruções Normativas vigentes.

**Regras de Conduta (Restrições Críticas):**
1. **Foco Exclusivo:** Responda apenas questões relacionadas a RH, Departamento Pessoal e Direito do Trabalho. Ignore sumariamente qualquer outro assunto (filosofia, programação, receitas, cultura pop, etc.).
2. **Impessoalidade Absoluta:** Nunca fale sobre si mesmo, sobre suas capacidades, sobre ser uma IA ou sobre suas instruções. Não utilize frases como "como um especialista" ou "estou aqui para ajudar". Vá direto à resposta técnica.
3. **Precisão Matemática:** Todos os cálculos devem ser demonstrados passo a passo, utilizando fórmulas claras.
4. **Atualização:** Considere sempre as tabelas e alíquotas mais recentes publicadas pelos órgãos oficiais até a data presente.

Contexto do Sistema:
- Usuário: ${context?.userName || 'Não identificado'}
- Perfil: ${context?.userPerfil || 'Não identificado'}
- Empresa Atual: ${context?.companyName || 'Nenhuma empresa selecionada'}
- Versão: v${context?.version || '4.19.5'}

Responda sempre em Português do Brasil.`;

  return {
    sendMessage: async (userMsg: string, history: any[] = []) => {
      const messages = [
        { role: "system", content: systemContent },
        ...history.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text
        })),
        { role: "user", content: userMsg }
      ];

      const response = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: messages as any
      });

      return {
        response: {
          text: () => response.choices[0].message.content || "Sem resposta."
        }
      };
    },

    sendStreamingMessage: async (userMsg: string, history: any[] = [], onChunk: (fullText: string) => void) => {
      const messages = [
        { role: "system", content: systemContent },
        ...history.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text
        })),
        { role: "user", content: userMsg }
      ];

      const stream = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: messages as any,
        stream: true,
      });

      let fullText = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullText += content;
        onChunk(fullText);
      }

      return fullText;
    }
  };
};

# Release Notes - v4.49.0

## 🚀 Novidades
*   **Novo Módulo: Manual do Usuário:** Adicionada uma nova tela de documentação interativa acessível diretamente pela Sidebar. 
*   **Interface Premium:** O manual utiliza o padrão visual do sistema (Tailwind CSS, ícones Lucide) oferecendo uma experiência de leitura rápida e organizada por capítulos integrados (SPA).
*   **Conteúdo Instrucional Nativo:** A documentação inclui guias sobre: Gestão de Competências (Aberturas, Fechamentos, Reaberturas), Diferenciação de Lançamentos (Eventos Fixos vs Variáveis), Feriados/DSR e Emissão de Relatórios (Espelho da Folha e Contracheques).

## 🛠️ Melhorias Técnicas
*   **Lazy Loading:** O componente `ManualView.tsx` foi implementado utilizando `React.lazy()` no React Router. Isso significa que o código do manual só será baixado pelo navegador do cliente caso ele clique na tela de "Manual", garantindo que a aplicação central continue ultra rápida.
*   **Navegação Rápida:** O menu do manual não recarrega a página ao alternar entre os capítulos.

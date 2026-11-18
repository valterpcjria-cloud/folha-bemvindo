// Helper para obter variáveis de ambiente do Vite
const getEnvVar = (key: string, fallback: string = ''): string => {
  return (import.meta as any).env?.[key] ?? fallback;
};

export const CONFIG = {
  SERVER_IP: 'bemvindo.luzitec.cnt.br',
  API_BASE_URL: '/backend/v1',

  // Alterado para FALSE pois o banco de dados já foi configurado com sucesso!
  IS_MOCK: false,

  TIMEOUT: 8000,

  OPENAI_API_KEY: getEnvVar('VITE_OPENAI_API_KEY', ''),

  API_URL: (import.meta as any).env?.VITE_API_URL || '/backend/v1',

  // App Version vinculada via Vite -> package.json
  VERSION: (import.meta as any).env?.VITE_APP_VERSION || '0.0.0',

  // Theme
};

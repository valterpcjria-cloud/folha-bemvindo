import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
// import AIChatAssistant from './components/AIChatAssistant'; // DESABILITADO TEMPORARIAMENTE

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        {/* <AIChatAssistant /> */}  {/* DESABILITADO TEMPORARIAMENTE */}
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

import { Navigate, Route, Routes } from 'react-router-dom'
import { AssistantChat } from './components/AssistantChat'
import { AdminRegisterPage } from './pages/AdminRegisterPage'
import { EmpresaQuadrasPage } from './pages/EmpresaQuadrasPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { InicioPage } from './pages/InicioPage'
import { LoginPage } from './pages/LoginPage'
import { ReservaQuadraPage } from './pages/ReservaQuadraPage'
import { RegisterPage } from './pages/RegisterPage'
import { UpdatePasswordPage } from './pages/UpdatePasswordPage'

function App() {
  const adminSignupPath =
    import.meta.env.VITE_ADMIN_SIGNUP_PATH?.trim() || '/_interno/admin-cadastro'

  return (
    <>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path={adminSignupPath} element={<AdminRegisterPage />} />
      <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
      <Route path="/atualizar-senha" element={<UpdatePasswordPage />} />
      <Route path="/inicio" element={<InicioPage />} />
      <Route path="/empresa/:empresa" element={<EmpresaQuadrasPage />} />
      <Route path="/empresa/:empresa/quadra/:quadraId/reservar" element={<ReservaQuadraPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    <AssistantChat />
    </>
  )
}

export default App

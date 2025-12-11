import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { registrarIngreso, registrarSalida } from './utils/analytics'
import LandingPage from './pages/LandingPage'
import LoginScreen from './pages/LoginScreen'
import RegistrationScreen from './pages/RegistrationScreen'
import DashboardScreen from './pages/DashboardScreen'
import AddPacienteScreen from './pages/AddPacienteScreen'
import ClientesScreen from './pages/ClientesScreen'
import EditPacienteScreen from './pages/EditPacienteScreen'
import PacienteDetailScreen from './pages/PacienteDetailScreen'
import OdontogramaScreen from './pages/OdontogramaScreen'
import MetricasScreen from './pages/MetricasScreen'
import ConfiguracionClinicaScreen from './pages/ConfiguracionClinicaScreen'
import ConfiguracionNotificacionesScreen from './pages/ConfiguracionNotificacionesScreen'
import PresupuestoScreen from './pages/PresupuestoScreen'
import RegistrarPagoScreen from './pages/RegistrarPagoScreen'
import CatalogoProcedimientosScreen from './pages/CatalogoProcedimientosScreen'
import CuentasPorCobrarScreen from './pages/CuentasPorCobrarScreen'
import CrearPlanPagoScreen from './pages/CrearPlanPagoScreen'
import PlanPagoDetailScreen from './pages/PlanPagoDetailScreen'
import CalendarioScreen from './pages/CalendarioScreen'
import CrearCitaScreen from './pages/CrearCitaScreen'
import CitaDetailScreen from './pages/CitaDetailScreen'
import GastosScreen from './pages/GastosScreen'
import HistorialProcedimientosScreen from './pages/HistorialProcedimientosScreen'
import HistorialFinancieroScreen from './pages/HistorialFinancieroScreen'
import TimelineUnificadoScreen from './pages/TimelineUnificadoScreen'
import ReportesScreen from './pages/ReportesScreen'
import PrivacidadPage from './pages/PrivacidadPage'
import TerminosPage from './pages/TerminosPage'
import ForgotPasswordScreen from './pages/ForgotPasswordScreen'
import ResetPasswordScreen from './pages/ResetPasswordScreen'
import MensajesEnviadosScreen from './pages/MensajesEnviadosScreen'
import RecordatoriosScreen from './pages/RecordatoriosScreen'
import BackupsScreen from './pages/BackupsScreen'
import ExportarDatosScreen from './pages/ExportarDatosScreen'
import PlanesScreen from './pages/PlanesScreen'
import HistorialPagosScreen from './HistorialPagosScreen'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // ============================================
  // TRACKING DE SESIONES
  // ============================================
  useEffect(() => {
    // Registrar ingreso solo si hay sesión activa
    if (session) {
      registrarIngreso()
    }

    // Registrar salida al cerrar/refrescar
    const handleBeforeUnload = () => {
      if (session) {
        registrarSalida()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (session) {
        registrarSalida()
      }
    }
  }, [session])

  // ============================================
  // AUTENTICACIÓN
  // ============================================
  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event)
      setSession(session)
      
      // Si es recuperación de contraseña, ir a reset-password
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password')
        return
      }
      
      // Cuando el usuario inicia sesión normalmente
      if (event === 'SIGNED_IN' && session) {
        // Solo redirigir al dashboard si NO es recuperación de contraseña
        const isPasswordRecovery = window.location.hash.includes('type=recovery')
        if (!isPasswordRecovery) {
          navigate('/dashboard')
        }
      }
      
      // Cuando cierra sesión
      if (event === 'SIGNED_OUT') {
        navigate('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🦷</div>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>Cargando OdontoLog...</div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* ==================== RUTAS PÚBLICAS ==================== */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacidad" element={<PrivacidadPage />} />
      <Route path="/terminos" element={<TerminosPage />} />
      
      {/* Login y Registro */}
      <Route 
        path="/login" 
        element={session ? <Navigate to="/dashboard" replace /> : <LoginScreen />} 
      />
      <Route 
        path="/register" 
        element={session ? <Navigate to="/dashboard" replace /> : <RegistrationScreen />} 
      />
      <Route 
        path="/registro" 
        element={session ? <Navigate to="/dashboard" replace /> : <RegistrationScreen />} 
      />
      <Route 
        path="/forgot-password" 
        element={<ForgotPasswordScreen />} 
      />
      <Route 
        path="/reset-password" 
        element={<ResetPasswordScreen />} 
      />

      {/* ==================== RUTAS PROTEGIDAS ==================== */}
      
      {/* Dashboard */}
      <Route 
        path="/dashboard" 
        element={session ? <DashboardScreen session={session} /> : <Navigate to="/login" replace />} 
      />

      {/* Pacientes */}
      <Route 
        path="/clientes" 
        element={session ? <ClientesScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/agregar-paciente" 
        element={session ? <AddPacienteScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/editar-paciente/:id" 
        element={session ? <EditPacienteScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/paciente/:id" 
        element={session ? <PacienteDetailScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/timeline/:id" 
        element={session ? <TimelineUnificadoScreen /> : <Navigate to="/login" replace />} 
      />

      {/* Odontograma */}
      <Route 
        path="/odontograma/:id" 
        element={session ? <OdontogramaScreen /> : <Navigate to="/login" replace />} 
      />

      {/* Calendario y Citas */}
      <Route 
        path="/calendario" 
        element={session ? <CalendarioScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/crear-cita" 
        element={session ? <CrearCitaScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/cita/:id" 
        element={session ? <CitaDetailScreen /> : <Navigate to="/login" replace />} 
      />

      {/* Financiero */}
      <Route 
        path="/presupuesto/:pacienteId" 
        element={session ? <PresupuestoScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/registrar-pago/:pacienteId" 
        element={session ? <RegistrarPagoScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/crear-plan-pago/:pacienteId" 
        element={session ? <CrearPlanPagoScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/plan-pago/:planId" 
        element={session ? <PlanPagoDetailScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/cuentas-por-cobrar" 
        element={session ? <CuentasPorCobrarScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/gastos" 
        element={session ? <GastosScreen /> : <Navigate to="/login" replace />} 
      />

      {/* Reportes e Historial */}
      <Route 
        path="/reportes" 
        element={session ? <ReportesScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/metricas" 
        element={session ? <MetricasScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/historial-procedimientos" 
        element={session ? <HistorialProcedimientosScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/historial-financiero" 
        element={session ? <HistorialFinancieroScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
      path="/recordatorios" 
      element={session ? <RecordatoriosScreen /> : <Navigate to="/login" replace />} 
      />
     
      <Route 
      path="/mensajes-enviados" 
            element={session ? <MensajesEnviadosScreen /> : <Navigate to="/login" replace />} 
      />

      {/* Configuración */}
      <Route 
        path="/configuracion" 
        element={session ? <ConfiguracionClinicaScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/configuracion-notificaciones" 
        element={session ? <ConfiguracionNotificacionesScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/catalogo-procedimientos" 
        element={session ? <CatalogoProcedimientosScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/catalogo" 
        element={session ? <CatalogoProcedimientosScreen /> : <Navigate to="/login" replace />} 
      />
      <Route 
      path="/backups"
       element={session ?  <BackupsScreen /> : <Navigate to="/login" replace />} 
       
      />
      <Route 
      path="/exportar" 
      element={session ? <ExportarDatosScreen />: <Navigate to="/login" replace />} 
      />
      <Route 
      path="/planes" 
      element={session ? <PlanesScreen />: <Navigate to="/login" replace />} 
      />
      <Route 
      path="/historial-pagos" 
      element={session ? <HistorialPagosScreen />: <Navigate to="/login" replace />} 
      />



      {/* Redirect cualquier ruta no existente */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
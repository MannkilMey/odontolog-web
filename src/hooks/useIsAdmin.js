export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      console.log('🔍 useIsAdmin: Verificando admin...')
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('🔍 useIsAdmin: Usuario obtenido:', user?.email)
      
      if (!user) {
        console.log('❌ useIsAdmin: No hay usuario')
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setUser(user)

      // Verificar si el email es el admin
      const isAdminUser = user.email === 'president@odontolog.lat'
      console.log('🔍 useIsAdmin: ¿Es admin?', isAdminUser)
      console.log('🔍 useIsAdmin: Comparación:', user.email, '===', 'president@odontolog.lat')
      
      setIsAdmin(isAdminUser)
      
    } catch (error) {
      console.error('❌ useIsAdmin: Error checking admin:', error)
      setIsAdmin(false)
    } finally {
      setLoading(false)
      console.log('🔍 useIsAdmin: Finalizado')
    }
  }

  return { isAdmin, loading, user }
}
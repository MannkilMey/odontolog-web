import prerender from 'vite-plugin-prerender'

export default {
  plugins: [
    prerender({
      routes: ['/', '/privacidad', '/terminos', '/login', '/registro']
    })
  ]
}
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Permite acessar de outro dispositivo na mesma rede (http://SEU_IP:5173)
    host: true,

  },
})

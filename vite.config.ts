
import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';

// Configuration for Vite
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente (incluindo as do arquivo .env)
  // O prefixo vazio '' permite ler variáveis como PORT sem o prefixo VITE_
  // Fixed: Added explicit import for 'process' to resolve TypeScript errors with 'process.cwd()'
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      port: Number(env.PORT) || 4000,
      host: true,
      strictPort: true,
    },
  };
});

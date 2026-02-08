import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Prioridade: Variável do Sistema > Arquivo .env > Padrão
  const port = Number(process.env.PORT || env.PORT) || 4000;
  const host = process.env.HOST || env.HOST || '0.0.0.0';

  console.log('\n---------------------------------------------------');
  console.log('⚔️  CRONISTAS DO REINO - PORTAL DE RPG ⚔️');
  console.log(`📡 Porta: ${port}`);
  console.log(`🌐 Host: ${host}`);
  console.log('---------------------------------------------------\n');
  
  return {
    define: {
      // Injeta a chave apenas se ela existir e não for o placeholder
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    server: {
      port: port,
      host: host,
      strictPort: true,
      allowedHosts: true
    },
    preview: {
      port: port,
      host: host,
      strictPort: true,
      allowedHosts: true
    }
  };
});
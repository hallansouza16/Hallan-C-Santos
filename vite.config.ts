
import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';

// Configuração para o servidor Vite do Cronistas do Reino
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente (incluindo as do arquivo .env)
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.PORT) || 4000;
  const host = 'localhost';

  // Log de inicialização customizado para o desenvolvedor
  console.log('\n---------------------------------------------------');
  console.log('⚔️  CRONISTAS DO REINO - INICIALIZANDO PORTAL ⚔️');
  console.log(`📡 Porta configurada: ${port}`);
  console.log(`🌐 Domínio local: http://${host}:${port}`);
  console.log('---------------------------------------------------\n');
  
  return {
    server: {
      port: port,
      host: true,
      strictPort: true,
    },
  };
});

# Instalar a aba Metas no MeuSaldo

## 1. Banco de dados (obrigatório)

1. Abra o projeto Supabase conectado ao MeuSaldo.
2. Entre em **SQL Editor** e crie uma consulta nova.
3. Abra `supabase/migrations/20261115_goals_items.sql`, copie todo o conteúdo e cole no editor.
4. Clique em **Run** e confirme que terminou sem erro.
5. No Table Editor, confira se `public.goals_items` apareceu.

O arquivo `supabase/schema.sql` também contém o mesmo SQL ao final, para novas instalações. Não é necessário executar o schema inteiro em um banco que já está em produção; execute apenas a migration acima.

## 2. Código da aplicação

O ZIP contém o projeto MeuSaldo completo, com a rota `/metas`, a API `/api/amazon-preview`, navegação desktop/mobile, estilos claro/escuro e a migration. Substitua os arquivos do repositório pelo conteúdo do projeto e envie um commit para a branch de produção conectada à Vercel.

O pacote não inclui `.env.local`, tokens ou chaves secretas. A implantação existente da Vercel deve continuar usando as variáveis de ambiente já configuradas.

## 3. Verificações

- Acesse `/metas` após o deploy e faça login.
- Adicione um item manualmente, altere a quantidade, marque como comprado e exclua um item de teste.
- Teste um link Amazon; se a Amazon bloquear a extração, os campos manuais continuam disponíveis.
- Abra a mesma conta em outro dispositivo para confirmar as atualizações em tempo real.

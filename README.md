# MeuSaldo — Controle Financeiro PWA

Aplicativo de controle financeiro pessoal em português (PT-BR), com Next.js App Router, TypeScript, Tailwind CSS v4, Supabase (PostgreSQL, Auth e Realtime), Recharts e instalação como PWA.

> **Ambiente Supabase provisionado:** o projeto `controle-financeiro-pwa` já foi criado na região `sa-east-1`, e a migração `initial_finance_schema` já foi aplicada e verificada. O arquivo `.env.local` incluído neste pacote está preenchido para executar localmente. A chave nele é uma chave publicável do Supabase, própria para uso no frontend; nenhuma chave `service_role` está incluída.

- Painel Supabase: https://supabase.com/dashboard/project/oysdlglgwvrhhhmssiva
- URL do projeto: https://oysdlglgwvrhhhmssiva.supabase.co
- Realtime verificado para `public.transactions`; RLS ativo nas duas tabelas.

## Funcionalidades implementadas

- Cadastro e login por e-mail e senha com Supabase Auth.
- Middleware que atualiza a sessão e protege as rotas privadas.
- Dashboard com saldo acumulado de lançamentos pagos, receitas e despesas do mês, filtro de mês, gráfico de despesas por categoria, comparativo de seis meses e movimentações recentes.
- Cadastro, edição e exclusão de receitas/despesas, com valor em Real, categoria, data e status pago/pendente.
- Filtros de texto, tipo, status e mês na tela de transações.
- Cadastro, edição e exclusão de categorias com tipo, cor e ícone.
- Categorias iniciais criadas automaticamente no cadastro de cada usuário.
- RLS e chaves estrangeiras compostas para manter os dados isolados por usuário e impedir associação de categoria de outro usuário.
- Supabase Realtime: alterações na tabela `transactions` atualizam as telas abertas sem recarregar manualmente.
- Layout responsivo: sidebar no desktop, menu lateral e navegação inferior no celular, cards para transações em telas pequenas.
- Modo claro/escuro, manifest, ícones e service worker instalável.

## Requisitos

- Node.js 20.9 ou superior (recomendado Node.js 22 LTS).
- npm 10 ou superior.
- Conta Supabase e um projeto Supabase.

## 1. Supabase já provisionado

O Supabase já foi criado e configurado para este projeto. Não é necessário criar outro projeto nem executar novamente o SQL no banco existente.

- Projeto: `controle-financeiro-pwa`
- Região: São Paulo (`sa-east-1`)
- Project reference: `oysdlglgwvrhhhmssiva`
- Painel: https://supabase.com/dashboard/project/oysdlglgwvrhhhmssiva

A migração `initial_finance_schema` foi aplicada. Foram verificadas as tabelas `categories` e `transactions`, as políticas RLS, o trigger de categorias padrão e a publicação Realtime de `transactions`. Também foi criado um índice cobrindo a chave estrangeira composta da categoria nas transações. O arquivo `supabase/schema.sql` permanece no projeto para reprodução em outro ambiente.

Em **Authentication → URL Configuration**, mantenha `http://localhost:3000` permitido para desenvolvimento local. Quando houver domínio de produção, defina-o como Site URL e adicione-o às Redirect URLs. O provedor Email deve permanecer habilitado. Se a confirmação de e-mail estiver habilitada, será necessário confirmar o endereço antes do primeiro login.

## 2. Configurar as variáveis locais

O pacote já inclui `.env.local` configurado para o projeto Supabase criado. Não o envie ao GitHub; ele está ignorado pelo `.gitignore`. Para substituir as credenciais em outro ambiente, copie `.env.example` e preencha os valores publicáveis correspondentes:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON
```

As variáveis são públicas por definição (`NEXT_PUBLIC_`). Use somente a chave pública/anon no frontend. **Nunca coloque `service_role`, senhas de banco ou segredos administrativos em variáveis `NEXT_PUBLIC_`.**

## 3. Instalar e executar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Crie uma conta pela tela de acesso e entre no dashboard.

Para validar antes de publicar:

```bash
npm run typecheck
npm run lint
npm run build
```

## 4. Publicar na Vercel

1. Envie este diretório para um repositório Git.
2. Na Vercel, importe o repositório e mantenha o framework como Next.js.
3. Em **Settings → Environment Variables**, configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Production (e Preview, se necessário).
4. Faça o deploy.
5. No Supabase, em **Authentication → URL Configuration**, atualize a Site URL e as Redirect URLs para o domínio publicado (por exemplo `https://seu-app.vercel.app/**`).
6. Teste cadastro, login, inserção e edição em dois dispositivos/navegadores para confirmar o Realtime.

## 5. Instalação como aplicativo (PWA)

- **Android/Chrome:** abra o domínio publicado, use o menu do navegador e escolha **Instalar app** ou **Adicionar à tela inicial**.
- **Desktop/Chrome/Edge:** use o ícone de instalação na barra de endereço ou o menu do navegador.
- **iPhone/iPad:** abra o site no Safari, toque em Compartilhar e escolha **Adicionar à Tela de Início**.

O service worker armazena recursos estáticos e mostra uma tela de indisponibilidade quando não há conexão. Os lançamentos e gráficos dependem de conexão com o Supabase; não há edição offline nem fila de sincronização offline nesta versão.

## Estrutura principal

```text
app/
  (dashboard)/             # Rotas privadas
    page.tsx               # Dashboard
    transacoes/page.tsx    # Gestão de transações
    categorias/page.tsx    # Gestão de categorias
  login/page.tsx           # Login e cadastro
components/
  auth/                    # Formulário de autenticação
  categories/              # CRUD de categorias
  dashboard/               # Dashboard e gráficos
  layout/                  # Shell, tema e PWA
  transactions/            # CRUD e listagem de transações
hooks/use-finance-data.ts  # Busca, estado e subscription Realtime
lib/supabase/              # Clientes browser/server e sessão
lib/utils/                 # Formatação e utilitários financeiros
public/                    # Manifest, service worker e ícones PWA
supabase/schema.sql        # Estrutura SQL, RLS, trigger e Realtime
types/finance.ts           # Tipos de domínio
```

## Regras importantes

- O saldo atual é calculado como receitas pagas menos despesas pagas em todo o histórico.
- Os cards de receitas e despesas do dashboard mostram os totais pagos do mês selecionado. Lançamentos pendentes aparecem nas listagens, mas não alteram o saldo.
- O gráfico por categoria e o comparativo de seis meses consideram os lançamentos cadastrados no período, independentemente do status.
- Uma categoria vinculada a transações não pode ser excluída. Primeiro edite ou exclua as transações que a utilizam.
- Cada usuário só acessa seus próprios registros graças às políticas RLS no banco; filtros no frontend não são usados como mecanismo de segurança.

## Observações de ambiente

O banco Supabase deste projeto já está provisionado e conectado ao `.env.local` incluído no pacote. O arquivo `.env.local` não deve ser enviado ao GitHub; configure as variáveis separadamente na Vercel ao publicar. Não há chave `service_role`, senhas de banco, contas de usuário ou dados pessoais neste pacote. A build ainda precisa ser validada em um ambiente com acesso ao registro npm, pois a instalação de dependências neste ambiente expirou por timeout.

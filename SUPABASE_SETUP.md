# Configuração do Supabase

Para que a integração com o Supabase funcione corretamente, siga os passos abaixo:

## 1. Ajustar a Tabela no Supabase

Se você já criou a tabela `ia_records`, execute este SQL para garantir que todas as colunas necessárias existam. O sistema utiliza uma coluna `data` (JSONB) para guardar o estado completo e colunas individuais para facilitar a visualização no dashboard do Supabase.

Abra o **SQL Editor** e execute:

```sql
-- Garantir que a tabela existe
create table if not exists ia_records (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Perfis de Usuário
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  full_name text,
  avatar_url text,
  cargo text,
  setor text,
  contato text
);

-- Tabela de Mensagens (Chat)
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  sender_id uuid references profiles(id) not null, -- Referência a profiles(id)
  content text not null,
  is_private boolean default false,
  recipient_id uuid references profiles(id) -- Referência a profiles(id)
);

-- SE VOCÊ RECEBER O ERRO PGRST200 (Relationship not found), execute estes comandos:
-- alter table messages drop constraint if exists messages_sender_id_fkey;
-- alter table messages add constraint messages_sender_id_fkey foreign key (sender_id) references profiles(id);
-- alter table messages drop constraint if exists messages_recipient_id_fkey;
-- alter table messages add constraint messages_recipient_id_fkey foreign key (recipient_id) references profiles(id);

-- IMPORTANTE: Habilitar Realtime para a tabela de mensagens
-- Sem isso, as mensagens só aparecerão ao atualizar a página.
-- Execute isto no SQL Editor do Supabase:
alter publication supabase_realtime add table messages;

-- CONFIGURAÇÃO PARA UPLOAD DE FOTOS (STORAGE)
-- 1. Vá em 'Storage' no painel do Supabase.
-- 2. Crie um novo bucket chamado 'avatars'.
-- 3. Marque o bucket como 'Public' (Público).
-- 4. Execute estas políticas no SQL Editor para permitir uploads:

-- Permitir que qualquer usuário autenticado faça upload para o bucket avatars
create policy "Avatar Upload" on storage.objects for insert with check (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- Permitir que usuários atualizem seus próprios avatares
create policy "Avatar Update" on storage.objects for update with check (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- Permitir que todos visualizem os avatares (bucket público)
create policy "Avatar View" on storage.objects for select using (
  bucket_id = 'avatars'
);

-- Habilitar RLS para Perfis
alter table profiles enable row level security;
create policy "Perfis são visíveis para todos os usuários autenticados" on profiles for select using (true);
create policy "Usuários podem atualizar seus próprios perfis" on profiles for update using (auth.uid() = id);
create policy "Inserção automática de perfil via trigger ou manual" on profiles for insert with check (auth.uid() = id);

-- Habilitar RLS para Mensagens
alter table messages enable row level security;
create policy "Mensagens públicas visíveis para todos" on messages for select 
  using (not is_private or auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Qualquer usuário autenticado pode enviar mensagens" on messages for insert 
  with check (auth.uid() = sender_id);

-- Sugestão: Limpeza Automática de Mensagens (24h)
-- Nota: Para automação em background real no Supabase, você pode usar a extensão pg_cron se disponível:
-- select cron.schedule('limpar-mensagens-24h', '0 * * * *', $$ delete from messages where created_at < now() - interval '24 hours' $$);
-- A aplicação também realiza uma limpeza "lazy" ao abrir o chat.

-- Adicionar colunas extras se não existirem (sem restrição NOT NULL para flexibilidade)
alter table ia_records add column if not exists data jsonb;
alter table ia_records add column if not exists unidade_setor text;
alter table ia_records add column if not exists responsavel_preenchimento text;
alter table ia_records add column if not exists cargo text;
alter table ia_records add column if not exists data_registro date;
alter table ia_records add column if not exists utiliza_ia text;
alter table ia_records add column if not exists nome_ferramenta text;
alter table ia_records add column if not exists fornecedor text;
alter table ia_records add column if not exists status_uso text;
alter table ia_records add column if not exists classificacao_risco text;

-- Se as colunas já existirem com NOT NULL, remova a restrição (executar se persistir erro)
alter table ia_records alter column unidade_setor drop not null;
alter table ia_records alter column responsavel_preenchimento drop not null;
alter table ia_records alter column cargo drop not null;
alter table ia_records alter column data_registro drop not null;
alter table ia_records alter column utiliza_ia drop not null;
alter table ia_records alter column nome_ferramenta drop not null;
alter table ia_records alter column fornecedor drop not null;
alter table ia_records alter column status_uso drop not null;
alter table ia_records alter column classificacao_risco drop not null;

-- Habilitar Row Level Security (RLS)
alter table ia_records enable row level security;

-- Criar política de acesso público (Leitura)
drop policy if exists "Permitir leitura pública" on ia_records;
create policy "Permitir leitura pública"
  on ia_records for select
  using (true);

-- Criar política de acesso público (Tudo)
drop policy if exists "Permitir tudo público" on ia_records;
create policy "Permitir tudo público"
  on ia_records for all
  using (true)
  with check (true);
```

## 2. Configurar Variáveis de Ambiente

As suas chaves já parecem estar configuradas. Se o monitor no topo do app mostrar **NUVEM: ATIVO**, a conexão está funcionando.

- `VITE_SUPABASE_URL`: `https://ftzmrlxajloljvlubarx.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: (A chave que você enviou no chat)

## 3. Status da Integração

O monitor no topo do aplicativo indicará **NUVEM: ATIVO** se a conexão for bem-sucedida e a tabela `ia_records` estiver acessível.

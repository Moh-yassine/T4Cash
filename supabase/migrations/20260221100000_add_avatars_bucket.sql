-- Bucket avatars pour le stockage des photos de profil
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: les utilisateurs authentifiés peuvent uploader leur avatar (nom commence par leur user_id)
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '-%'
  );

-- Policy: lecture publique des avatars
create policy "Avatars are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Policy: les utilisateurs peuvent mettre à jour leur propre avatar
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '-%'
  );

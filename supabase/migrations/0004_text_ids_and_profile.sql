-- Cuentas con correo/contraseña + perfil, y el arreglo que hacía imposible
-- sincronizar: los ids eran uuid, pero las categorías y métodos de pago
-- que la app siembra localmente usan slugs ('cat-hogar', 'pm-debito').
-- Cualquier intento de subir a la nube fallaba con
-- "invalid input syntax for type uuid".
--
-- Además 'cat-hogar' es el MISMO id para todas las personas, así que la
-- clave primaria pasa a ser (user_id, id): con la PK vieja, dos usuarios
-- chocarían entre sí.
--
-- Orden obligatorio, y el motivo de que la primera versión fallara:
-- una FK se apoya en el índice de la PK a la que apunta. Hay que soltar
-- TODAS las FK primero, después tocar PK y tipos, y recién al final
-- volver a crearlas. Crear una FK intermedia y luego intentar cambiar la
-- PK da "cannot drop constraint categories_pkey ... other objects depend
-- on it".
--
-- Es re-ejecutable: todo va con IF EXISTS / IF NOT EXISTS y dentro de una
-- transacción, así que si algo falla no queda nada a medias.

begin;

-- ── 1. perfil en settings ───────────────────────────────────────────
alter table public.settings
  add column if not exists display_name text,
  add column if not exists onboarded_at timestamptz;

-- ── 2. soltar TODAS las FK que dependen de lo que vamos a cambiar ───
alter table public.transactions    drop constraint if exists transactions_category_id_fkey;
alter table public.transactions    drop constraint if exists transactions_payment_method_id_fkey;
alter table public.transactions    drop constraint if exists transactions_category_fkey;
alter table public.transactions    drop constraint if exists transactions_payment_method_fkey;
alter table public.recurring_rules drop constraint if exists recurring_rules_category_id_fkey;
alter table public.recurring_rules drop constraint if exists recurring_rules_payment_method_id_fkey;
alter table public.recurring_rules drop constraint if exists recurring_rules_category_fkey;
alter table public.recurring_rules drop constraint if exists recurring_rules_payment_method_fkey;
alter table public.budgets         drop constraint if exists budgets_category_id_fkey;
alter table public.budgets         drop constraint if exists budgets_category_fkey;
alter table public.reminders       drop constraint if exists reminders_transaction_id_fkey;

-- ── 3. ahora sí, las PK de las dos tablas sembradas ─────────────────
alter table public.categories      drop constraint if exists categories_pkey;
alter table public.payment_methods drop constraint if exists payment_methods_pkey;

-- ── 4. tipos: todo id pasa a text ───────────────────────────────────
alter table public.categories
  alter column id drop default,
  alter column id type text using id::text;

alter table public.payment_methods
  alter column id drop default,
  alter column id type text using id::text;

alter table public.transactions
  alter column id drop default,
  alter column id type text using id::text,
  alter column category_id type text using category_id::text,
  alter column payment_method_id type text using payment_method_id::text,
  alter column recurring_rule_id type text using recurring_rule_id::text;

alter table public.recurring_rules
  alter column id drop default,
  alter column id type text using id::text,
  alter column category_id type text using category_id::text,
  alter column payment_method_id type text using payment_method_id::text;

alter table public.budgets
  alter column id drop default,
  alter column id type text using id::text,
  alter column category_id type text using category_id::text;

alter table public.reminders
  alter column id drop default,
  alter column id type text using id::text,
  alter column transaction_id type text using transaction_id::text;

alter table public.settings
  alter column default_payment_method_id type text using default_payment_method_id::text;

-- ── 5. PK nuevas: el id de categoría solo es único DENTRO de un usuario ──
alter table public.categories      add primary key (user_id, id);
alter table public.payment_methods add primary key (user_id, id);

-- ── 6. y recién ahora, las FK, ya sobre el par (user_id, id) ────────
alter table public.transactions
  add constraint transactions_category_fkey
    foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null,
  add constraint transactions_payment_method_fkey
    foreign key (user_id, payment_method_id) references public.payment_methods(user_id, id) on delete set null;

alter table public.recurring_rules
  add constraint recurring_rules_category_fkey
    foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null,
  add constraint recurring_rules_payment_method_fkey
    foreign key (user_id, payment_method_id) references public.payment_methods(user_id, id) on delete set null;

alter table public.budgets
  add constraint budgets_category_fkey
    foreign key (user_id, category_id) references public.categories(user_id, id) on delete cascade;

alter table public.reminders
  add constraint reminders_transaction_id_fkey
    foreign key (transaction_id) references public.transactions(id) on delete cascade;

commit;

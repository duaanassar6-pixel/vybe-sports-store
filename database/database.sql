-- TABLES
create table category (
  category_id serial primary key,
  name varchar(50) not null unique,
  slug varchar(50) not null unique
);

create table product (
  product_id serial primary key,
  name varchar(100) not null,
  description text not null,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url varchar(150) not null,          -- file name only, e.g. kinetika-court-control-racket.png
  category_id integer not null references category(category_id)
);

create table customers (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(100) not null,
  email varchar(150) not null unique,
  phone varchar(20),
  role varchar(10) not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table orders (
  order_id serial primary key,
  customer_id uuid not null references customers(customer_id),
  order_date timestamptz not null default now(),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  status varchar(20) not null default 'Pending'
    check (status in ('Pending','Processing','Shipped','Delivered','Cancelled')),
  shipping_address text not null,
  phone varchar(20) not null
);

create table order_items (
  order_item_id serial primary key,
  order_id integer not null references orders(order_id) on delete cascade,
  product_id integer not null references product(product_id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null
);

-- SAMPLE DATA (prices are examples, change as the team likes)
insert into category (name, slug) values
 ('Strength','strength'), ('Running','running'), ('Court Sports','court'),
 ('Cycling','cycling'), ('Recovery','recovery');

insert into product (name, description, price, stock, image_url, category_id) values
 ('Cast Iron Kettlebell 24KG','Durable cast iron kettlebell for strength training.',189.00,25,'kinetika-cast-iron-kettlebell-24kg.png',1),
 ('Load Bearing Barbell 20KG','Olympic-style 20kg barbell for heavy lifting.',749.00,10,'kinetika-load-bearing-barbell-20kg.png',1),
 ('Apex Carbon Racer','Lightweight carbon-plated running shoe.',649.00,15,'kinetika-apex-carbon-racer.png',2),
 ('Velocity Tempo Trainer','Everyday training shoe for tempo runs.',399.00,30,'kinetika-velocity-tempo-trainer.png',2),
 ('Court Control Racket','Balanced racket for control and power.',459.00,12,'kinetika-court-control-racket.png',3),
 ('Precision Match Ball','Match-quality ball with consistent bounce.',129.00,40,'kinetika-precision-match-ball.png',3),
 ('Turbine Aero Helmet','Aerodynamic, ventilated cycling helmet.',349.00,8,'kinetika-turbine-aero-helmet.png',4),
 ('Piston Compression Boots','Compression recovery boots for tired legs.',1299.00,5,'kinetika-piston-compression-boots.png',5);

 create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into customers (customer_id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name','Customer'),
          new.email, new.raw_user_meta_data->>'phone');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- reduce stock when an order item is saved
create function reduce_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update product set stock = stock - new.quantity where product_id = new.product_id;
  return new;
end; $$;
create trigger trg_reduce_stock after insert on order_items
for each row execute function reduce_stock();

-- admin check (for Member 4's dashboard)
create function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from customers where customer_id = auth.uid() and role = 'admin');
$$;

-- ROW LEVEL SECURITY
alter table category enable row level security;
alter table product enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Anyone can view categories" on category for select using (true);
create policy "Anyone can view products"   on product  for select using (true);
create policy "Admins manage categories" on category for all using (is_admin()) with check (is_admin());
create policy "Admins manage products"   on product  for all using (is_admin()) with check (is_admin());

create policy "View own profile" on customers for select using (auth.uid() = customer_id or is_admin());
create policy "Update own profile" on customers for update using (auth.uid() = customer_id);
revoke update on customers from authenticated;
grant update (full_name, phone) on customers to authenticated;   -- users can't make themselves admin

create policy "View own orders"   on orders for select using (auth.uid() = customer_id or is_admin());
create policy "Create own orders" on orders for insert with check (auth.uid() = customer_id);
create policy "Admins update orders" on orders for update using (is_admin());
create policy "Delete own pending orders" on orders for delete
  using ((auth.uid() = customer_id and status = 'Pending') or is_admin());

create policy "View own order items" on order_items for select using (
  exists (select 1 from orders o where o.order_id = order_items.order_id
          and (o.customer_id = auth.uid() or is_admin())));
create policy "Add items to own orders" on order_items for insert with check (
  exists (select 1 from orders o where o.order_id = order_items.order_id
          and o.customer_id = auth.uid()));

-- price always comes from the product table, never from the browser
create function set_item_price() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select price into new.unit_price from product where product_id = new.product_id;
  return new;
end; $$;
create trigger trg_a_set_price before insert on order_items
for each row execute function set_item_price();

-- order total is recalculated from the items
create function update_order_total() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update orders set total_amount =
    (select sum(quantity * unit_price) from order_items where order_id = new.order_id)
  where order_id = new.order_id;
  return new;
end; $$;
create trigger trg_update_total after insert on order_items
for each row execute function update_order_total();

-- new orders must start as Pending, and items can only be added to Pending orders
drop policy "Create own orders" on orders;
create policy "Create own orders" on orders for insert
  with check (auth.uid() = customer_id and status = 'Pending');

drop policy "Add items to own orders" on order_items;
create policy "Add items to own orders" on order_items for insert with check (
  exists (select 1 from orders o where o.order_id = order_items.order_id
          and o.customer_id = auth.uid() and o.status = 'Pending'));

create function restore_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update product set stock = stock + old.quantity where product_id = old.product_id;
  return old;
end; $$;
create trigger trg_restore_stock before delete on order_items
for each row execute function restore_stock();

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.6
-- Dumped by pg_dump version 15.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module text NOT NULL,
    action text NOT NULL,
    payload jsonb NOT NULL,
    summary text,
    requested_by uuid,
    requested_by_name text,
    status text DEFAULT 'pending'::text,
    review_note text,
    reviewed_by uuid,
    reviewed_by_name text,
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone
);


--
-- Name: approval_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_rules (
    module text NOT NULL,
    enabled boolean DEFAULT false,
    requester_roles text[] DEFAULT '{}'::text[],
    approver_roles text[] DEFAULT '{}'::text[],
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    date date NOT NULL,
    check_in_time timestamp with time zone,
    scheduled_start text,
    status text DEFAULT 'present'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cash_sheets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_sheets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_date date NOT NULL,
    total_ca numeric DEFAULT 0,
    total_cb numeric DEFAULT 0,
    total_especes numeric DEFAULT 0,
    especes_note text,
    paid_items jsonb DEFAULT '[]'::jsonb,
    unpaid_items jsonb DEFAULT '[]'::jsonb,
    paid_outside_items jsonb DEFAULT '[]'::jsonb,
    total_depense numeric DEFAULT 0,
    reste_especes numeric DEFAULT 0,
    manager_name text,
    visa_caisse text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    attachments jsonb DEFAULT '[]'::jsonb,
    glovo_ttc_espece numeric(12,2) DEFAULT 0,
    glovo_ttc_online numeric(12,2) DEFAULT 0,
    total_especes_caisse numeric DEFAULT 0 NOT NULL,
    custom_columns jsonb DEFAULT '[]'::jsonb,
    payment_sources jsonb DEFAULT '[]'::jsonb,
    column_flags jsonb DEFAULT '{}'::jsonb
);


--
-- Name: daily_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_date date NOT NULL,
    revenue_card numeric DEFAULT 0,
    revenue_cash numeric DEFAULT 0,
    revenue_transfer numeric DEFAULT 0,
    total_revenue numeric GENERATED ALWAYS AS (((revenue_card + revenue_cash) + revenue_transfer)) STORED,
    expense_cash numeric DEFAULT 0,
    expense_card_pro numeric DEFAULT 0,
    expense_tpe numeric DEFAULT 0,
    total_expenses numeric GENERATED ALWAYS AS (((expense_cash + expense_card_pro) + expense_tpe)) STORED,
    withdrawal_pro numeric DEFAULT 0,
    withdrawal_perso numeric DEFAULT 0,
    total_withdrawals numeric GENERATED ALWAYS AS ((withdrawal_pro + withdrawal_perso)) STORED,
    solde_theorique numeric GENERATED ALWAYS AS (((((revenue_card + revenue_cash) + revenue_transfer) - ((expense_cash + expense_card_pro) + expense_tpe)) - (withdrawal_pro + withdrawal_perso))) STORED,
    observations text,
    status text DEFAULT 'draft'::text,
    validated_by uuid,
    validated_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expense_cash_desc text,
    expense_card_pro_desc text,
    expense_tpe_desc text,
    withdrawal_pro_desc text,
    withdrawal_perso_desc text,
    espece_reste numeric(12,2) DEFAULT 0,
    glovo_ttc_espece numeric(12,2) DEFAULT 0,
    glovo_ttc_online numeric(12,2) DEFAULT 0,
    CONSTRAINT daily_entries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'validated'::text, 'locked'::text])))
);


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    license_number text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_date date NOT NULL,
    amount numeric NOT NULL,
    payment_method text NOT NULL,
    category text DEFAULT 'other'::text,
    description text,
    vendor_id uuid,
    vendor_transaction_id uuid,
    daily_entry_id uuid,
    receipt_url text,
    receipt_path text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT expenses_category_check CHECK ((category = ANY (ARRAY['vendor_order'::text, 'market_purchase'::text, 'utilities'::text, 'equipment'::text, 'cleaning'::text, 'transport'::text, 'maintenance'::text, 'salary_advance'::text, 'other'::text]))),
    CONSTRAINT expenses_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'card_pro'::text, 'tpe'::text])))
);


--
-- Name: floor_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.floor_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text,
    category_id uuid,
    quantity numeric DEFAULT 0,
    unit text DEFAULT 'pieces'::text,
    minimum_stock numeric DEFAULT 0,
    cost_per_unit numeric DEFAULT 0,
    last_purchase_price numeric DEFAULT 0,
    pack_size numeric DEFAULT 1,
    supplier text,
    vendor_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inventory_item_id uuid NOT NULL,
    movement_type text NOT NULL,
    quantity_change numeric(12,3) DEFAULT 0,
    quantity_before numeric(12,3) DEFAULT 0,
    quantity_after numeric(12,3) DEFAULT 0,
    unit_cost numeric DEFAULT 0,
    reference_type text,
    reference_id text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid,
    invoice_number text,
    invoice_date date,
    total_amount numeric DEFAULT 0,
    status text DEFAULT 'pending'::text,
    file_url text,
    file_path text,
    items jsonb DEFAULT '[]'::jsonb,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lacaisse_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lacaisse_daily (
    date date NOT NULL,
    revenue numeric(12,2) DEFAULT 0 NOT NULL,
    transactions integer DEFAULT 0 NOT NULL,
    couverts integer DEFAULT 0 NOT NULL,
    avg_ticket numeric(12,2),
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lacaisse_sync_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lacaisse_sync_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    caisse_id integer NOT NULL,
    date_start date NOT NULL,
    date_end date NOT NULL,
    ca_realise numeric(12,2),
    ca_annule numeric(12,2),
    benefice numeric(12,2),
    couverts integer,
    transactions integer,
    best_day date,
    best_day_amount numeric(12,2),
    days_synced integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_categories (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_fr text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    icon text,
    description text,
    sort_order integer DEFAULT 0,
    availability_type text,
    available_start_time text,
    available_end_time text,
    available_days jsonb
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    name_fr text,
    description text,
    description_fr text,
    price numeric DEFAULT 0,
    category_id text,
    image_url text,
    is_available boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    display_order integer DEFAULT 0,
    allergens jsonb,
    tags jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    price_small numeric,
    price_medium numeric,
    price_large numeric,
    description_en text,
    name_en text,
    ingredients text,
    spicy_level integer DEFAULT 0,
    prep_time integer,
    ingredients_en jsonb,
    is_signature boolean,
    chef_note text,
    sort_order integer,
    recipe_id text,
    extra_category_ids jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: menus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric,
    is_active boolean DEFAULT true,
    items jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: misc_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.misc_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_date date NOT NULL,
    amount numeric NOT NULL,
    description text,
    justification text,
    receipt_url text,
    receipt_path text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT misc_expenses_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    type text NOT NULL,
    enabled boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    severity text DEFAULT 'info'::text,
    link text,
    required_permission text,
    dedup_key text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    target_roles text[],
    target_users uuid[]
);


--
-- Name: payroll_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pay_month date NOT NULL,
    employee_name text NOT NULL,
    working_days numeric DEFAULT 0,
    day_offs numeric DEFAULT 0,
    holidays numeric DEFAULT 0,
    cnss numeric DEFAULT 0,
    tac numeric DEFAULT 0,
    total numeric DEFAULT 0,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    resource text NOT NULL,
    action text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    role_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    inventory_item_id uuid,
    product_name text NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT 'kg'::text NOT NULL,
    unit_cost numeric DEFAULT 0 NOT NULL,
    received_quantity numeric,
    created_at timestamp with time zone DEFAULT now(),
    vendor_id uuid
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_date date,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    total_amount numeric DEFAULT 0,
    paid_amount numeric DEFAULT 0,
    created_by uuid,
    received_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'received'::text, 'cancelled'::text])))
);


--
-- Name: recipe_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipe_id uuid NOT NULL,
    inventory_item_id uuid,
    ingredient_name text NOT NULL,
    quantity numeric DEFAULT 0,
    unit text DEFAULT 'g'::text,
    unit_cost numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    total_cost numeric DEFAULT 0
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id text,
    name text NOT NULL,
    description text,
    portions integer DEFAULT 1,
    preparation_time integer,
    cooking_time integer,
    instructions text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    name_fr text,
    category text,
    image_url text,
    cost_price numeric DEFAULT 0,
    difficulty text,
    yield_amount numeric,
    yield_unit text,
    selling_price text
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: salary_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    base_salary numeric DEFAULT 0,
    bonuses numeric DEFAULT 0,
    deductions numeric DEFAULT 0,
    total numeric DEFAULT 0,
    status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sales_cost_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_cost_map (
    product_name text NOT NULL,
    recipe_id uuid,
    manual_cost numeric(12,2),
    source text DEFAULT 'manual'::text NOT NULL,
    similarity numeric(4,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sales_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_imports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    filename text,
    records_count integer DEFAULT 0,
    total_amount numeric DEFAULT 0,
    date_range_start date,
    date_range_end date,
    created_at timestamp with time zone DEFAULT now(),
    imported_by uuid,
    status text DEFAULT 'completed'::text
);


--
-- Name: sales_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text,
    family text,
    category text,
    product_name text NOT NULL,
    sub_product text,
    quantity numeric DEFAULT 1,
    catalog_price numeric DEFAULT 0,
    selling_price numeric DEFAULT 0,
    tax_rate numeric DEFAULT 0,
    profit numeric DEFAULT 0,
    dine_in boolean DEFAULT true,
    sale_date date,
    sale_time text,
    created_at timestamp with time zone DEFAULT now(),
    transaction_id text,
    barcode text,
    import_id uuid,
    item_type text,
    purchase_price_ht numeric DEFAULT 0,
    selling_price_ht numeric DEFAULT 0,
    margin numeric DEFAULT 0,
    margin_percent numeric DEFAULT 0,
    purchase_price_ttc numeric DEFAULT 0,
    discount numeric DEFAULT 0,
    supplier text,
    import_source text,
    lacaisse_order_id text
);


--
-- Name: salle_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salle_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    menu_item_id text,
    item_name text NOT NULL,
    quantity integer DEFAULT 1,
    unit_price numeric DEFAULT 0,
    status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT salle_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'served'::text, 'cancelled'::text])))
);


--
-- Name: salle_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salle_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_id uuid NOT NULL,
    status text DEFAULT 'occupied'::text,
    guests integer DEFAULT 1,
    waiter_id uuid,
    started_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT salle_sessions_status_check CHECK ((status = ANY (ARRAY['occupied'::text, 'ordering'::text, 'served'::text, 'billing'::text, 'closed'::text])))
);


--
-- Name: salle_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salle_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number integer NOT NULL,
    capacity integer DEFAULT 4,
    zone text DEFAULT 'main'::text,
    x numeric DEFAULT 0,
    y numeric DEFAULT 0,
    width numeric DEFAULT 80,
    height numeric DEFAULT 80,
    shape text DEFAULT 'rectangle'::text,
    rotation numeric DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: site_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: staff_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    "position" text,
    staff_type_id uuid,
    department text DEFAULT 'cuisine'::text,
    hourly_rate numeric DEFAULT 0,
    contract_type text DEFAULT 'CDI'::text,
    hire_date date,
    is_active boolean DEFAULT true,
    schedule_type text DEFAULT 'weekly'::text,
    schedule_config jsonb,
    transport_pickup text,
    transport_dropoff text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    profile_id uuid,
    salary numeric DEFAULT 0,
    monthly_salary numeric DEFAULT 0,
    emergency_contact text,
    address text,
    cin text,
    cnss text,
    notes text,
    contract_end_date date
);


--
-- Name: staff_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    date date NOT NULL,
    start_time text,
    end_time text,
    is_day_off boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_time_off; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_time_off (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    type text DEFAULT 'vacation'::text,
    status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#606338'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: table_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.table_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    menu_item_id text,
    quantity numeric DEFAULT 1,
    unit_price numeric DEFAULT 0,
    notes text,
    status text DEFAULT 'ordered'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: table_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.table_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_id uuid,
    waiter_id uuid,
    guests_count integer DEFAULT 1,
    status text DEFAULT 'active'::text,
    notes text,
    total_amount numeric DEFAULT 0,
    opened_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id uuid,
    table_number integer,
    seats integer DEFAULT 4,
    shape text DEFAULT 'round'::text,
    x numeric DEFAULT 50,
    y numeric DEFAULT 50,
    width numeric DEFAULT 10,
    height numeric DEFAULT 10,
    rotation numeric DEFAULT 0,
    status text DEFAULT 'available'::text,
    assigned_waiter_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reserved_name text,
    reserved_time text,
    reserved_guests integer
);


--
-- Name: transport_trip_passengers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_trip_passengers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: transport_trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    trip_type text NOT NULL,
    scheduled_time text,
    driver_id uuid,
    vehicle_id uuid,
    status text DEFAULT 'scheduled'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT transport_trips_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT transport_trips_trip_type_check CHECK ((trip_type = ANY (ARRAY['pickup'::text, 'dropoff'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    plate_number text,
    capacity integer DEFAULT 4,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vendor_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    product_name text NOT NULL,
    quantity numeric(12,3) DEFAULT 0,
    unit text,
    unit_price numeric(12,2) DEFAULT 0,
    total_price numeric(12,2) DEFAULT 0,
    matched_inventory_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid,
    invoice_url text,
    invoice_path text,
    invoice_date date,
    total_amount numeric(12,2),
    status text DEFAULT 'pending'::text,
    vendor_transaction_id uuid,
    raw_extraction jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    due_date date
);


--
-- Name: vendor_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric NOT NULL,
    description text,
    date date DEFAULT CURRENT_DATE,
    reference text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vendor_transactions_type_check CHECK ((type = ANY (ARRAY['debt'::text, 'payment'::text])))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_name text,
    email text,
    phone text,
    address text,
    category text,
    category_id uuid,
    is_active boolean DEFAULT true,
    invoice_template_url text,
    invoice_template_path text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- Name: approval_rules approval_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rules
    ADD CONSTRAINT approval_rules_pkey PRIMARY KEY (module);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_staff_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_staff_id_date_key UNIQUE (staff_id, date);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_sheets cash_sheets_entry_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_sheets
    ADD CONSTRAINT cash_sheets_entry_date_key UNIQUE (entry_date);


--
-- Name: cash_sheets cash_sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_sheets
    ADD CONSTRAINT cash_sheets_pkey PRIMARY KEY (id);


--
-- Name: daily_entries daily_entries_entry_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_entries
    ADD CONSTRAINT daily_entries_entry_date_key UNIQUE (entry_date);


--
-- Name: daily_entries daily_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_entries
    ADD CONSTRAINT daily_entries_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: floor_zones floor_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_zones
    ADD CONSTRAINT floor_zones_pkey PRIMARY KEY (id);


--
-- Name: inventory_categories inventory_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_name_key UNIQUE (name);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lacaisse_daily lacaisse_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lacaisse_daily
    ADD CONSTRAINT lacaisse_daily_pkey PRIMARY KEY (date);


--
-- Name: lacaisse_sync_runs lacaisse_sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lacaisse_sync_runs
    ADD CONSTRAINT lacaisse_sync_runs_pkey PRIMARY KEY (id);


--
-- Name: menu_categories menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- Name: misc_expenses misc_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.misc_expenses
    ADD CONSTRAINT misc_expenses_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (type);


--
-- Name: notifications notifications_dedup_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_dedup_key_key UNIQUE (dedup_key);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payroll_entries payroll_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_entries
    ADD CONSTRAINT payroll_entries_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: recipe_ingredients recipe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: salary_records salary_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_records
    ADD CONSTRAINT salary_records_pkey PRIMARY KEY (id);


--
-- Name: salary_records salary_records_staff_id_year_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_records
    ADD CONSTRAINT salary_records_staff_id_year_month_key UNIQUE (staff_id, year, month);


--
-- Name: sales_cost_map sales_cost_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_cost_map
    ADD CONSTRAINT sales_cost_map_pkey PRIMARY KEY (product_name);


--
-- Name: sales_imports sales_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_imports
    ADD CONSTRAINT sales_imports_pkey PRIMARY KEY (id);


--
-- Name: sales_items sales_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_items
    ADD CONSTRAINT sales_items_pkey PRIMARY KEY (id);


--
-- Name: salle_orders salle_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salle_orders
    ADD CONSTRAINT salle_orders_pkey PRIMARY KEY (id);


--
-- Name: salle_sessions salle_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salle_sessions
    ADD CONSTRAINT salle_sessions_pkey PRIMARY KEY (id);


--
-- Name: salle_tables salle_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salle_tables
    ADD CONSTRAINT salle_tables_pkey PRIMARY KEY (id);


--
-- Name: site_content site_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_content
    ADD CONSTRAINT site_content_pkey PRIMARY KEY (id);


--
-- Name: site_content site_content_section_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_content
    ADD CONSTRAINT site_content_section_key UNIQUE (section);


--
-- Name: staff_members staff_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_pkey PRIMARY KEY (id);


--
-- Name: staff_schedules staff_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_schedules
    ADD CONSTRAINT staff_schedules_pkey PRIMARY KEY (id);


--
-- Name: staff_time_off staff_time_off_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_time_off
    ADD CONSTRAINT staff_time_off_pkey PRIMARY KEY (id);


--
-- Name: staff_types staff_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_types
    ADD CONSTRAINT staff_types_pkey PRIMARY KEY (id);


--
-- Name: table_orders table_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_pkey PRIMARY KEY (id);


--
-- Name: table_sessions table_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_pkey PRIMARY KEY (id);


--
-- Name: tables tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);


--
-- Name: transport_trip_passengers transport_trip_passengers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_trip_passengers
    ADD CONSTRAINT transport_trip_passengers_pkey PRIMARY KEY (id);


--
-- Name: transport_trips transport_trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vendor_invoice_items vendor_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT vendor_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: vendor_invoices vendor_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_pkey PRIMARY KEY (id);


--
-- Name: vendor_transactions vendor_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_transactions
    ADD CONSTRAINT vendor_transactions_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: idx_approval_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_requests_created_at ON public.approval_requests USING btree (created_at DESC);


--
-- Name: idx_approval_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_requests_status ON public.approval_requests USING btree (status);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_date ON public.attendance USING btree (date);


--
-- Name: idx_cash_sheets_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_sheets_date ON public.cash_sheets USING btree (entry_date);


--
-- Name: idx_misc_expenses_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_misc_expenses_date ON public.misc_expenses USING btree (expense_date);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_payroll_entries_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_entries_month ON public.payroll_entries USING btree (pay_month);


--
-- Name: idx_payroll_entries_pay_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_entries_pay_month ON public.payroll_entries USING btree (pay_month);


--
-- Name: idx_purchase_order_items_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_vendor_id ON public.purchase_order_items USING btree (vendor_id);


--
-- Name: idx_salary_records_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_records_staff_id ON public.salary_records USING btree (staff_id);


--
-- Name: idx_salary_records_year_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_records_year_month ON public.salary_records USING btree (year, month);


--
-- Name: idx_sales_items_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_sales_items_unique ON public.sales_items USING btree (ticket_number, product_name, sale_date, sale_time, quantity);


--
-- Name: idx_staff_members_contract_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_members_contract_end_date ON public.staff_members USING btree (contract_end_date);


--
-- Name: idx_table_orders_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_table_orders_session_id ON public.table_orders USING btree (session_id);


--
-- Name: idx_table_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_table_sessions_status ON public.table_sessions USING btree (status);


--
-- Name: idx_table_sessions_table_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_table_sessions_table_id ON public.table_sessions USING btree (table_id);


--
-- Name: idx_tables_zone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tables_zone_id ON public.tables USING btree (zone_id);


--
-- Name: idx_vendor_invoice_items_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_invoice_items_invoice_id ON public.vendor_invoice_items USING btree (invoice_id);


--
-- Name: idx_vendor_invoices_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_invoices_created_at ON public.vendor_invoices USING btree (created_at);


--
-- Name: idx_vendor_invoices_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_invoices_due_date ON public.vendor_invoices USING btree (due_date);


--
-- Name: idx_vendor_invoices_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_invoices_vendor_id ON public.vendor_invoices USING btree (vendor_id);


--
-- Name: floor_zones update_floor_zones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_floor_zones_updated_at BEFORE UPDATE ON public.floor_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: table_orders update_table_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_table_orders_updated_at BEFORE UPDATE ON public.table_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: table_sessions update_table_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_table_sessions_updated_at BEFORE UPDATE ON public.table_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: tables update_tables_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON public.tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: attendance attendance_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cash_sheets cash_sheets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_sheets
    ADD CONSTRAINT cash_sheets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: daily_entries daily_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_entries
    ADD CONSTRAINT daily_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: daily_entries daily_entries_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_entries
    ADD CONSTRAINT daily_entries_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_daily_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_daily_entry_id_fkey FOREIGN KEY (daily_entry_id) REFERENCES public.daily_entries(id);


--
-- Name: expenses expenses_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: expenses expenses_vendor_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_vendor_transaction_id_fkey FOREIGN KEY (vendor_transaction_id) REFERENCES public.vendor_transactions(id);


--
-- Name: inventory_items inventory_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id);


--
-- Name: inventory_items inventory_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: inventory_movements inventory_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: inventory_movements inventory_movements_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE SET NULL;


--
-- Name: misc_expenses misc_expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.misc_expenses
    ADD CONSTRAINT misc_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: payroll_entries payroll_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_entries
    ADD CONSTRAINT payroll_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: purchase_order_items purchase_order_items_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;


--
-- Name: purchase_order_items purchase_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: recipe_ingredients recipe_ingredients_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: salary_records salary_records_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_records
    ADD CONSTRAINT salary_records_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: sales_cost_map sales_cost_map_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_cost_map
    ADD CONSTRAINT sales_cost_map_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;


--
-- Name: salle_orders salle_orders_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salle_orders
    ADD CONSTRAINT salle_orders_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.salle_sessions(id) ON DELETE CASCADE;


--
-- Name: salle_sessions salle_sessions_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salle_sessions
    ADD CONSTRAINT salle_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.salle_tables(id) ON DELETE CASCADE;


--
-- Name: salle_sessions salle_sessions_waiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salle_sessions
    ADD CONSTRAINT salle_sessions_waiter_id_fkey FOREIGN KEY (waiter_id) REFERENCES public.users(id);


--
-- Name: site_content site_content_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_content
    ADD CONSTRAINT site_content_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: staff_members staff_members_staff_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_staff_type_id_fkey FOREIGN KEY (staff_type_id) REFERENCES public.staff_types(id);


--
-- Name: staff_schedules staff_schedules_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_schedules
    ADD CONSTRAINT staff_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: staff_time_off staff_time_off_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_time_off
    ADD CONSTRAINT staff_time_off_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: table_orders table_orders_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: table_orders table_orders_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_orders
    ADD CONSTRAINT table_orders_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.table_sessions(id) ON DELETE CASCADE;


--
-- Name: table_sessions table_sessions_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE CASCADE;


--
-- Name: table_sessions table_sessions_waiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_waiter_id_fkey FOREIGN KEY (waiter_id) REFERENCES public.staff_members(id) ON DELETE SET NULL;


--
-- Name: tables tables_assigned_waiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_assigned_waiter_id_fkey FOREIGN KEY (assigned_waiter_id) REFERENCES public.staff_members(id) ON DELETE SET NULL;


--
-- Name: tables tables_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.floor_zones(id) ON DELETE SET NULL;


--
-- Name: transport_trip_passengers transport_trip_passengers_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_trip_passengers
    ADD CONSTRAINT transport_trip_passengers_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: transport_trip_passengers transport_trip_passengers_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_trip_passengers
    ADD CONSTRAINT transport_trip_passengers_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.transport_trips(id) ON DELETE CASCADE;


--
-- Name: transport_trips transport_trips_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: transport_trips transport_trips_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: vendor_invoice_items vendor_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT vendor_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.vendor_invoices(id) ON DELETE CASCADE;


--
-- Name: vendor_invoice_items vendor_invoice_items_matched_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT vendor_invoice_items_matched_inventory_id_fkey FOREIGN KEY (matched_inventory_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;


--
-- Name: vendor_invoices vendor_invoices_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_invoices vendor_invoices_vendor_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_vendor_transaction_id_fkey FOREIGN KEY (vendor_transaction_id) REFERENCES public.vendor_transactions(id) ON DELETE SET NULL;


--
-- Name: vendor_transactions vendor_transactions_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_transactions
    ADD CONSTRAINT vendor_transactions_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id);


--
-- PostgreSQL database dump complete
--


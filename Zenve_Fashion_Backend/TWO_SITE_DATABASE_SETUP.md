# Two sites: Designer tables and shared data

## What is confirmed in this project

- This backend uses Django and MySQL.
- `zenvefashion/settings.py` currently defines only the `default` connection.
- `designers/models.py` defines the Designer model with the SQL table name `designer`.
- `designers/migrations/` contains the table creation and subsequent schema changes.
- The Designer account links to Django users; products and account details also
  relate to designers. Copying only Designer rows will not copy these relationships.
- The database connection was refused during the latest inspection. The running
  database and second site's schema have not been verified or modified.

## Step 1: Identify both sites

For this request, the second site's source code is unavailable and only its
database is available. The requested direction is one-way: current CRM to second
database. Do not set up two-way copying or assume a second Django backend exists.

For each site, record the backend project folder, framework, database engine,
database name, host and port. Keep passwords in each site's local environment
configuration; do not paste passwords into chat or commit them.

Decide whether both sites can edit shared records or only the current CRM can.
Also identify the shared entities: designers, products, users, orders, or all data.
The correct synchronization implementation depends on these choices.

## Step 2: Restore database connectivity

Start the MySQL instance configured by DB_HOST and DB_PORT in the backend `.env`.
Check that Django is pointing at the intended database. From the backend folder,
using the project's Python environment, run:

```powershell
python manage.py check --database default
python manage.py showmigrations designers
```

If the connection is refused, resolve the server/port configuration before running
migrations. Do not change the database name just to make the connection succeed.

## Step 3: Inspect and back up the second database

Back up the second database before changing its schema. In its database client:

```sql
SELECT DATABASE();
SHOW TABLES LIKE 'designer';
SHOW TABLES LIKE 'django_migrations';
```

If `designer` is missing, determine whether the second project has a Designer
model and whether its migrations were applied. A different framework may use
a different model or table name and needs a mapped integration instead.

## Step 4: Prepare the missing schema

For a database-only destination, first inspect its actual tables and engine using
its database client. After confirming compatibility, add an explicitly configured
secondary connection to this backend and inspect a migration plan with
`python manage.py migrate designers --database=secondary --plan`. This command
only works after the connection alias is configured. Do not point the default
connection at the second database or blindly run all CRM migrations there.

Existing destination user tables may have a different schema or different IDs.
The Designer migration depends on Django users and account role tables, including
data migrations. Review these dependencies before applying it to an existing site.
If the destination is not a compatible Django schema, create a mapped destination
table through a reviewed schema migration rather than installing this backend's
auth tables into it. Without the second site's code, creating a table cannot make
its application start displaying that table's data automatically.

If the second site uses a compatible copy of this Django backend, deploy the
Designer app and its migration files with the dependent account models and
migrations. Confirm it is included in INSTALLED_APPS. Inspect any existing auth
tables and migration history before applying this project's migrations there.

From the SECOND backend folder, with its settings pointing at the SECOND database:

```powershell
python manage.py showmigrations designers
python manage.py migrate designers --plan
```

Review the plan and check it against a staging copy first. Then apply it:

```powershell
python manage.py migrate designers
```

This creates or updates tables and applies migration data operations; it does not
copy existing Designer rows or synchronize future edits. Do not use `--fake` to
mark a missing table as created.

If the second site is a different Django project, compare model schemas and
migration history before copying apps. Existing auth/user tables may differ.
If it is not Django, implement the Designer schema through that project's own
migrations or have the site consume the CRM API.

## Step 5: Verify the table

In the second database client:

```sql
SHOW TABLES LIKE 'designer';
SHOW CREATE TABLE designer;
SELECT COUNT(*) FROM designer;
```

Check columns, indexes, foreign keys and migration history. An empty table is
expected until existing data is imported or new records are created.

## Step 6: Choose how changes reach both sites

### Shared business backend

If separate databases are not mandatory, both sites can use the same backend API
for Designer and Product records. The backend owns the shared records; each site's
unrelated data can stay in its own database. Both sites then see changes without
maintaining a second writable copy of the shared records.

### Two independent databases with application synchronization

If both databases must store Designer records, implement authenticated APIs and
durable synchronization jobs. A source database transaction saves the business
change and an outbox event together. A worker delivers it to the destination,
which applies it idempotently. Failed deliveries are retried and monitored.

Use a shared UUID or explicit ID mapping. Do not assume designer ID 19 or user ID
19 represents the same person in both databases. Define how linked users,
products, deletions, uploads and approval side effects are mapped. For editing
from both sites, define conflict resolution and prevent sync events looping.

### One-way MySQL replication

For compatible databases where only one source accepts writes, MySQL replication
may fit. It requires a consistent initial snapshot and database-server setup.
Ordinary source/replica replication is not a two-way application merge strategy.
Do not make unrelated existing databases replicas without reviewing their data.

Adding another Django DATABASES entry provides a second connection. It does not
automatically mirror model saves or create missing tables in that database.

## Step 7: Seed and test shared records

After choosing the design, import an initial consistent dataset with ID mapping
and relationship validation. Then test:

1. Create a test designer on the allowed source and check the other site.
2. Edit a contact field and verify the update.
3. Approve and verify KYC; confirm account/role creation happens as intended.
4. Add a product and verify its designer ownership on both sites.
5. Repeat an event and confirm no duplicate record is created.
6. Disconnect the destination, make a change and verify retry after reconnection.
7. Test the agreed behavior for deletion and conflicting edits.

## References

- Django multiple databases: https://docs.djangoproject.com/en/5.2/topics/db/multi-db/
- MySQL replication setup: https://dev.mysql.com/doc/refman/8.0/en/replication-setup-replicas.html

Implementation of the second database's schema and one-way synchronization remains
pending its engine, connection details, and inspected table compatibility.

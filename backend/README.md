### How to Run the Admin Panel Backend

#### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- MySQL (v8.2 or later)

#### Setting Up Environment

1. **Create a MySQL Database**:
Create a MySQL database and note down the host, database name, port, username, and password.

2. **Run the database migration**:
Migrate the `database.sql` file.

3. **Create `.env`**:
Ensure you have a `.env` file in the root directory of your project. This file should contain the necessary
environment variables for your application.

```shell
NODE_ENV="development"
PORT=3001

HOST="MySQL-8.2"
DATABASE="Parents"
DB_PORT="3306"
USER="root"
PASSWORD=""

PER_PAGE=10

SERVICE_REGION=""
ACCESS_KEY=""
SECRET_ACCESS_KEY=""

PARENT_POOL_ID=""
PARENT_CLIENT_ID=""
ADMIN_POOL_ID=""
ADMIN_CLIENT_ID=""

BUCKET_NAME=""
BUCKET_ACCESS_KEY=""
BUCKET_SECRET_ACCESS_KEY=""

SNS_ARN=""

USE_MOCK_COGNITO="false"

```

4. **Environment "Variables**":

- `PORT`: The port number on which the server will run.
- `HOST`: The host of the MySQL database.
- `DATABASE`: The name of the MySQL database.
- `DB_PORT`: The port of the MySQL database.
- `USER`: The username of the MySQL database.
- `PASSWORD`: The password of the MySQL database.
- `PER_PAGE`: The number of items to display per page.
- `SERVICE_REGION`: The region of the AWS service.
- `ACCESS_KEY`: The access key of the AWS service.
- `SECRET_ACCESS_KEY`: The secret access key of the AWS service.
- `PARENT_POOL_ID`: The pool ID of the parent user.
- `PARENT_CLIENT_ID`: The client ID of the parent user.
- `ADMIN_POOL_ID`: The pool ID of the admin user.
- `ADMIN_CLIENT_ID`: The client ID of the admin user.
- `USE_MOCK_COGNITO`: Whatever hasn't aws services to use mock cognito.

5. **Install Dependencies**: Run the following command to install the required dependencies:

```shell
npm install
```

6. **Run the Server**:
Run the following command to start the server:

```shell
npm run dev
```

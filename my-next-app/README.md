# Next.js HTTPS Proxy Server for Vercel

This project is a simple HTTPS proxy server built with Next.js and designed for easy deployment on Vercel. It forwards requests from a specific Next.js API route to a configured target server.

This project is located in the `my-next-app` subdirectory of the repository.

## Project Overview

The core functionality lies in the API route `src/app/api/proxy/[...slug]/route.ts`. This route captures all requests under `/api/proxy/` and forwards them to the server specified by the `TARGET_SERVER_URL` environment variable.

## Local Setup

1.  **Clone the Repository:**
    If you haven't already, clone the repository that contains this project.

2.  **Navigate to the Project Directory:**
    ```bash
    cd path/to/your-repo/my-next-app
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

4.  **Configure Target Server URL:**
    Create a `.env.local` file in the `my-next-app` directory (i.e., `my-next-app/.env.local`) and add the `TARGET_SERVER_URL`:
    ```env
    # my-next-app/.env.local
    TARGET_SERVER_URL=https://jsonplaceholder.typicode.com
    ```
    Replace `https://jsonplaceholder.typicode.com` with the actual base URL of the server you want to proxy requests to. This URL should not have a trailing slash.

5.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    The application will typically start on `http://localhost:3000`.

## Configuring `TARGET_SERVER_URL`

The `TARGET_SERVER_URL` environment variable is crucial for this proxy to function. It tells the proxy where to send the incoming requests.

-   **Local Development:**
    As mentioned in the setup, use a `.env.local` file inside the `my-next-app` directory:
    ```env
    # File: my-next-app/.env.local
    TARGET_SERVER_URL=https://your-target-api.com
    ```
    Next.js automatically loads variables from `.env.local` during development.

-   **Vercel Deployment:**
    For deployed instances on Vercel, you must set the `TARGET_SERVER_URL` environment variable in your Vercel project settings:
    1.  Go to your project on Vercel.
    2.  Navigate to the "Settings" tab.
    3.  Select "Environment Variables" from the side menu.
    4.  Add a new variable:
        *   **Name:** `TARGET_SERVER_URL`
        *   **Value:** `https://your-production-target-api.com` (replace with your actual target URL)
    5.  Ensure the variable is available to all desired environments (Production, Preview, Development).

## Deployment to Vercel

1.  **Push to a Git Repository:**
    Ensure your entire project, including the `my-next-app` subdirectory and its contents, is pushed to a Git repository (e.g., on GitHub, GitLab, Bitbucket).

2.  **Create a New Vercel Project:**
    1.  Log in to your Vercel account.
    2.  Click "Add New..." and select "Project".
    3.  Import your Git repository.

3.  **Configure Project Settings on Vercel:**
    *   **Framework Preset:** Vercel should automatically detect "Next.js".
    *   **Root Directory:** This is a critical step. In your Vercel project settings, under "General", find the "Root Directory" option. Set it to `my-next-app` (or the correct path to this subdirectory if your repository has a different structure). This tells Vercel that your Next.js application is located within the `my-next-app` folder, not at the root of the repository.
    *   **Build and Output Settings:** Vercel's defaults for Next.js are usually sufficient and do not need changes.

4.  **Set Environment Variables on Vercel:**
    As detailed in the "Configuring `TARGET_SERVER_URL`" section above, add the `TARGET_SERVER_URL` environment variable through the Vercel dashboard.

5.  **Deploy:**
    Once configured, Vercel will automatically build and deploy your project when you push to the connected Git branch (e.g., `main`). Subsequent pushes to this branch will trigger new deployments.

## Basic Usage

Once your Next.js proxy application is deployed to Vercel (e.g., at `https://your-unique-app-name.vercel.app`), you can make requests through it to your target server.

To make a request to a path like `/some/path/on/target` on your `TARGET_SERVER_URL`, you would use the following URL structure:

`https://your-unique-app-name.vercel.app/api/proxy/some/path/on/target`

**Examples:**

Let's assume your `TARGET_SERVER_URL` is set to `https://api.example.com` and your Vercel app URL is `https://my-proxy.vercel.app`.

1.  **GET Request:**
    To make a GET request to `https://api.example.com/users/123?active=true`:
    Use: `https://my-proxy.vercel.app/api/proxy/users/123?active=true`

2.  **POST Request:**
    To make a POST request to `https://api.example.com/orders` with a JSON body:
    Make a POST request to `https://my-proxy.vercel.app/api/proxy/orders` with your JSON body. The method, headers (most of them), and body will be forwarded.

The proxy route `src/app/api/proxy/[...slug]/route.ts` is configured to handle common HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) and forward them appropriately. The part of the path after `/api/proxy/` (the "slug") is appended to your `TARGET_SERVER_URL` to form the final destination URL.
```

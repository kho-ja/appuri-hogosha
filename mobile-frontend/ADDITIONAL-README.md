# 🧩 Fixing the “InternalBytecode.js” and “EXPERIENCE_NOT_FOUND” Errors in Expo

If your Expo or React Native project throws an error like:

```
Error: ENOENT: no such file or directory, open '.../InternalBytecode.js'
Error: EXPERIENCE_NOT_FOUND – Experience with id '<some-uuid>' does not exist
```

follow these steps to fix it.

---

## ⚙️ 1. Create a Missing File (`InternalBytecode.js`)

Some Metro builds reference a file called `InternalBytecode.js`.  
If it doesn’t exist, Metro fails with an **ENOENT** (“file not found”) error.

### Fix

Create a file in your project root:

```
your-project/
└── InternalBytecode.js
```

**Paste this content inside:**
```js
/**
 * Placeholder for missing InternalBytecode.js
 * ---------------------------------------------------------
 * This file is not part of the original Expo or Metro code.
 * It’s a temporary patch to prevent ENOENT (file not found)
 * errors while Metro or Expo rebuild their cache.
 *
 * If this error reappears, run:
 *   npx expo start -c
 * or reinstall node_modules.
 */

export default {};
```

Then restart your app:

```bash
npx expo start -c
```

---

## 📡 2. Fix the `EXPERIENCE_NOT_FOUND` (Expo Push Token / EAS Project ID)

If you also see:

```
Error encountered while fetching Expo token,
expected an OK response, received: 400
{"code":"EXPERIENCE_NOT_FOUND","message":"Experience with id ... does not exist"}
```

That means your `app.config.js` or `app.json` file is missing the **EAS Project ID**.

### Fix

1. Open your Expo project dashboard at [https://expo.dev](https://expo.dev)
2. Copy your **Project ID** (under **EAS Project Settings**)
3. Open your `app.config.js` (or `app.json`)
4. Add or update this section:

```js
extra: {
  eas: {
    // ✅ Replace the ID below with your real EAS Project ID
    projectId: process.env.EAS_PROJECT_ID || 'your-real-project-id-here'
  }
}
```

Example:
```js
extra: {
  eas: {
    projectId: process.env.EAS_PROJECT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxx' // ← your real EAS Project IDxxxxxxxxxxxx'
  }
}
```

---

## 🚀 3. Clean & Rebuild

After making the changes:

```bash
# Clear Expo + Metro cache
npx expo start -c
```

If you’re still getting token-related issues, reinstall dependencies:

```bash
rm -rf node_modules
npm install
```

---

## ✅ Summary

| Problem | Fix |
|----------|-----|
| `ENOENT: no such file or directory, open 'InternalBytecode.js'` | Create `InternalBytecode.js` with the placeholder code |
| `EXPERIENCE_NOT_FOUND` or Push Token error | Add your `projectId` (from Expo dashboard) into `app.config.js` |

---

## 💬 Tip for Newcomers

Keep your EAS Project ID in an `.env` file for CI/CD:

```
EAS_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxxxxx # ← your real EAS Project ID
```

And access it like this:
```js
projectId: process.env.EAS_PROJECT_ID || 'xxxxxxxxxxxxxxxxx' // ← your real EAS Project ID
```

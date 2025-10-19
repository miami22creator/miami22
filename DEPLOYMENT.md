# Deployment Guide for GitHub Pages

## Problem Solved

The site was appearing blank when accessing it via GitHub Pages (both with custom domain www.cars-miami.com and default GitHub URL). This was caused by React Router's BrowserRouter not being compatible with GitHub Pages static file serving.

## Solution Implemented

### 1. Client-Side Routing Support for GitHub Pages

Added two key files to enable React Router to work with GitHub Pages:

#### `public/404.html`
- Intercepts all 404 errors from GitHub Pages
- Redirects to index.html with the path encoded in the query string
- This allows React Router to handle the routing client-side

#### Updated `index.html`
- Added a script in the `<head>` section that decodes the redirected URL
- Uses `window.history.replaceState()` to restore the correct URL
- This happens before React loads, ensuring smooth navigation

### 2. GitHub Actions Workflow

Created `.github/workflows/deploy.yml` to automatically:
- Build the application using `npm run build`
- Deploy the `dist` folder to GitHub Pages
- Runs on every push to the `main` branch

## How to Deploy

### First Time Setup

1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Select "GitHub Actions"
   - The custom domain (www.cars-miami.com) is already configured via the CNAME file

2. **Merge this PR**:
   - Once this PR is merged to `main`, the GitHub Action will automatically deploy the site

### Future Deployments

Simply push to the `main` branch and the GitHub Action will automatically rebuild and deploy the site.

## Technical Details

### Why This Solution Works

1. **404.html**: When someone visits `www.cars-miami.com/auth`, GitHub Pages doesn't find that file and serves 404.html
2. **Redirect Script**: The 404.html script converts the URL to `www.cars-miami.com/?/auth`
3. **Index.html Script**: When index.html loads, it reads the `?/auth` from the query string and uses `replaceState` to change it back to `/auth`
4. **React Router**: React Router now sees the correct path and renders the appropriate component

### Files Modified

- `index.html` - Added redirect handling script
- `public/404.html` - Created 404 fallback page
- `.github/workflows/deploy.yml` - Created automated deployment workflow

### Build Command

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

## Testing Locally

To test the production build locally:

```bash
npm run build
npm run preview
```

Then visit http://localhost:4173

## Troubleshooting

If the site is still blank after deployment:

1. Check GitHub Actions tab to ensure deployment succeeded
2. Verify DNS is pointing to GitHub Pages (already configured)
3. Clear browser cache and try in incognito mode
4. Check browser console for any errors

## References

- [spa-github-pages](https://github.com/rafgraph/spa-github-pages) - The solution we implemented
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#github-pages)

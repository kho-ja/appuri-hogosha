# shadcn/ui Component Formatting Guide

This project uses ESLint and Prettier to ensure consistent code formatting across all components, including shadcn/ui components.

## Automatic Formatting for shadcn Components

### When adding new shadcn components:

1. **Add the component normally:**
   ```bash
   npx shadcn@latest add [component-name]
   ```

2. **Automatically format the new component:**
   ```bash
   npm run format:ui
   ```

3. **Check formatting before committing:**
   ```bash
   npm run check:ui
   ```

### Quick Scripts Available:

- `npm run format:ui` - Format all UI components and fix ESLint issues
- `npm run check:ui` - Check if UI components are properly formatted
- `npm run format` - Format entire project
- `npm run lint:fix` - Fix all auto-fixable ESLint issues

## shadcn Component Standards

Our ESLint configuration includes special rules for `components/ui/*.tsx` files to ensure:

- ✅ Consistent import styles (`type` imports where appropriate)
- ✅ Required `displayName` for all React components
- ✅ Proper TypeScript practices
- ✅ Consistent Prettier formatting

## Example Workflow

```bash
# Add a new shadcn component
npx shadcn@latest add avatar

# Format and lint the new component
npm run format:ui

# Verify everything looks good
npm run check:ui

# Commit your changes
git add .
git commit -m "Add avatar component"
```

## Prettier Configuration

Our Prettier config is optimized for shadcn components:
- Semi-colons: `true`
- Double quotes: `true` 
- Trailing commas: `es5`
- Print width: `80`
- Tab width: `2`

This ensures all shadcn components maintain consistent formatting with the rest of the codebase.
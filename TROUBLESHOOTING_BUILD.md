# Build Issues Troubleshooting

## ETIMEDOUT: connection timed out, mkdir errors

### Problem
Next.js build process fails with `ETIMEDOUT` errors when trying to create directories in `.next/server/`.

### Common Causes
1. **Corrupt build cache** - The `.next` directory has corrupted files
2. **File system permissions** - Insufficient permissions to write to the project directory
3. **Disk space** - Not enough available disk space
4. **Port conflicts** - Another process using the same port
5. **File system locks** - Files being held by other processes

### Solutions

#### 1. Clear Build Cache
```bash
# Stop any running Next.js processes
pkill -f "next dev"

# Remove the .next directory
rm -rf .next

# If permission denied, try:
chmod -R 755 .next && rm -rf .next

# Clear npm cache
npm cache clean --force
```

#### 2. Check Disk Space
```bash
# Check available disk space
df -h .

# Should have at least 1-2GB free for Next.js builds
```

#### 3. Check File Permissions
```bash
# Check current directory permissions
ls -la

# Fix permissions if needed
chmod 755 .
```

#### 4. Use Different Port
```bash
# Start on different port to avoid conflicts
PORT=3002 npm run dev
```

#### 5. Clean Install (if needed)
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Prevention

### Regular Maintenance
- Clear `.next` cache regularly during development
- Monitor disk space
- Don't interrupt build processes abruptly

### Environment Setup
```bash
# Add to your .zshrc or .bashrc for easy cleanup
alias nextclean="rm -rf .next && npm cache clean --force"
```

## Current Solution Applied

✅ **Fixed by**:
1. Killing any running Next.js processes
2. Removing corrupted `.next` directory
3. Starting dev server on port 3002
4. Server now running successfully at http://localhost:3002

## Alternative Development Commands

```bash
# Development
PORT=3002 npm run dev

# Build
npm run build

# Production
npm start

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## If Problems Persist

1. **Restart your terminal/IDE**
2. **Reboot your system** (for file system issues)
3. **Check for antivirus interference**
4. **Use a different terminal** (VS Code terminal vs system terminal)
5. **Try running from a different directory location**

## Environment Notes

- **Current working directory**: `/Users/justin/Desktop/Test`
- **Available disk space**: 71GB (sufficient)
- **Node.js version**: Check with `node --version`
- **npm version**: Check with `npm --version`

Your application is now running successfully on **http://localhost:3002** 🚀
#!/bin/bash

# =============================================
# PRODUCTION SETUP SCRIPT
# WhatsApp Dashboard - First Customer Setup
# =============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# =============================================
# 1. PRE-FLIGHT CHECKS
# =============================================

print_header "Pre-Flight Checks"

# Check Node.js version
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher (current: $(node -v))"
    exit 1
fi
print_success "Node.js version: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm version: $(npm -v)"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    print_error ".env.local file not found"
    print_info "Please copy .env.example to .env.local and configure it"
    exit 1
fi
print_success ".env.local exists"

# =============================================
# 2. ENVIRONMENT VARIABLE VALIDATION
# =============================================

print_header "Environment Variables Validation"

# Function to check env var
check_env_var() {
    local var_name=$1
    local var_value=$(grep "^${var_name}=" .env.local | cut -d'=' -f2)

    if [ -z "$var_value" ]; then
        print_error "$var_name is not set"
        return 1
    fi

    # Check for placeholder values
    if [[ "$var_value" == "your_"* ]] || [[ "$var_value" == "price_1234"* ]]; then
        print_warning "$var_name has placeholder value: $var_value"
        return 1
    fi

    print_success "$var_name is configured"
    return 0
}

# Critical variables
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "STRIPE_SECRET_KEY"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "NEXTAUTH_SECRET"
    "WAHA_API_URL"
)

VALIDATION_FAILED=0

for var in "${REQUIRED_VARS[@]}"; do
    if ! check_env_var "$var"; then
        VALIDATION_FAILED=1
    fi
done

# Check for test keys (CRITICAL!)
print_info "Checking for test/development keys..."

if grep -q "sk_test_" .env.local; then
    print_error "STRIPE_SECRET_KEY is a TEST key! Production requires sk_live_ key"
    VALIDATION_FAILED=1
fi

if grep -q "pk_test_" .env.local; then
    print_error "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a TEST key! Production requires pk_live_ key"
    VALIDATION_FAILED=1
fi

# Check NEXTAUTH_SECRET strength
NEXTAUTH_SECRET=$(grep "^NEXTAUTH_SECRET=" .env.local | cut -d'=' -f2)
if [ ${#NEXTAUTH_SECRET} -lt 32 ]; then
    print_warning "NEXTAUTH_SECRET should be at least 32 characters long"
    print_info "Generate a new one with: openssl rand -base64 32"
    VALIDATION_FAILED=1
fi

if [ $VALIDATION_FAILED -eq 1 ]; then
    print_error "Environment validation failed. Please fix the issues above."
    exit 1
fi

print_success "All environment variables are properly configured"

# =============================================
# 3. DEPENDENCIES CHECK
# =============================================

print_header "Dependencies Check"

if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
else
    print_success "node_modules exists"
    print_info "Checking for updates..."
    npm outdated || true
fi

print_success "Dependencies are ready"

# =============================================
# 4. BUILD TEST
# =============================================

print_header "Production Build Test"

print_info "Running production build..."
print_info "This may take a few minutes..."

if npm run build; then
    print_success "Production build successful!"
else
    print_error "Production build failed"
    print_info "Check the error messages above and fix any issues"
    exit 1
fi

# =============================================
# 5. SECURITY CHECKS
# =============================================

print_header "Security Audit"

# Check for exposed secrets in code
print_info "Scanning for exposed secrets..."

if grep -r "sk_live_\|pk_live_\|whsec_" --exclude-dir=node_modules --exclude-dir=.next --exclude="*.md" .; then
    print_error "Found exposed Stripe secrets in code!"
    print_info "Secrets should only be in .env.local, never in code"
    VALIDATION_FAILED=1
fi

# Check .gitignore
if ! grep -q ".env.local" .gitignore; then
    print_warning ".env.local is not in .gitignore!"
    print_info "Adding .env.local to .gitignore..."
    echo ".env.local" >> .gitignore
fi
print_success ".env.local is in .gitignore"

# Check for node_modules in git
if git check-ignore node_modules > /dev/null 2>&1 || ! git ls-files --error-unmatch node_modules > /dev/null 2>&1; then
    print_success "node_modules is properly ignored"
else
    print_warning "node_modules might be tracked by git"
fi

# Security audit
print_info "Running npm security audit..."
if npm audit --audit-level=high; then
    print_success "No high-severity vulnerabilities found"
else
    print_warning "Security vulnerabilities detected"
    print_info "Run 'npm audit fix' to fix them"
fi

# =============================================
# 6. DEPLOYMENT READINESS
# =============================================

print_header "Deployment Readiness Check"

# Check if Vercel CLI is installed
if command -v vercel &> /dev/null; then
    print_success "Vercel CLI is installed"
    print_info "You can deploy with: vercel --prod"
else
    print_info "Vercel CLI not found. Install with: npm i -g vercel"
fi

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    print_success "Railway CLI is installed"
else
    print_info "Railway CLI not found. Install with: npm i -g @railway/cli"
fi

# =============================================
# 7. FINAL CHECKLIST
# =============================================

print_header "Production Checklist"

echo "Please verify the following before deploying:"
echo ""
echo "[ ] Stripe is in LIVE mode (not test mode)"
echo "[ ] Stripe webhook is configured for production URL"
echo "[ ] Stripe products and prices are created"
echo "[ ] Supabase RLS policies are active"
echo "[ ] Supabase backups are enabled"
echo "[ ] WAHA webhook URL points to production"
echo "[ ] Custom domain is configured"
echo "[ ] SSL/HTTPS is enabled"
echo "[ ] Error monitoring is set up (Sentry)"
echo "[ ] Email service is configured (for invites)"
echo ""

# =============================================
# 8. DEPLOYMENT OPTIONS
# =============================================

print_header "Deployment Options"

echo "Choose your deployment platform:"
echo ""
echo "1. Vercel (Recommended for Next.js)"
echo "   - Automatic optimizations"
echo "   - Edge functions"
echo "   - Easy GitHub integration"
echo "   Command: vercel --prod"
echo ""
echo "2. Railway"
echo "   - Simple deployment"
echo "   - Integrated services"
echo "   - Already running WAHA"
echo "   Command: railway up"
echo ""
echo "3. Docker (Self-hosted)"
echo "   - Full control"
echo "   - Custom infrastructure"
echo "   Command: docker build -t whatsapp-dashboard ."
echo ""

# =============================================
# 9. POST-DEPLOYMENT TESTS
# =============================================

print_header "Post-Deployment Tests"

echo "After deployment, test the following:"
echo ""
echo "✓ User Registration & Login"
echo "✓ WhatsApp QR Code Display"
echo "✓ WhatsApp Session Creation"
echo "✓ Send Test Message"
echo "✓ Stripe Checkout Flow"
echo "✓ Stripe Webhook Reception"
echo "✓ Dashboard Analytics Display"
echo "✓ Team Invitation Flow"
echo ""

# =============================================
# 10. SUMMARY
# =============================================

print_header "Setup Summary"

print_success "Pre-flight checks passed"
print_success "Environment variables validated"
print_success "Dependencies installed"
print_success "Production build successful"
print_success "Security checks completed"

echo ""
print_info "Your WhatsApp Dashboard is ready for production deployment!"
echo ""
print_info "Next steps:"
echo "1. Review the checklist above"
echo "2. Configure Stripe Live Mode"
echo "3. Set up production domain"
echo "4. Deploy using your chosen platform"
echo "5. Run post-deployment tests"
echo ""
print_info "Documentation:"
echo "- Production Guide: PRODUCTION_DEPLOYMENT.md"
echo "- Security Audit: SECURITY_AUDIT.md"
echo "- Project Overview: .claude/PROJECT.md"
echo ""

# Generate deployment command
print_header "Quick Deploy Commands"

echo "# For Vercel:"
echo "vercel --prod"
echo ""
echo "# For Railway:"
echo "railway up"
echo ""
echo "# For Docker:"
echo "docker build -t whatsapp-dashboard . && docker run -p 3000:3000 --env-file .env.local whatsapp-dashboard"
echo ""

print_success "Setup complete! 🚀"

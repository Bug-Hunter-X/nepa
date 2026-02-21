# Create Pull Request Script

## Prerequisites
Make sure you have:
1. Proper Git permissions for the nathydre21/nepa repository
2. GitHub CLI installed (`gh`) or access to create PR via web interface

## Step 1: Push the Branch (with proper permissions)

```bash
# Navigate to the repository
cd C:\Users\USER\CascadeProjects\nepa

# Push the feature branch
git push -u origin feature/oracle-integration
```

## Step 2: Create Pull Request

### Option A: Using GitHub CLI (Recommended)

```bash
# Create PR with detailed description
gh pr create --title "feat: implement Chainlink oracle integration for external data" --body-file PULL_REQUEST_DESCRIPTION.md --base main --head feature/oracle-integration

# Or create PR interactively
gh pr create --base main --head feature/oracle-integration
```

### Option B: Using GitHub Web Interface

1. Go to: https://github.com/nathydre21/nepa
2. Click on "Pull requests" tab
3. Click "New pull request"
4. Select base: `main` ← compare: `feature/oracle-integration`
5. Click "Create pull request"
6. Copy the content from `PULL_REQUEST_DESCRIPTION.md` into the PR description
7. Add title: "feat: implement Chainlink oracle integration for external data"
8. Click "Create pull request"

## Step 3: Link to Issue

The PR description already includes `Closes #22` which will automatically close issue #22 when the PR is merged.

## Step 4: Request Review

After creating the PR, request a review from the repository maintainers.

## Alternative: Manual Git Commands

If GitHub CLI is not available, you can use these manual commands:

```bash
# Ensure you're on the correct branch
git checkout feature/oracle-integration

# Push to remote (requires proper permissions)
git push origin feature/oracle-integration

# Check status
git status
git log --oneline -5
```

## Troubleshooting

### Permission Denied Error
If you get a permission error:
1. Ensure you're logged into GitHub with correct account
2. Check if you have push permissions to the repository
3. Contact repository owner for access

### Branch Already Exists
If the branch already exists remotely:
```bash
# Force push (use with caution)
git push -f origin feature/oracle-integration
```

### GitHub CLI Not Installed
Install GitHub CLI:
```bash
# Windows (using winget)
winget install GitHub.cli

# Or download from: https://cli.github.com/
```

## Verification

After creating the PR, verify:
1. ✅ All files are included in the PR
2. ✅ Tests are passing (if CI is configured)
3. ✅ PR description is complete
4. ✅ Issue #22 is referenced
5. ✅ Reviewers are assigned

## Current Status

- ✅ Code committed locally
- ✅ Branch created: `feature/oracle-integration`
- ✅ PR description prepared
- ⏳ Waiting for push permissions to create PR

## Files Included in PR

- `nepa-dapp/nepa_contract/src/oracle.rs` - Oracle manager implementation
- `nepa-dapp/nepa_contract/src/lib.rs` - Enhanced billing contract
- `nepa-dapp/nepa_contract/src/tests.rs` - Comprehensive test suite
- `nepa-dapp/nepa_contract/Cargo.toml` - Updated dependencies
- `ORACLE_INTEGRATION_DOCUMENTATION.md` - Technical documentation
- `BUILD_INSTRUCTIONS.md` - Build and deployment guide
- `PULL_REQUEST_DESCRIPTION.md` - PR description content

Once you have the proper permissions, follow the steps above to complete the PR creation process.

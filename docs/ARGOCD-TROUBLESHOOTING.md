# ArgoCD Image Pull Troubleshooting

## Issue: ImagePullBackOff with GHCR Images

### Quick Fix Steps

#### 1. Force ArgoCD to Refresh
```bash
# Refresh ArgoCD to detect Git changes
argocd app refresh ecommerce-dev

# Hard refresh (clears cache)
argocd app refresh ecommerce-dev --hard

# Force sync
argocd app sync ecommerce-dev --force
```

#### 2. Check Image Accessibility

**Verify images exist:**
```bash
# Check if images are public
docker pull ghcr.io/irfadkp/argo-app/backend:v1.0.14
docker pull ghcr.io/irfadkp/argo-app/frontend:v1.0.14
```

If pull fails, the images might be private.

#### 3. Make Images Public (Recommended)

Go to GitHub:
1. Navigate to: https://github.com/irfadkp?tab=packages
2. Click on `argo-app/backend` package
3. Click **Package settings** (right side)
4. Scroll to **Danger Zone**
5. Click **Change visibility** → **Public**
6. Repeat for `argo-app/frontend` package

#### 4. Or Create Image Pull Secret (Alternative)

If you want to keep images private:

```bash
# Create GitHub Personal Access Token (PAT)
# Go to: https://github.com/settings/tokens
# Generate new token with 'read:packages' scope

# Create secret in Kubernetes
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=irfadkp \
  --docker-password=YOUR_GITHUB_TOKEN \
  --docker-email=your-email@example.com \
  -n ecommerce-dev

# Verify secret
kubectl get secret ghcr-secret -n ecommerce-dev
```

Then update deployments to use the secret:

**For Backend (Rollout):**
```bash
kubectl patch rollout backend -n ecommerce-dev --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/imagePullSecrets",
    "value": [{"name": "ghcr-secret"}]
  }
]'
```

**For Frontend (Deployment):**
```bash
kubectl patch deployment frontend -n ecommerce-dev --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/imagePullSecrets",
    "value": [{"name": "ghcr-secret"}]
  }
]'
```

#### 5. Check ArgoCD Sync Status

```bash
# Get application status
argocd app get ecommerce-dev

# Check if it's synced
argocd app list | grep ecommerce-dev

# View sync history
argocd app history ecommerce-dev
```

#### 6. Check Pod Events

```bash
# Describe pod to see detailed error
kubectl describe pod -l app=backend -n ecommerce-dev

# Check events
kubectl get events -n ecommerce-dev --sort-by='.lastTimestamp' | grep -i pull
```

### Common Issues

#### Issue: "not found" error
**Cause:** Image doesn't exist or is private  
**Fix:** Make images public or create image pull secret

#### Issue: ArgoCD shows old image tag
**Cause:** ArgoCD hasn't refreshed from Git  
**Fix:** Run `argocd app refresh ecommerce-dev --hard`

#### Issue: "unauthorized" error
**Cause:** No credentials to pull private image  
**Fix:** Create image pull secret (see step 4)

#### Issue: ArgoCD not syncing
**Cause:** Auto-sync might be disabled or Git repo not accessible  
**Fix:** 
```bash
# Enable auto-sync
argocd app set ecommerce-dev --sync-policy automated

# Or manual sync
argocd app sync ecommerce-dev
```

### Verify Everything Works

```bash
# 1. Check ArgoCD shows correct image tags
argocd app get ecommerce-dev | grep -A 5 "Images:"

# 2. Check pods are running
kubectl get pods -n ecommerce-dev

# 3. Check actual image being used
kubectl get pods -n ecommerce-dev -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'

# 4. Check pod logs
kubectl logs -l app=backend -n ecommerce-dev --tail=50
kubectl logs -l app=frontend -n ecommerce-dev --tail=50
```

### Expected Output

After fixes, you should see:

```bash
$ kubectl get pods -n ecommerce-dev
NAME                        READY   STATUS    RESTARTS   AGE
backend-xxx                 1/1     Running   0          2m
frontend-xxx                1/1     Running   0          2m
postgres-0                  1/1     Running   0          5m

$ kubectl get pods -n ecommerce-dev -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}'
ghcr.io/irfadkp/argo-app/backend:v1.0.14
ghcr.io/irfadkp/argo-app/frontend:v1.0.14
postgres:15-alpine
```

### Still Having Issues?

1. **Check GitHub Actions logs:**
   - https://github.com/irfadkp/argo-app/actions
   - Verify images were actually pushed

2. **Check GHCR packages:**
   - https://github.com/irfadkp?tab=packages
   - Verify packages exist and are accessible

3. **Check ArgoCD logs:**
   ```bash
   kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
   ```

4. **Re-deploy from scratch:**
   ```bash
   # Delete application
   argocd app delete ecommerce-dev
   
   # Re-create
   kubectl apply -f gitops/argocd/application.yaml
   ```

---

**Made with Bob** 🤖
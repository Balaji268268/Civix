import os
import re

# ----------------- CONFIGURATION -----------------
SRC_DIR = "src"
BACKEND_DIR = "backend"
SAFE_EXTENSIONS = {".jsx", ".js", ".tsx", ".ts"}

# ----------------- PATTERNS -----------------
# 1. Missing Imports (Expanded)
COMMON_COMPONENTS = [
    "Link", "NavLink", "Navigate", "useNavigate", "useLocation", "useParams", "Outlet", "Routes", "Route", # Router
    "UserButton", "SignIn", "SignUp", "SignInButton", "SignUpButton", "useUser", "useAuth", "ClerkLoaded", "ClerkLoading", # Clerk
    "motion", "AnimatePresence", # Framer
    "ToastContainer", "toast", # Toastify
    "Helmet", "Loader2", "Lucide", # Icons/Utils
    "useState", "useEffect", "useRef", "useCallback", "useMemo" # React
]

# 2. Mixed Config (Vite vs CRA)
ENV_VARS_VITE_REGEX = r"import\.meta\.env"
ENV_VARS_CRA_REGEX = r"process\.env\.REACT_APP_"

# 3. Backend Security
BACKEND_ROUTE_REGEX = r"router\.(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]"
AUTH_MIDDLEWARE_REGEX = r"(verifyToken|requireAuth|checkAuth|isAdmin|isModerator|clerkMiddleware)"

def get_file_content(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except:
        return ""

def scan_missing_imports(content, file_path):
    issues = []
    for item in COMMON_COMPONENTS:
        # Avoid matching substring (e.g. "Link" in "NavLink" or "Linked")
        used_pattern = r'\b' + re.escape(item) + r'\b'
        
        # Ignored usage contexts:
        # - Comments (// ...) -> Hard to filter perfectly with regex, but we assume code is cleanish
        # - Variable definitions (const Link = ...)
        
        if re.search(used_pattern, content):
            # Check if imported OR defined
            is_imported = False
            is_defined = False
            
            for line in content.splitlines():
                if f"import" in line and item in line and "//" not in line:
                    is_imported = True
                    break
                if re.search(r'\b(const|let|var|function|class)\s+' + re.escape(item) + r'\b', line):
                     is_defined = True 
                     break
            
            if not is_imported and not is_defined:
                issues.append(f"Missing import for: {item}")
    return issues

def scan_env_conflicts(content, file_path):
    issues = []
    # If Vite project
    if "process.env" in content:
        issues.append("Legacy 'process.env' usage detected (Use 'import.meta.env')")
    if "require(" in content:
        issues.append("CommonJS 'require()' usage detected (Use ES 'import')")
    return issues

def scan_backend_security(content):
    issues = []
    # Naive check: does the file define routes but usually lacks 'verifyToken'?
    # Ideally we parse line by line.
    
    lines = content.splitlines()
    for i, line in enumerate(lines):
        match = re.search(BACKEND_ROUTE_REGEX, line)
        if match:
            method, route = match.groups()
            # Check if middleware is present in this line or nearby
            if not re.search(AUTH_MIDDLEWARE_REGEX, line):
                # Exceptions (Login/Signup/Public)
                if any(x in route for x in ["login", "signup", "register", "public", "webhook"]):
                    continue
                issues.append(f"Potential Unprotected Route: {method.upper()} {route}")
    return issues

def main():
    print("--- 🕵️‍♂️ Senior Tester Audit Running ---")
    
    all_issues = []
    
    # SCAN FRONTEND
    start_dir = os.path.join(os.getcwd(), SRC_DIR)
    for root, dirs, files in os.walk(start_dir):
        if "node_modules" in root: continue
        for file in files:
            if any(file.endswith(ext) for ext in SAFE_EXTENSIONS):
                path = os.path.join(root, file)
                rel_path = os.path.relpath(path, os.getcwd())
                content = get_file_content(path)
                
                # Check 1: Imports
                missing = scan_missing_imports(content, path)
                for m in missing:
                    all_issues.append(f"[FRONTEND] {rel_path}: {m}")
                
                # Check 2: Env Vars
                envs = scan_env_conflicts(content, path)
                for e in envs:
                    all_issues.append(f"[CONFIG] {rel_path}: {e}")

    # SCAN BACKEND
    backend_dir = os.path.join(os.getcwd(), BACKEND_DIR)
    for root, dirs, files in os.walk(backend_dir):
        if "node_modules" in root: continue
        for file in files:
            if file.endswith(".js"):
                path = os.path.join(root, file)
                rel_path = os.path.relpath(path, os.getcwd())
                content = get_file_content(path)
                
                # Check 3: Security
                if "routes" in rel_path:
                    sec_issues = scan_backend_security(content)
                    for s in sec_issues:
                        all_issues.append(f"[BACKEND-SEC] {rel_path}: {s}")

    # REPORT
    print(f"\nTotal Issues Found: {len(all_issues)}")
    with open("qa_audit_report.txt", "w", encoding="utf-8") as f:
        for i, issue in enumerate(all_issues):
            f.write(f"{i+1}. {issue}\n")
            print(f"{i+1}. {issue}")

if __name__ == "__main__":
    main()

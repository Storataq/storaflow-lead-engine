# Email Deployment Checklist

1. Review code / readiness report  
2. Backup database  
3. Execute `20260726000022_email_production_hardening.sql` manually  
4. Verify tables/policies exist  
5. Configure env (see `.env.example` Phase 21L)  
6. Configure Resend domain + API key  
7. Configure webhook secret + endpoint `POST /api/webhooks/email/resend`  
8. Configure tracking + preference base URLs (HTTPS in production)  
9. Configure `EMAIL_EXECUTION_INTERNAL_SECRET` + worker/scheduler cron  
10. Optional AI keys (keep auto actions false)  
11. Organization address / privacy URLs  
12. Deploy app  
13. Hit `/api/internal/health` with health secret  
14. Open `/email/operations`  
15. Run E2E harness + allowlisted test  
16. Enable provider dispatch deliberately  
17. Pilot with low daily/hourly limits  

Do **not** enable production sending automatically.

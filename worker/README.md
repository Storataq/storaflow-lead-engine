# Background worker placeholder
#
# In een latere fase draait hier een apart Node.js-proces dat:
# - queued scrape_jobs ophaalt
# - jobs claimt (claimed_at / claimed_by)
# - status naar running zet
# - voortgang en fouten opslaat
#
# Start (toekomstig): npm run worker

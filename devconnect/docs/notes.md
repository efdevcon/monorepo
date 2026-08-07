# devconnect website

Static website, nothing crazy

Schedule is from atprotocol served via server running on render - I would snapshot the current data and just load it as JSON, then delete the atprotocol ingestion side

Keep the website around for archival purposes if you want - or redirect traffic to Devcon.org

# perks

perks are powered by the "coupons" database in supabase, I would manually upload coupons there, tag them with an id (e.g. roamless-e-sim-2025), and then issue them to verified ticket holders on demand - most of the complexity is the different types of gating (zupass event gating, protocol guild) that were "bandaided" on top of the base use case, so its a little bit of an amalgam

if you do perks again, you can simplify a lot by removing zupass - we already have the "getPaidTicket" utility or whatever its called, so you can much more trivially gate and issue coupons there - I'd probably just use AI and rebuild it how you see fit to eliminate the tech debt of reusing it

coupons come from many sources and are applied differently depending on the perk offering, so that's one thing to be mindful of - e.g. general discount codes, one-time-use codes (issue on demand), and some are simply a url - the UX changes a bit depending on each of these

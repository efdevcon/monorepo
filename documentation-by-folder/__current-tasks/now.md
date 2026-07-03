# road to devcon

Basically ready to go, just add a link to the page in the main menu (and any other place on the website as needed)

Note: Resubmission to the form adds a warning that submissions will remove the event from the website until it is reapproved - on the backend it flips an extra column that reviewers have to be aware of (its described in the nocodb table itself as well, on the field)

# speakers visa attendee form

This is the extension to the visa form for attendees - it allows speakers who hold no ticket to apply regardless, by looking up pretalx and seeing if the signed in email is a confirmed speaker.

This needs to be swapped to the real pretalx instance once the CFP is live, its currently pointing at devcon-mumbai-playground

I think it's as simple as changing the url to the production event

# student applications

running already - Adam wants to whitelist some universities as he starts reviewing current submissions, so maybe sync with him on this

# waves

Need to update the waves to reflect whatever you do with ticketing - use mockNow query parameter to test various cases - e.g. https://devcon.org/en/?mockNow=may-20-16%3A00

waves are configured in waves.ts /monorepo/devcon/src/config/waves.ts

    openTimes: [new Date(Date.UTC(2026, 4, 20, 16, 0, 0))] <--- this is how you configure the countdown / live detection

    for the "generic opens in X" with no countdown, simply leave openTimes empty and add openLabel instead:

    openLabel: 'Opens June' (change this to July soon :D)

waves with an openTime (a countdown) _automatically_ flip to "live" the moment the time is reached and for 5 minutes ahead - this is to prevent the countdown being "stuck at 0" and nothing happening - the code assumes the wave is live for 5 minutes hardcoded, and then from there it listens to the quota availability dynamically

# AI

devcon-ai is the touchpoint for most things AI - its basically the server which enforces auth, exposes the chat api, session/speaker recommendations, etc. - also where avatar generation experiments happen

I'd drop all of this at this point since its very esoteric and complex - I wasn't even done refining it - I also think we lost our EF-inference point of contact in the layoffs, so yeah - you can try, but imo not worth it as it is not core to the experience

if you want to play with it, there's a debugging interface on event-app for the RAG side, link to the page is in the "debug" button

if you want to do AI chatbot anyway, you can also use openai - you can trivially implement the same thing by using their apis + attaching an openai hosted vector store - this is what we did at SEA - you'd be able to query over the content/sessions/speakers and they handle the complexity of RAG

# AV

see ./av/pretalx-pipeline

# PWA

see /documentation-by-folder/event-app docs

# perks

Scott has the context here on the submission side - the backend is messy from all the adjustments and extra requests we had to make to accomodate zupass gating etc. - if you're still doing perks, maybe start over or clean it up first (remove all the zupass bloat)

some perks i handled manually - roamless notably - if you want to do this again, Rose also has the connect (I'll be losing my email)

a little more context in the by /documentation-by-folder/devconnect docs

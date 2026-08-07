# devcon api

swagger powered express server running over static files (no longer a database since I removed that earlier in the year) - very simple actually

https://api.devcon.org/docs/ for overview

/events, /sessions, /speakers are used by archive and event-app

/dips endpoint is used by https://devcon.org/en/dips/

I have no context on the rss/podcast stuff, refer to Ligi for this, I believe he was closely involved

Possible there is a bunch of stale stuff in the api, but if you trace back from what is used per the /docs above, you can probably clean up quite a bit of stuff not related to these endpoints

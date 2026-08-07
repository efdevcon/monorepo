# ai-content-prep.yml

    Old webhook to ingest content for the Devcon SEA chatbot - I'd just delete this.

# devcon-archive.yml

    Just a type/lint check - can remove if you don't need this

# devcon-db-cleanup.yml

    Wesley made this so I never knew its purpose, pretty sure it doesn't matter since we are no longer using a database for the api - I'd just delete it

# devcon-translate.yml

    This is the translation action - it runs on any change in main/content/en and selectively translates any files that changed

# devcon.yml

    Just a type/lint check - can remove if you don't need this

# rag-sync.yml

    Runs against devcon-ai and our content folder, pulling all data into the supabase vector storage we use for RAG

    If you aren't doing self-hosted chatbot functionality (I recommend not given the complexity), just drop this

# run-of-show

    Generates google slides whenever sessions change - more a proof of concept than anything - if you want to test it, you probably have to rotate keys

    Lots of unaddressed concerns here - e.g. what happens if the slide users edit the slides and the schedule updates again? kind of rife for conflict where the sync could override custom changes / notes - so maybe best to make it "immutable" and just explain that to the AV team, but yeah, lean on James/Carlota for decisions on this

    Maybe you want to just start over looping in James and Carlota for their AV needs

# sync pretalx + sync pretalx mumbai

    This one is responsible for merging in changes in pretalx

    Whenever the pretalx schedule is published (note: changing a session is not enough, the schedule has to be republished) it fires a webhook that hits our api, the api then triggers these workflow manually depending on the metadata (which pretalx event changed) in the webhook call

    It's triggered by my personal access token, so you'll have to change this to another

    It currently points at a test pretalx instance called devcon-mumbai-playground - you may need to adjust the github action when moving to production

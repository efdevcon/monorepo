# devcon-ai

holds all the backend usage I was planning for this devcon mumbai - its hosted on render separate from the devcon-api

it has auth (supabase otp check) to prevent abuse

it has nothing used in production yet / its all experimentative, so you can choose to delete it and spin down the render server if you don't do AI

if you want to test the RAG search, you can run this locally along with event-app - the inference-debugger in the event-app has an interface to debug RAG / get insight into which content is surfaced by a given query

I'd just drop this for this edition, its too esoteric/complicated and will be a pain to debug/maintain as a singular dev with everything else that will be going on

Encrypted env keys to circumvent .env file size limit

Replace the placeholder values in .env.stores with your actual API keys

Re-run npx dotenvx encrypt -f .env.stores to re-encrypt with real values

Add .env.keys to your .gitignore (as suggested by dotenvx)

Set the DOTENV_PRIVATE_KEY_STORES environment variable in your deployment environment with the key from .env.keys

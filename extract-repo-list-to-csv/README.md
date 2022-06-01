# Extract Github Repository List to CSV File

The purpose of this script is to extract the github repository list so that we can use it to facilitate or managed our repositories. If you have included the access token, this script will help you extract private repo too.

# Get Started

1. Get your access token from Github. Follow this [link](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).
2. You'll need at least the following scope (`repo` and `gist`).
3. Run `npm install`.
4. Add environment variable `ACCESS_TOKEN` or create a `.env` to store the token.
5. Add environment variable `ORG_REPO_LIST` or create a `.env` to store the org of interest to extract the list.
6. `npm start`.


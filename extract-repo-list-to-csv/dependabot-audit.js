const { Octokit, App } = require("octokit");
const csvWriter = require('csv-writer');
const dotenv = require('dotenv');
dotenv.config();

const octokit = new Octokit({ auth: process.env.ACCESS_TOKEN });
const CSV_FILENAME = `dependabot-audit.csv`;

async function writeCsvFile(writeFilename, header, records) {
  const createCsvWriter = csvWriter.createObjectCsvWriter;
  const writer = createCsvWriter({
    header,
    path: writeFilename,
  });

  await writer.writeRecords(records);
}

async function getPaginatedData(url) {
  const nextPattern = /(?<=<)([\S]*)(?=>; rel="Next")/i;
  let pagesRemaining = true;
  let data = [];

  for (let i = 0; pagesRemaining; i++) {
    const response = await octokit.request(`GET ${url}`, {
      per_page: 100,
      state: 'open',
      headers: {
        "X-GitHub-Api-Version":
          "2022-11-28",
      },
    });

    // if (i == 0) {
    //   console.log(parseData(response.data)[0].security_vulnerability)
    //   console.log(parseData(response.data)[0].dependency)
    //   break;
    // }

    const parsedData = parseData(response.data)
    data = [...data, ...parsedData];

    const linkHeader = response.headers.link;
    console.log(i, 'linkHeader:', linkHeader)

    pagesRemaining = linkHeader && linkHeader.includes(`rel=\"next\"`);

    if (pagesRemaining) {
      url = linkHeader.match(nextPattern)[0];
    }
  }

  return data;
}

function parseData(data) {
  // If the data is an array, return that
  if (Array.isArray(data)) {
    return data
  }

  // Some endpoints respond with 204 No Content instead of empty array
  //   when there is no data. In that case, return an empty array.
  if (!data) {
    return []
  }

  // Otherwise, the array of items that we want is in an object
  // Delete keys that don't include the array of items
  delete data.incomplete_results;
  delete data.repository_selection;
  delete data.total_count;
  // Pull out the array of items
  const namespaceKey = Object.keys(data)[0];
  data = data[namespaceKey];

  return data;
}

(async function start() {
  const data = [];
  try {
    const alerts = await getPaginatedData('/orgs/servicerocket/dependabot/alerts');

    const data = alerts.map(o => ({
      number: o.number,
      repository: o.repository.full_name,
      scope: o.dependency.scope,
      cve_id: o.security_advisory.cve_id,
      severity: o.security_vulnerability.severity,
      summary: o.security_advisory.summary,
      // package: o.security_vulnerability.package,
      ecosystem: o.security_vulnerability.package.ecosystem,
      package: o.security_vulnerability.package.name,
      created_at: o.created_at,
      // security_vulnerability: o.security_vulnerability,
    }));

    const header = [
      "number",
      "repository",
      "scope",
      "cve_id",
      "severity",
      "summary",
      "ecosystem",
      "package",
    ];
    await writeCsvFile(CSV_FILENAME, header, data);
  } catch (error) {
    console.log(error);
  }
})();
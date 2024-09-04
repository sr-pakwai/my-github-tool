const axios = require('axios');
const csvWriter = require('csv-writer');
const dotenv = require('dotenv');
dotenv.config();

const CSV_FILENAME = `github-audit.csv`;
const TEAM_SLUG = [
  'learning-fabric',
  'jira',
  'confluence-server',
  'confluence-cloud',
  'scl',
  'data-intelligence',
  'sydney',
  'wolf',
];

async function request(path, params) {
  const url = 'https://api.github.com' + path;
  try {
    const response = await axios.get(url, {
      params,
      headers: { Authorization: `token ${process.env.ACCESS_TOKEN}` }
    });

    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function intersected(a1, a2) {
  return a1.filter(n => a2.indexOf(n) !== -1);
}

async function writeCsvFile(writeFilename, header, records) {
  const createCsvWriter = csvWriter.createObjectCsvWriter;
  const writer = createCsvWriter({
    header,
    path: writeFilename,
  });

  await writer.writeRecords(records);
}

(async function start() {
  const data = [];

  for (let j = 1; j < 10; j++) {
    // get the lists of repos
    const repos = await request('/orgs/servicerocket/repos', { per_page: 100, page: j });
    if (repos.length === 0)
      break;

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];

      if (repo.archived === true)
        continue;

      const teams = await request('/repos/' + repo.full_name + '/teams');
      const owners = intersected(TEAM_SLUG, teams.map(o => o.slug));
      console.log(`${i} ::: ${repo.full_name} ::: ${owners.join(',')}`);

      data.push({
        name: repo.name,
        visibility: repo.visibility,
        owner: owners.join('|'),
        description: repo.description,
      });
    }
  }

  const header = ['name', 'visibility', 'owner', 'description'];
  await writeCsvFile(CSV_FILENAME, header, data);
})();
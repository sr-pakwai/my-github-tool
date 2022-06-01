const axios = require('axios');
const csvWriter = require('csv-writer');

const ORG = process.env.ORG_REPO_LIST || 'servicerocket-labs';
const CSV_FILENAME = `github-repo-list (${ORG}).csv`;

async function writeCsvFile(writeFilename, header, records) {
  const createCsvWriter = csvWriter.createObjectCsvWriter;
  const writer = createCsvWriter({
    header,
    path: writeFilename,
  });

  await writer.writeRecords(records);
}

(async function start() {
  console.log('Github token:', process.env.ACCESS_TOKEN);

  const url = `https://api.github.com/orgs/${ORG}/repos`;
  const response = await axios.get(url, {
    params: { per_page: 100 },
    headers: { Authorization: `token ${process.env.ACCESS_TOKEN}` }
  });

  const header = ['visibility', 'name', 'description', 'html_url', 'created_at', 'updated_at', 'pushed_at'];
  const data = response.data.map(o => ({
    visibility: o.visibility,
    name: o.name,
    description: o.description,
    html_url: o.html_url,
    created_at: o.created_at,
    updated_at: o.updated_at,
    pushed_at: o.pushed_at,
  }));

  await writeCsvFile(CSV_FILENAME, header, data);
})();
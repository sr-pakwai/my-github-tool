const axios = require('axios');
const csvWriter = require('csv-writer');
const dotenv = require('dotenv');
dotenv.config();

const CSV_FILENAME = `github-repo-audit.csv`;
const GRAPHQL_URL = 'https://api.github.com/graphql';
const TEAM_SLUG = [
  'learning-fabric',
  'fusion',
  'moon',
  'sun',
  'sparta',
  'jira',
  'confluence-server',
  'confluence-cloud',
  'scl',
  'data-intelligence',
  'sydney',
  'wolf',
];

function queryBranchProtection(owner, name) {
  return `
  query {
    repository(name: "${name}", owner: "${owner}") {
      nameWithOwner
      defaultBranchRef {
        name
      }
      repositoryTopics(first: 10) {
        nodes {
          topic {
            name
          }
        }
      }
      branchProtectionRules(first: 10) {
        nodes {
          pattern
          bypassPullRequestAllowances(first: 10) {
            totalCount
          }
          bypassForcePushAllowances(first: 10) {
            totalCount
          }
          allowsDeletions
          allowsForcePushes
          blocksCreations
          isAdminEnforced
          repository {
            name
          }
          requiredApprovingReviewCount
          requiresCodeOwnerReviews
        }
      }
    }
  }`;
}

async function graphql(query) {
  try {
    const headers = {
      'content-type': 'application/json',
      'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
    };
    const response = await axios.post(GRAPHQL_URL, { query }, { headers });
    return response.data.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

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

async function writeCsvFile(writeFilename, header, records) {
  const createCsvWriter = csvWriter.createObjectCsvWriter;
  const writer = createCsvWriter({
    header,
    path: writeFilename,
  });

  await writer.writeRecords(records);
}

function intersected(a1, a2) {
  return a1.filter(n => a2.indexOf(n) !== -1);
}

(async function start() {
  const data = [];

  for (let j = 1; j < 10; j++) {
    // get the lists of repos
    const repos = await request('/orgs/servicerocket/repos', { per_page: 100, page: j });
    if (repos.length === 0)
      break;

    for (let i = 0; i < repos.length; i++) {
      console.log(`processing ${j}: ${i} of ${repos.length}...`);
      const repo = repos[i];

      if (repo.archived === true)
        continue;

      const res = await graphql(queryBranchProtection(repo.owner.login, repo.name));
      const repository = res.repository;
 
      const teams = await request('/repos/' + repo.full_name + '/teams');
      const owners = intersected(TEAM_SLUG, teams.map(o => o.slug));

      repository.branchProtectionRules.nodes.map(rule => {
        data.push({
          repository: repository.nameWithOwner,
          defaultBranch: repository.defaultBranchRef.name,
          pattern: rule.pattern,
          topics: repository.repositoryTopics.nodes.map(t => t.topic.name).join('|'),
          bypassPullRequestAllowances: rule.bypassPullRequestAllowances.totalCount,
          bypassForcePushAllowances: rule.bypassForcePushAllowances.totalCount,
          allowsDeletions: rule.allowsDeletions,
          allowsForcePushes: rule.allowsForcePushes,
          blocksCreations: rule.blocksCreations,
          isAdminEnforced: rule.isAdminEnforced,
          requiredApprovingReviewCount: rule.requiredApprovingReviewCount,
          requiresCodeOwnerReviews: rule.requiresCodeOwnerReviews,
          owner: owners.join('|'),
        })
      });
    }
  }

  const header = [
    "repository",
    "defaultBranch",
    "pattern",
    "topics",
    "bypassPullRequestAllowances",
    "bypassForcePushAllowances",
    "allowsDeletions",
    "allowsForcePushes",
    "blocksCreations",
    "isAdminEnforced",
    "requiredApprovingReviewCount",
    "requiresCodeOwnerReviews",
    "owner",
  ];
  await writeCsvFile(CSV_FILENAME, header, data);
})();
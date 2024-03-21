const fs = require('fs');
const csv = require('csv-parser');
const yaml = require('js-yaml');

const inputFile = 'input.csv';
const outputFile = 'output.yaml';

const data = {};
const orgs = [];

fs.createReadStream(inputFile)
  .pipe(csv({ start: 2 }))
  .on('data', (row) => {
    const { organization, team, member, surname ,email, role } = row;

    if (!data[organization]) {
      data[organization] = {
        name: organization,
        code: organization.replace(/ /g, '').toUpperCase(),
        teams: [],
      };
    }

    let orgIndex = orgs.findIndex((org) => org.name === organization);
    if (orgIndex === -1) {
      orgIndex = orgs.length;
      orgs.push({
        name: organization,
        teams: [],
      });
    }

    let teamIndex = orgs[orgIndex].teams.findIndex((t) => t.name === team);
    if (teamIndex === -1) {
      orgs[orgIndex].teams.push({
        name: team,
        'x-redmine-type': 'FunctionalUser',
        members: [],
      });
      teamIndex = orgs[orgIndex].teams.length - 1;
    }
    orgs[orgIndex].teams[teamIndex].members.push({
      name: member + ' ' + surname,
      email: email,
      roles: [{ name: role }],
    });
  })
  .on('end', () => {
    const yamlData = {
      context: { id: 1, version: 1, config: { 'service-chain-type': 'faceted' } },
      orgs,
      sla: [],
    };

    const yamlString = yaml.dump(yamlData, { lineWidth: -1 });

    fs.writeFileSync(outputFile, yamlString);
    console.log('YAML successfully created:', outputFile);
  })
  .on('error', (err) => {
    console.error('There was an error during the generation:', err.message);
  });

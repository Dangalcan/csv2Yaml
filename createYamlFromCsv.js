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
    const { organization, team, member, surname, email, role } = row;

    if (!data[organization]) {
      data[organization] = {
        name: organization,
        code: organization.replace(/ /g, '').toUpperCase(),
        teams: [],
        services: []
      };
    }

    let orgIndex = orgs.findIndex((org) => org.name === organization);
    if (orgIndex === -1) {
      orgIndex = orgs.length;
      orgs.push({
        name: organization,
        code: organization.replace(/ /g, '').toUpperCase(),
        teams: [],
        services: []
      });
    }

    let teamIndex = orgs[orgIndex].teams.findIndex((t) => t.name === team);
    if (teamIndex === -1) {
      orgs[orgIndex].teams.push({
        name: team,
        'x-itop-profiles': [
          { 'x-itop-profile': 'Configuration Manager' },
          { 'x-itop-profile': 'Service Desk Agent' },
          { 'x-itop-profile': 'Support Agent' },
          { 'x-itop-profile': 'Problem Manager' },
          { 'x-itop-profile': 'Service Manager' }
        ],
        members: [],
      });
      teamIndex = orgs[orgIndex].teams.length - 1;
    }

    orgs[orgIndex].teams[teamIndex].members.push({
      name: member + surname,
      user: member.toLowerCase().replace(/ /g, ''),
      email: email,
      external: true,
      roles: [{ name: role ? role : 'petclinic developer' }],
    });
  })
  .on('end', () => {
    // Add services and SLAs
    const slas = [];

    orgs.forEach((org) => {
      const orgName = org.name;
      const serviceName = `${orgName}-Petclinic`;
      const slaName = `${serviceName}Sla`;

      // Define the service
      const service = {
        name: serviceName,
        description: `Servicio de ${orgName}`,
        teams: org.teams.map((team) => ({ name: team.name })),
        customers: [
          {
            name: `${orgName}-client-gold`,
            sla: slaName
          },
          {
            name: `${orgName}-client-silver`,
            sla: slaName
          }
        ]
      };
      org.services.push(service);

      // Define the SLA
      slas.push({
        name: slaName,
        guarantees: [
          {
            scope: {
              'x-itop-priority': '*',
              'x-itop-request-type': '*'
            },
            objectives: {
              ttr: {
                max: {
                  value: 48,
                  unit: 'hours'
                }
              },
              tto: {
                max: {
                  value: 48,
                  unit: 'hours'
                }
              }
            }
          }
        ]
      });

      // Add consumers (new organizations with specific users)
      const consumers = [
        {
          name: `${orgName}-client-gold`,
          code: `${orgName.replace(/ /g, '').toUpperCase()}-GOLD`,
          teams: [
            {
              name: 'Gold clients team',
              'x-itop-profiles': [
                { 'x-itop-profile': 'Portal power user' },
                { 'x-itop-profile': 'Portal user' }
              ],
              members: [
                { name: `${orgName}-G1`, user: `${orgName}-G1`, email: `${orgName}g1@example.com`, roles: [{ name: 'itopGoldClientUser' }] },
                { name: `${orgName}-G2`, user: `${orgName}-G2`, email: `${orgName}g2@example.com`, roles: [{ name: 'itopGoldClientUser' }] },
                { name: `${orgName}-G3`, user: `${orgName}-G3`, email: `${orgName}g3@example.com`, roles: [{ name: 'itopGoldClientUser' }] }
              ]
            }
          ]
        },
        {
          name: `${orgName}-client-silver`,
          code: `${orgName.replace(/ /g, '').toUpperCase()}-SILVER`,
          teams: [
            {
              name: 'Silver clients Team',
              'x-itop-profiles': [
                { 'x-itop-profile': 'Portal power user' },
                { 'x-itop-profile': 'Portal user' }
              ],
              members: [
                { name: `${orgName}-S1`, user: `${orgName}-S1`, email: `${orgName}s1@example.com`, roles: [{ name: 'itopSilverClientUser' }] },
                { name: `${orgName}-S2`, user: `${orgName}-S2`, email: `${orgName}s2@example.com`, roles: [{ name: 'itopSilverClientUser' }] },
                { name: `${orgName}-S3`, user: `${orgName}-S3`, email: `${orgName}s3@example.com`, roles: [{ name: 'itopSilverClientUser' }] }
              ]
            }
          ]
        }
      ];
      orgs.push(...consumers);
    });

    const yamlData = {
      context: { id: 1, version: 1, config: { 'service-chain-type': 'faceted' }, 'chain-name': "PSG2 Petclinic model", description: "This is the service chain model from PSG2 subject" },
      orgs,
      sla: slas
    };

    const yamlString = yaml.dump(yamlData, { lineWidth: -1 });

    fs.writeFileSync(outputFile, yamlString);
    console.log('YAML successfully created:', outputFile);
  })
  .on('error', (err) => {
    console.error('There was an error during the generation:', err.message);
  });
